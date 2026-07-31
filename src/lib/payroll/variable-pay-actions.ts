"use server";

import type { PayrollInput } from "@prisma/client";
import { runAsTenant } from "@/lib/db-context";
import { requireRole, requireActiveSubscription } from "@/lib/auth/require";
import { decToNumber } from "../workspace/mappers";
import {
  COMPONENT_BY_TYPE,
  COMPONENT_TYPES,
  resolveInputAmount,
  type TaxTreatment,
} from "./variable-pay";

/** A serialisable variable-pay row returned to the client. */
export interface VariablePayInputDto {
  id: string;
  payrollRunId: string;
  employeeId: string;
  componentType: string;
  label: string;
  quantity: number | null;
  rate: number | null;
  amount: number;
  taxTreatment: TaxTreatment;
}

interface AddInput {
  runId: string;
  employeeId: string;
  componentType: string;
  label?: string;
  quantity?: number | null;
  rate?: number | null;
  amount?: number | null;
}

function toDto(row: PayrollInput): VariablePayInputDto {
  return {
    id: row.id,
    payrollRunId: row.payrollRunId,
    employeeId: row.employeeId,
    componentType: row.componentType,
    label: row.label,
    quantity: row.quantity != null ? decToNumber(row.quantity) : null,
    rate: row.rate != null ? decToNumber(row.rate) : null,
    amount: decToNumber(row.amount),
    taxTreatment: row.taxTreatment === "annual_payment" ? "annual_payment" : "regular",
  };
}

