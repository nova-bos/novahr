"use server";

import { runAsTenant } from "@/lib/db-context";
import { requireRole } from "@/lib/auth/require";
import { mapPayslip } from "../workspace/mappers";
import {
  buildPayrollRegister,
  type PayrollRegister,
  type RegisterEmployee,
} from "./register";
import { buildGlJournal, type GlJournal } from "./gl-journal";

/**
 * Reporting surfaces for a completed payroll run (Phase 6 HR outputs).
 *
 * Both actions are read-only and tenant-scoped: every query carries a tenantId
 * predicate and runs inside runAsTenant. They read the run's persisted payslips
 * (the earnings/deductions JSON snapshots) plus the employee display fields and
 * branch names, then delegate the computation to the pure register/journal
 * modules.
 */

export interface PayrollRegisterResult {
  runLabel: string;
  period: string;
  register: PayrollRegister;
}

export interface GlJournalResult {
  runLabel: string;
  period: string;
  register: PayrollRegister;
  journal: GlJournal;
}

async function loadRunRegister(runId: string): Promise<PayrollRegisterResult> {
  const session = await requireRole("hr");
  const tenantId = session.tenantId;
  return runAsTenant(tenantId, async (tx) => {
    const run = await tx.payrollRun.findFirst({ where: { id: runId, tenantId } });
    if (!run) throw new Error("Payroll run not found.");

    const payslipRows = await tx.payslip.findMany({ where: { runId, tenantId } });
    const payslips = payslipRows.map(mapPayslip);

    const employeeIds = [...new Set(payslips.map((p) => p.employeeId))];
    const employeeRows = employeeIds.length
      ? await tx.employee.findMany({
          where: { tenantId, id: { in: employeeIds } },
          select: { id: true, employeeNumber: true, firstName: true, lastName: true, branchId: true },
        })
      : [];

    const branchIds = [
      ...new Set(employeeRows.map((e) => e.branchId).filter((b): b is string => b != null)),
    ];
    const branchRows = branchIds.length
      ? await tx.branch.findMany({
          where: { tenantId, id: { in: branchIds } },
          select: { id: true, name: true },
        })
      : [];
    const branchNameById = new Map(branchRows.map((b) => [b.id, b.name]));

    const employees = new Map<string, RegisterEmployee>(
      employeeRows.map((e) => [
        e.id,
        {
          employeeNumber: e.employeeNumber,
          firstName: e.firstName,
          lastName: e.lastName,
          branchName: e.branchId ? branchNameById.get(e.branchId) : undefined,
        },
      ])
    );

    return {
      runLabel: run.label,
      period: run.period,
      register: buildPayrollRegister(payslips, employees),
    };
  });
}

/** Tenant-scoped payroll register for a run (on-screen table + CSV source). */
export async function getPayrollRegisterAction(runId: string): Promise<PayrollRegisterResult> {
  return loadRunRegister(runId);
}

/** Tenant-scoped GL journal for a run, built from the same register. */
export async function getGlJournalAction(runId: string): Promise<GlJournalResult> {
  const { runLabel, period, register } = await loadRunRegister(runId);
  return { runLabel, period, register, journal: buildGlJournal(register) };
}
