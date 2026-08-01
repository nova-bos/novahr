"use server";

import { runAsTenant } from "@/lib/db-context";
import { requireRole, requireEmployeeScope, requireActiveSubscription } from "@/lib/auth/require";
import { decToNumber } from "../workspace/mappers";
import { COMPONENT_BY_TYPE, isRecurringComponentType } from "./variable-pay";

export interface RecurringInputDto {
  id: string;
  employeeId: string;
  componentType: string;
  label: string;
  amount: number;
  isActive: boolean;
}

export async function listRecurringInputsAction(employeeId: string): Promise<RecurringInputDto[]> {
  const user = await requireEmployeeScope(employeeId);
  return runAsTenant(user.tenantId, async (tx) => {
    const rows = await tx.recurringPayrollInput.findMany({
      where: { tenantId: user.tenantId, employeeId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      componentType: r.componentType,
      label: r.label ?? COMPONENT_BY_TYPE.get(r.componentType)?.label ?? r.componentType,
      amount: decToNumber(r.amount),
      isActive: r.isActive,
    }));
  });
}

export async function createRecurringInputAction(input: {
  employeeId: string;
  componentType: string;
  label?: string;
  amount: number;
}): Promise<RecurringInputDto> {
  const session = await requireRole("hr");
  await requireActiveSubscription(session.tenantId);
  const def = COMPONENT_BY_TYPE.get(input.componentType);
  if (!def || !isRecurringComponentType(input.componentType)) {
    throw new Error("This component type cannot be recurring.");
  }
  if (!(input.amount > 0)) throw new Error("Amount must be greater than zero.");

  return runAsTenant(session.tenantId, async (tx) => {
    const employee = await tx.employee.findFirst({
      where: { id: input.employeeId, tenantId: session.tenantId },
      select: { id: true },
    });
    if (!employee) throw new Error("Employee not found.");
    const row = await tx.recurringPayrollInput.create({
      data: {
        tenantId: session.tenantId,
        employeeId: input.employeeId,
        componentType: input.componentType,
        label: input.label?.trim() || null,
        amount: input.amount,
      },
    });
    return {
      id: row.id,
      employeeId: row.employeeId,
      componentType: row.componentType,
      label: row.label ?? def.label,
      amount: decToNumber(row.amount),
      isActive: row.isActive,
    };
  });
}

export async function deleteRecurringInputAction(id: string): Promise<{ ok: true }> {
  const session = await requireRole("hr");
  return runAsTenant(session.tenantId, async (tx) => {
    const row = await tx.recurringPayrollInput.findFirst({
      where: { id, tenantId: session.tenantId },
    });
    if (!row) throw new Error("Recurring component not found.");
    await tx.recurringPayrollInput.delete({ where: { id } });
    return { ok: true };
  });
}

/**
 * Applies every active recurring component to an open run as PayrollInput rows,
 * for the employees in the run's scope. Idempotent: skips any component already
 * present for an employee in this run (same type + label). Returns how many were
 * added.
 */
export async function applyRecurringInputsToRunAction(runId: string): Promise<{ added: number }> {
  const session = await requireRole("hr");
  await requireActiveSubscription(session.tenantId);

  return runAsTenant(session.tenantId, async (tx) => {
    const run = await tx.payrollRun.findFirst({
      where: { id: runId, tenantId: session.tenantId },
      select: { id: true, status: true, branchId: true },
    });
    if (!run) throw new Error("Payroll run not found.");
    if (run.status === "completed" || run.status === "awaiting_approval") {
      throw new Error("This run is closed to further adjustments.");
    }

    const branchFilter = run.branchId != null ? { branchId: run.branchId } : {};
    const employees = await tx.employee.findMany({
      where: { tenantId: session.tenantId, status: { not: "terminated" }, ...branchFilter },
      select: { id: true },
    });
    const employeeIds = new Set(employees.map((e) => e.id));

    const recurring = await tx.recurringPayrollInput.findMany({
      where: { tenantId: session.tenantId, isActive: true, employeeId: { in: [...employeeIds] } },
    });
    const existing = await tx.payrollInput.findMany({
      where: { tenantId: session.tenantId, payrollRunId: runId },
      select: { employeeId: true, componentType: true, label: true },
    });
    const existingKey = new Set(existing.map((e) => `${e.employeeId}|${e.componentType}|${e.label}`));

    let added = 0;
    for (const rec of recurring) {
      const def = COMPONENT_BY_TYPE.get(rec.componentType);
      if (!def) continue;
      const label = rec.label && rec.label.trim() !== "" ? rec.label.trim() : def.label;
      if (existingKey.has(`${rec.employeeId}|${rec.componentType}|${label}`)) continue;
      await tx.payrollInput.create({
        data: {
          tenantId: session.tenantId,
          payrollRunId: runId,
          employeeId: rec.employeeId,
          componentType: rec.componentType,
          label,
          amount: rec.amount,
          taxTreatment: def.taxTreatment,
        },
      });
      added++;
    }
    return { added };
  });
}
