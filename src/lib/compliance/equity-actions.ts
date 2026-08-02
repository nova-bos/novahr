"use server";

import type { EquityGender, EquityRace, OccupationalLevel } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole, requireTenant, requireActiveSubscription } from "@/lib/auth/require";
import { buildEquityReport, type EquityReport } from "./employment-equity";
import { buildEquityForms, type EquityForms } from "./equity-forms";

/**
 * Builds the Employment Equity report (EEA2 headcount and EEA4 remuneration)
 * for the tenant's active workforce.
 */
export async function getEmploymentEquityReportAction(
  tenantId: string
): Promise<EquityReport> {
  await requireTenant(tenantId, "hr", "exco");
  const employees = await prisma.employee.findMany({
    where: { tenantId, status: { not: "terminated" } },
    select: {
      equityRace: true,
      equityGender: true,
      occupationalLevel: true,
      foreignNational: true,
      hasDisability: true,
      salaryAnnualGross: true,
    },
  });
  return buildEquityReport(
    employees.map((e) => ({
      race: e.equityRace ?? undefined,
      gender: e.equityGender ?? undefined,
      level: e.occupationalLevel ?? undefined,
      foreignNational: e.foreignNational,
      hasDisability: e.hasDisability,
      annualGross: e.salaryAnnualGross.toNumber(),
    }))
  );
}

/**
 * Builds the statutory EEA2/EEA4 form data (workforce profile and income
 * differentials) plus the company name, for PDF generation.
 */
export async function getEquityFormsAction(
  tenantId: string
): Promise<{ forms: EquityForms; companyName: string }> {
  await requireTenant(tenantId, "hr", "exco");
  const [tenant, employees] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true, legalName: true } }),
    prisma.employee.findMany({
      where: { tenantId, status: { not: "terminated" } },
      select: {
        equityRace: true,
        equityGender: true,
        occupationalLevel: true,
        foreignNational: true,
        hasDisability: true,
        salaryAnnualGross: true,
      },
    }),
  ]);
  const forms = buildEquityForms(
    employees.map((e) => ({
      race: e.equityRace ?? undefined,
      gender: e.equityGender ?? undefined,
      level: e.occupationalLevel ?? undefined,
      foreignNational: e.foreignNational,
      hasDisability: e.hasDisability,
      annualGross: e.salaryAnnualGross.toNumber(),
    }))
  );
  return { forms, companyName: tenant?.legalName || tenant?.name || "Company" };
}

export interface EquityUpdateInput {
  equityRace: EquityRace | null;
  equityGender: EquityGender | null;
  occupationalLevel: OccupationalLevel | null;
  foreignNational: boolean;
  hasDisability: boolean;
}

/** Updates an employee's Employment Equity demographics. HR only. */
export async function updateEmployeeEquityAction(
  employeeId: string,
  input: EquityUpdateInput
): Promise<{ ok?: boolean; error?: string }> {
  const session = await requireRole("hr");
  await requireActiveSubscription(session.tenantId);
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, tenantId: session.tenantId },
    select: { id: true },
  });
  if (!employee) return { error: "Employee not found." };

  await prisma.employee.updateMany({
    where: { id: employeeId, tenantId: session.tenantId },
    data: {
      equityRace: input.equityRace,
      equityGender: input.equityGender,
      occupationalLevel: input.occupationalLevel,
      foreignNational: input.foreignNational,
      hasDisability: input.hasDisability,
    },
  });
  return { ok: true };
}
