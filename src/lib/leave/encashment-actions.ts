"use server";

import { runAsTenant } from "@/lib/db-context";
import { requireRole, requireActiveSubscription } from "@/lib/auth/require";
import { COMPONENT_BY_TYPE } from "@/lib/payroll/variable-pay";

export interface EncashmentResult {
  amount: number;
  days: number;
  runPeriod: string;
}

// Working days per year used to value a leave day (5 days x 52 weeks). This
// matches monthly / 21.67 and keeps encashment consistent with the unpaid-leave
// day value.
const WORKING_DAYS_PER_YEAR = 260;

/**
 * Pays out unused annual leave as a cash line on the current open pay run and
 * consumes those days from the employee's annual balance. HR only.
 */
export async function encashLeaveAction(input: {
  employeeId: string;
  days: number;
}): Promise<EncashmentResult> {
  const session = await requireRole("hr");
  await requireActiveSubscription(session.tenantId);
  const days = input.days;
  if (!(days > 0)) throw new Error("Enter a number of days greater than zero.");

  return runAsTenant(session.tenantId, async (tx) => {
    const employee = await tx.employee.findFirst({
      where: { id: input.employeeId, tenantId: session.tenantId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        branchId: true,
        salaryAnnualGross: true,
        status: true,
      },
    });
    if (!employee) throw new Error("Employee not found.");
    if (employee.status === "terminated") throw new Error("Employee is terminated.");

    const annual = await tx.leaveBalance.findUnique({
      where: { employeeId_type: { employeeId: input.employeeId, type: "annual" } },
    });
    const available = annual ? annual.total - annual.used : 0;
    if (days > available) {
      throw new Error(`Only ${available} annual leave day(s) available to encash.`);
    }

    // Eligible open runs: company-wide, or this employee's branch.
    const branchConditions = employee.branchId
      ? [{ branchId: null }, { branchId: employee.branchId }]
      : [{ branchId: null }];
    const run = await tx.payrollRun.findFirst({
      where: {
        tenantId: session.tenantId,
        status: { in: ["scheduled", "processing"] },
        OR: branchConditions,
      },
      orderBy: { payDate: "desc" },
      select: { id: true, period: true },
    });
    if (!run) throw new Error("Open a pay run first, then encash the leave into it.");

    const dailyRate = employee.salaryAnnualGross.toNumber() / WORKING_DAYS_PER_YEAR;
    const amount = Math.round(days * dailyRate * 100) / 100;
    if (!(amount > 0)) throw new Error("The computed encashment amount is zero.");

    const def = COMPONENT_BY_TYPE.get("leave_encashment")!;
    await tx.payrollInput.create({
      data: {
        tenantId: session.tenantId,
        payrollRunId: run.id,
        employeeId: input.employeeId,
        componentType: "leave_encashment",
        label: `Leave Encashment (${days} day${days === 1 ? "" : "s"})`,
        amount,
        taxTreatment: def.taxTreatment,
      },
    });

    await tx.leaveBalance.update({
      where: { employeeId_type: { employeeId: input.employeeId, type: "annual" } },
      data: { used: { increment: days } },
    });

    await tx.activityItem.create({
      data: {
        tenantId: session.tenantId,
        type: "payroll_run",
        message: `encashed ${days} leave day(s) for ${employee.firstName} ${employee.lastName}`,
        actor: session.name,
        employeeId: input.employeeId,
      },
    });

    return { amount, days, runPeriod: run.period };
  });
}
