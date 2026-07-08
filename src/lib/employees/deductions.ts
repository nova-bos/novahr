"use server";

import type { DeductionKind, Prisma, RecoveryStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole, requireEmployeeScope } from "@/lib/auth/require";
import { decToNumber } from "@/lib/workspace/mappers";

const KINDS: DeductionKind[] = ["loan", "garnishee", "other"];

export interface EmployeeDeductionRow {
  id: string;
  employeeId: string;
  kind: DeductionKind;
  description: string;
  reference: string | null;
  originalAmount: number;
  monthlyAmount: number;
  balance: number;
  status: RecoveryStatus;
  startDate: string;
  settledAt: string | null;
  createdAt: string;
}

function mapRow(d: {
  id: string;
  employeeId: string;
  kind: DeductionKind;
  description: string;
  reference: string | null;
  originalAmount: Prisma.Decimal;
  monthlyAmount: Prisma.Decimal;
  balance: Prisma.Decimal;
  status: RecoveryStatus;
  startDate: Date;
  settledAt: Date | null;
  createdAt: Date;
}): EmployeeDeductionRow {
  return {
    id: d.id,
    employeeId: d.employeeId,
    kind: d.kind,
    description: d.description,
    reference: d.reference,
    originalAmount: decToNumber(d.originalAmount),
    monthlyAmount: decToNumber(d.monthlyAmount),
    balance: decToNumber(d.balance),
    status: d.status,
    startDate: d.startDate.toISOString(),
    settledAt: d.settledAt ? d.settledAt.toISOString() : null,
    createdAt: d.createdAt.toISOString(),
  };
}

/**
 * Lists an employee's loans and garnishees. Visible to the employee, their
 * manager, and HR via requireEmployeeScope.
 */
export async function listEmployeeDeductions(
  employeeId: string
): Promise<EmployeeDeductionRow[]> {
  const user = await requireEmployeeScope(employeeId);
  const rows = await prisma.employeeDeduction.findMany({
    where: { employeeId, tenantId: user.tenantId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  return rows.map(mapRow);
}

export interface CreateDeductionInput {
  employeeId: string;
  kind: string;
  description: string;
  reference?: string;
  originalAmount: number;
  monthlyAmount: number;
}

/**
 * Creates a loan or garnishee for an employee. HR only. The outstanding balance
 * starts at the original amount and is recovered on each payroll run.
 */
export async function createEmployeeDeduction(
  input: CreateDeductionInput
): Promise<{ deduction?: EmployeeDeductionRow; error?: string }> {
  const session = await requireRole("hr");
  const employee = await prisma.employee.findFirst({
    where: { id: input.employeeId, tenantId: session.tenantId },
    select: { id: true },
  });
  if (!employee) return { error: "Employee not found." };

  const description = input.description.trim();
  if (!description) return { error: "A description is required." };
  const kind = (KINDS as string[]).includes(input.kind) ? (input.kind as DeductionKind) : "loan";
  const originalAmount = Number(input.originalAmount);
  const monthlyAmount = Number(input.monthlyAmount);
  if (!(originalAmount > 0)) return { error: "The total amount must be greater than zero." };
  if (!(monthlyAmount > 0)) return { error: "The monthly amount must be greater than zero." };
  if (monthlyAmount > originalAmount) {
    return { error: "The monthly amount cannot exceed the total amount." };
  }

  const created = await prisma.employeeDeduction.create({
    data: {
      tenantId: session.tenantId,
      employeeId: input.employeeId,
      kind,
      description,
      reference: input.reference?.trim() || null,
      originalAmount,
      monthlyAmount,
      balance: originalAmount,
      createdBy: session.name ?? null,
    },
  });
  return { deduction: mapRow(created) };
}

/** Cancels an active deduction so it stops being recovered. HR only. */
export async function cancelEmployeeDeduction(
  id: string
): Promise<{ deduction?: EmployeeDeductionRow; error?: string }> {
  const session = await requireRole("hr");
  const existing = await prisma.employeeDeduction.findFirst({
    where: { id, tenantId: session.tenantId },
    select: { id: true, status: true },
  });
  if (!existing) return { error: "Deduction not found." };
  if (existing.status !== "active") return { error: "Only active deductions can be cancelled." };

  const updated = await prisma.employeeDeduction.update({
    where: { id },
    data: { status: "cancelled" },
  });
  return { deduction: mapRow(updated) };
}