/** Lists every variable-pay input captured against a run. */
export async function listVariablePayInputsAction(runId: string): Promise<VariablePayInputDto[]> {
  const session = await requireRole("hr");
  return runAsTenant(session.tenantId, async (tx) => {
    const run = await tx.payrollRun.findFirst({
      where: { id: runId, tenantId: session.tenantId },
      select: { id: true },
    });
    if (!run) throw new Error("Payroll run not found.");
    const rows = await tx.payrollInput.findMany({
      where: { tenantId: session.tenantId, payrollRunId: runId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toDto);
  });
}

/** Adds one variable-pay input to a run. Only open (non-completed) runs. */
export async function addVariablePayInputAction(input: AddInput): Promise<VariablePayInputDto> {
  const session = await requireRole("hr");
  await requireActiveSubscription(session.tenantId);
  const def = COMPONENT_BY_TYPE.get(input.componentType);
  if (!def || !COMPONENT_TYPES.includes(input.componentType)) {
    throw new Error(`Unknown component type: ${input.componentType}`);
  }
  const amount = resolveInputAmount(input.componentType, {
    amount: input.amount ?? undefined,
    quantity: input.quantity ?? undefined,
    rate: input.rate ?? undefined,
  });
  if (!(amount > 0)) throw new Error("Amount must be greater than zero.");

  return runAsTenant(session.tenantId, async (tx) => {
    const run = await tx.payrollRun.findFirst({
      where: { id: input.runId, tenantId: session.tenantId },
      select: { id: true, status: true },
    });
    if (!run) throw new Error("Payroll run not found.");
    if (run.status === "completed" || run.status === "awaiting_approval") {
      throw new Error("This run is closed to further adjustments.");
    }
    const employee = await tx.employee.findFirst({
      where: { id: input.employeeId, tenantId: session.tenantId },
      select: { id: true, status: true },
    });
    if (!employee) throw new Error("Employee not found.");
    if (employee.status === "terminated") throw new Error("Employee is terminated.");

    const row = await tx.payrollInput.create({
      data: {
        tenantId: session.tenantId,
        payrollRunId: input.runId,
        employeeId: input.employeeId,
        componentType: input.componentType,
        label: input.label && input.label.trim() !== "" ? input.label.trim() : def.label,
        quantity: def.kind === "hours" ? input.quantity ?? null : null,
        rate: def.kind === "hours" ? input.rate ?? null : null,
        amount,
        taxTreatment: def.taxTreatment,
      },
    });
    return toDto(row);
  });
}

/** Removes a single variable-pay input by id (tenant-scoped). */
export async function removeVariablePayInputAction(id: string): Promise<{ ok: true }> {
  const session = await requireRole("hr");
  await runAsTenant(session.tenantId, async (tx) => {
    const existing = await tx.payrollInput.findFirst({
      where: { id, tenantId: session.tenantId },
      select: { id: true, payrollRun: { select: { status: true } } },
    });
    if (!existing) throw new Error("Input not found.");
    if (existing.payrollRun.status === "completed" || existing.payrollRun.status === "awaiting_approval") {
      throw new Error("This run is closed to further adjustments.");
    }
    await tx.payrollInput.deleteMany({ where: { id, tenantId: session.tenantId } });
  });
  return { ok: true };
}

export interface CsvApplyRow {
  employeeNumber: string;
  componentType: string;
  quantity?: number | null;
  rate?: number | null;
  amount?: number | null;
}

export interface CsvApplyResult {
  applied: number;
  errors: { row: number; message: string }[];
}

/**
 * Applies a validated batch of variable-pay rows to a run. Each row is matched
 * by employee number (must be active and belong to the tenant). Existing inputs
 * for the run are left in place; this only adds the supplied rows. Unknown or
 * terminated employees and unknown component types are reported, not applied.
 */
export async function applyVariablePayCsvAction(
  runId: string,
  rows: CsvApplyRow[]
): Promise<CsvApplyResult> {
  const session = await requireRole("hr");
  await requireActiveSubscription(session.tenantId);
  return runAsTenant(session.tenantId, async (tx) => {
    const run = await tx.payrollRun.findFirst({
      where: { id: runId, tenantId: session.tenantId },
      select: { id: true, status: true },
    });
    if (!run) throw new Error("Payroll run not found.");
    if (run.status === "completed" || run.status === "awaiting_approval") {
      throw new Error("This run is closed to further adjustments.");
    }
    const employees = await tx.employee.findMany({
      where: { tenantId: session.tenantId },
      select: { id: true, employeeNumber: true, status: true },
    });
    const byNumber = new Map(employees.map((e) => [e.employeeNumber.trim().toLowerCase(), e]));

    const errors: CsvApplyResult["errors"] = [];
    const toCreate: {
      employeeId: string;
      componentType: string;
      label: string;
      quantity: number | null;
      rate: number | null;
      amount: number;
      taxTreatment: string;
    }[] = [];

    rows.forEach((r, i) => {
      const rowNum = i + 2; // account for header row in the source file
      const emp = byNumber.get(r.employeeNumber.trim().toLowerCase());
      if (!emp) {
        errors.push({ row: rowNum, message: `Unknown employee number "${r.employeeNumber}".` });
        return;
      }
      if (emp.status === "terminated") {
        errors.push({ row: rowNum, message: `Employee "${r.employeeNumber}" is terminated.` });
        return;
      }
      const def = COMPONENT_BY_TYPE.get(r.componentType);
      if (!def) {
        errors.push({ row: rowNum, message: `Unknown component type "${r.componentType}".` });
        return;
      }
      const amount = resolveInputAmount(r.componentType, {
        amount: r.amount ?? undefined,
        quantity: r.quantity ?? undefined,
        rate: r.rate ?? undefined,
      });
      if (!(amount > 0)) return; // blank cell: skip silently
      toCreate.push({
        employeeId: emp.id,
        componentType: r.componentType,
        label: def.label,
        quantity: def.kind === "hours" ? r.quantity ?? null : null,
        rate: def.kind === "hours" ? r.rate ?? null : null,
        amount,
        taxTreatment: def.taxTreatment,
      });
    });

    if (toCreate.length > 0) {
      await tx.payrollInput.createMany({
        data: toCreate.map((c) => ({
          tenantId: session.tenantId,
          payrollRunId: runId,
          employeeId: c.employeeId,
          componentType: c.componentType,
          label: c.label,
          quantity: c.quantity,
          rate: c.rate,
          amount: c.amount,
          taxTreatment: c.taxTreatment,
        })),
      });
    }

    return { applied: toCreate.length, errors };
  });
}
