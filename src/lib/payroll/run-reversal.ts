import type { Prisma } from "@prisma/client";

/**
 * Reverses the side-effects of completing a payroll run so it can be reopened
 * cleanly. Restores any recurring-deduction (loan/garnishee) instalments the run
 * applied — matching each payslip deduction line back to its EmployeeDeduction by
 * description, so statutory lines like PAYE/UIF (which have no matching record)
 * are skipped — voids any not-yet-sent bank export, then deletes the payslips
 * (their payroll items cascade).
 *
 * Callers MUST first block runs already exported to Netcash. Shared by cancel
 * and reject so re-completing a run never double-charges a loan or garnishee.
 *
 * Not a server action: it operates on a transaction client passed in, so it
 * lives outside the "use server" modules.
 */
export async function reverseRunCompletion(
  tx: Prisma.TransactionClient,
  runId: string,
  tenantId: string
): Promise<void> {
  const payslips = await tx.payslip.findMany({ where: { runId, tenantId } });
  if (payslips.length === 0) return;

  const employeeIds = [...new Set(payslips.map((p) => p.employeeId))];
  const deductions = await tx.employeeDeduction.findMany({
    where: { tenantId, employeeId: { in: employeeIds } },
  });
  const byKey = new Map(deductions.map((d) => [`${d.employeeId}::${d.description}`, d]));

  for (const p of payslips) {
    const lines = (p.deductions as unknown as { label: string; amount: number }[] | null) ?? [];
    for (const line of lines) {
      const d = byKey.get(`${p.employeeId}::${line.label}`);
      if (!d) continue; // statutory line or no matching recurring deduction
      await tx.employeeDeduction.update({
        where: { id: d.id },
        data: { balance: { increment: line.amount }, status: "active", settledAt: null },
      });
    }
  }

  await tx.bankExport.updateMany({
    where: { payrollRunId: runId, status: { in: ["pending", "approved"] } },
    data: { status: "cancelled", notes: "Payroll run reopened; export voided." },
  });

  await tx.payslip.deleteMany({ where: { runId, tenantId } });
}
