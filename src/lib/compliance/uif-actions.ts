"use server";

import { runAsTenant } from "@/lib/db-context";
import { requireTenant } from "@/lib/auth/require";

export interface UifDeclarationRow {
  idNumber: string;
  name: string;
  grossRemuneration: number;
  employeeContribution: number;
  employerContribution: number;
  totalContribution: number;
}

export interface UifDeclaration {
  period: string;
  rows: UifDeclarationRow[];
  totalEmployee: number;
  totalEmployer: number;
  total: number;
}

/**
 * Per-employee UIF contribution schedule for a period, for capture on uFiling.
 * The employer contribution mirrors the employee contribution (standard 1% + 1%
 * on remuneration up to the ceiling, already applied when the payslip was
 * generated). VERIFY the exact field layout against the current uFiling
 * electronic declaration spec before using this as an official submission file;
 * this is a capture aid, not the gazetted file format.
 */
export async function getUifDeclarationAction(
  tenantId: string,
  period: string
): Promise<UifDeclaration> {
  await requireTenant(tenantId, "hr");
  return runAsTenant(tenantId, async (tx) => {
    const run = await tx.payrollRun.findFirst({
      where: { tenantId, period, status: "completed" },
      orderBy: { processedOn: "desc" },
      select: { id: true },
    });
    if (!run) {
      return { period, rows: [], totalEmployee: 0, totalEmployer: 0, total: 0 };
    }

    const payslips = await tx.payslip.findMany({
      where: { runId: run.id, tenantId },
      select: {
        uif: true,
        grossPay: true,
        employee: { select: { idNumber: true, firstName: true, lastName: true } },
      },
    });

    const round2 = (v: number) => Math.round(v * 100) / 100;
    const rows: UifDeclarationRow[] = payslips
      .filter((p) => p.employee)
      .map((p) => ({
        idNumber: p.employee!.idNumber,
        name: `${p.employee!.firstName} ${p.employee!.lastName}`,
        grossRemuneration: round2(p.grossPay.toNumber()),
        employeeContribution: round2(p.uif.toNumber()),
        employerContribution: round2(p.uif.toNumber()),
        totalContribution: round2(p.uif.toNumber() * 2),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const totalEmployee = round2(rows.reduce((s, r) => s + r.employeeContribution, 0));
    const totalEmployer = round2(rows.reduce((s, r) => s + r.employerContribution, 0));
    return {
      period,
      rows,
      totalEmployee,
      totalEmployer,
      total: round2(totalEmployee + totalEmployer),
    };
  });
}
