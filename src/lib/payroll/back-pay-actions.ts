"use server";

import { runAsTenant } from "@/lib/db-context";
import { requireRole, requireActiveSubscription } from "@/lib/auth/require";
import { COMPONENT_BY_TYPE } from "./variable-pay";

export interface BackPayResult {
  amount: number;
  runPeriod: string;
}

/**
 * Adds a retroactive / back-dated pay adjustment (arrears) to the current open
 * pay run as a "Back Pay" line, taxed via the SARS non-recurring annual-payment
 * method. HR only. The amount is computed by the caller (e.g. monthly shortfall
 * x months) and passed in.
 */
export async function addBackPayAction(input: {
  employeeId: string;
  amount: number;
  note?: string;
}): Promise<BackPayResult> {
  const session = await requireRole("hr");
  await requireActiveSubscription(session.tenantId);
  const amount = Math.round(input.amount * 100) / 100;
  if (!(amount > 0)) throw new Error("The back-pay amount must be greater than zero.");

  return runAsTenant(session.tenantId, async (tx) => {
    const employee = await tx.employee.findFirst({
      where: { id: input.employeeId, tenantId: session.tenantId },
      select: { id: true, firstName: true, lastName: true, branchId: true, status: true },
    });
    if (!employee) throw new Error("Employee not found.");
    if (employee.status === "terminated") throw new Error("Employee is terminated.");

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
    if (!run) throw new Error("Open a pay run first, then add the back pay to it.");

    const def = COMPONENT_BY_TYPE.get("back_pay")!;
    const label = input.note?.trim() ? `Back Pay: ${input.note.trim()}` : "Back Pay (Arrears)";
    await tx.payrollInput.create({
      data: {
        tenantId: session.tenantId,
        payrollRunId: run.id,
        employeeId: input.employeeId,
        componentType: "back_pay",
        label,
        amount,
        taxTreatment: def.taxTreatment,
      },
    });

    await tx.activityItem.create({
      data: {
        tenantId: session.tenantId,
        type: "payroll_run",
        message: `added back pay of ${amount.toFixed(2)} for ${employee.firstName} ${employee.lastName}`,
        actor: session.name,
        employeeId: input.employeeId,
      },
    });

    return { amount, runPeriod: run.period };
  });
}
