"use server";

import { prisma } from "@/lib/prisma";
import { requireRole, requireEmployeeScope } from "@/lib/auth/require";

/**
 * POPIA data-subject tooling: a portable export of everything the system holds
 * on an employee (right of access) and an irreversible personal-data erasure
 * (right to deletion) that redacts PII while retaining the financial records a
 * payroll operator must keep for the statutory retention period (SARS: 5 years).
 */

export interface EmployeeDataExport {
  exportedAt: string;
  employee: unknown;
  salaryHistory: unknown[];
  payslips: unknown[];
  leaveRequests: unknown[];
  deductions: unknown[];
  documents: unknown[];
  etiClaims: unknown[];
}

/**
 * Gathers all data held on an employee for a POPIA access request. Available to
 * the employee themselves, their manager, and HR via requireEmployeeScope.
 */
export async function exportEmployeeData(employeeId: string): Promise<EmployeeDataExport> {
  const user = await requireEmployeeScope(employeeId);
  const tenantId = user.tenantId;
  const where = { employeeId, tenantId };

  const [employee, salaryHistory, payslips, leaveRequests, deductions, documents, etiClaims] =
    await Promise.all([
      prisma.employee.findFirst({ where: { id: employeeId, tenantId }, include: { leaveBalances: true } }),
      prisma.employeeSalaryHistory.findMany({ where }),
      prisma.payslip.findMany({ where }),
      prisma.leaveRequest.findMany({ where }),
      prisma.employeeDeduction.findMany({ where }),
      // Document metadata only, never the file bytes.
      prisma.employeeDocument.findMany({
        where,
        select: { id: true, name: true, category: true, fileName: true, expiresAt: true, createdAt: true },
      }),
      prisma.etiClaim.findMany({ where }),
    ]);

  return {
    exportedAt: new Date().toISOString(),
    employee,
    salaryHistory,
    payslips,
    leaveRequests,
    deductions,
    documents,
    etiClaims,
  };
}

const REDACTED = "REDACTED";

/**
 * Irreversibly erases an employee's personal data (POPIA right to deletion):
 * name, contact, ID, tax and bank details, address, emergency contact and
 * equity demographics are overwritten. Payroll and leave financial records are
 * retained (legally required) but are no longer linked to identifying PII.
 * HR only.
 */
export async function eraseEmployeePersonalData(
  employeeId: string
): Promise<{ ok?: boolean; error?: string }> {
  const session = await requireRole("hr");
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, tenantId: session.tenantId },
    select: { id: true },
  });
  if (!employee) return { error: "Employee not found." };

  await prisma.$transaction([
    prisma.employee.update({
      where: { id: employeeId },
      data: {
        firstName: REDACTED,
        lastName: REDACTED,
        preferredName: null,
        email: `redacted+${employeeId}@example.invalid`,
        phone: REDACTED,
        idNumber: REDACTED,
        taxNumber: REDACTED,
        address: REDACTED,
        bankAccountNumber: REDACTED,
        emergencyContactName: REDACTED,
        emergencyContactRelationship: REDACTED,
        emergencyContactPhone: REDACTED,
        photoUrl: null,
        equityRace: null,
        equityGender: null,
        status: "terminated",
      },
    }),
    // Remove uploaded document records (file cleanup handled separately by ops).
    prisma.employeeDocument.deleteMany({ where: { employeeId, tenantId: session.tenantId } }),
  ]);

  return { ok: true };
}
