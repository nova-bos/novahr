"use server";

import { runAsTenant } from "@/lib/db-context";
import { requireRole } from "@/lib/auth/require";

export interface TerminationInput {
  employeeId: string;
  terminationDate: string;
  reason: "resignation" | "retrenchment" | "dismissal" | "retirement" | "contract_end" | "other";
  noticeDaysServed: number;
  finalPayDate: string;
  notes?: string;
}

export async function terminateEmployeeAction(
  input: TerminationInput
): Promise<{ success: boolean; error?: string }> {
  const session = await requireRole("hr");
  return runAsTenant(session.tenantId, async (tx) => {
    const employee = await tx.employee.findFirstOrThrow({
      where: { id: input.employeeId, tenantId: session.tenantId },
      include: { leaveBalances: true },
    });

    const dailyRate = employee.salaryAnnualGross.toNumber() / 261;
    const noticeDaysOwed = 14;
    const noticePay = Math.max(0, (noticeDaysOwed - input.noticeDaysServed) * dailyRate);
    const annualBalance = employee.leaveBalances.find((b) => b.type === "annual");
    const remainingAnnual = annualBalance ? annualBalance.total - annualBalance.used : 0;
    const leavePayout = remainingAnnual * dailyRate;

    // Set terminated status
    await tx.employee.update({
      where: { id: input.employeeId },
      data: { status: "terminated" },
    });

    // Deactivate payroll profile
    await tx.payrollProfile.updateMany({
      where: { employeeId: input.employeeId },
      data: { status: "inactive" },
    });

    // Write salary history record flagged as termination
    await tx.employeeSalaryHistory.create({
      data: {
        tenantId: session.tenantId,
        employeeId: input.employeeId,
        annualGross: employee.salaryAnnualGross,
        payFrequency: employee.salaryPayFrequency,
        travelAllowance: employee.salaryTravelAllowance,
        housingAllowance: employee.salaryHousingAllowance,
        medicalAid: employee.salaryMedicalAid,
        pensionContribPct: employee.salaryPensionContributionPct,
        effectiveDate: new Date(input.terminationDate),
        changedBy: session.id,
        changeReason: `Termination: ${input.reason.replace(/_/g, " ")}. Notice pay due: R${noticePay.toFixed(2)}. Leave payout: R${leavePayout.toFixed(2)}.${input.notes ? ` Notes: ${input.notes}` : ""}`,
      },
    });

    // Activity log
    await tx.activityItem.create({
      data: {
        tenantId: session.tenantId,
        type: "termination",
        message: `employment terminated (${input.reason.replace(/_/g, " ")})`,
        actor: `${employee.firstName} ${employee.lastName}`,
        employeeId: input.employeeId,
      },
    });

    // Notification
    await tx.notificationItem.create({
      data: {
        tenantId: session.tenantId,
        title: "Employee terminated",
        description: `${employee.firstName} ${employee.lastName} was terminated on ${input.terminationDate}.`,
        type: "warning",
      },
    });

    return { success: true };
  });
}
