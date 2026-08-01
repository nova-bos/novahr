"use server";

import { runAsTenant } from "@/lib/db-context";
import { requireTenant } from "@/lib/auth/require";
import { taxYearPeriods } from "./irp5";
import { buildCoidaReturn, type CoidaEmployeeEarnings, type CoidaReturn } from "./coida";

export type { CoidaReturn, CoidaEmployeeRow } from "./coida";

/**
 * Builds the COIDA Return of Earnings for a tax year (e.g. "2024/2025"),
 * aggregating each employee's total remuneration from payslips and capping it
 * at the year's assessable-earnings ceiling.
 */
export async function getCoidaReturnAction(
  tenantId: string,
  taxYear: string
): Promise<CoidaReturn> {
  await requireTenant(tenantId, "hr");
  const periods = taxYearPeriods(taxYear);

  return runAsTenant(tenantId, async (tx) => {
    const payslips = await tx.payslip.findMany({
      where: { tenantId, period: { in: periods } },
      select: {
        employeeId: true,
        period: true,
        basicSalary: true,
        earnings: true,
        employee: {
          select: { employeeNumber: true, firstName: true, lastName: true },
        },
      },
    });

    const asLines = (v: unknown): { label: string; amount: number }[] =>
      Array.isArray(v) ? (v as { label: string; amount: number }[]) : [];

    const byEmployee = new Map<
      string,
      { earnings: number; months: Set<string>; meta: (typeof payslips)[number]["employee"] }
    >();

    for (const slip of payslips) {
      let entry = byEmployee.get(slip.employeeId);
      if (!entry) {
        entry = { earnings: 0, months: new Set(), meta: slip.employee };
        byEmployee.set(slip.employeeId, entry);
      }
      entry.earnings += slip.basicSalary.toNumber();
      for (const line of asLines(slip.earnings)) entry.earnings += line.amount;
      entry.months.add(slip.period);
    }

    const employees: CoidaEmployeeEarnings[] = Array.from(byEmployee.entries()).map(
      ([employeeId, { earnings, months, meta }]) => ({
        employeeId,
        employeeNumber: meta.employeeNumber,
        name: `${meta.firstName} ${meta.lastName}`,
        earnings,
        monthsWorked: months.size,
      })
    );

    return buildCoidaReturn(taxYear, employees);
  });
}
