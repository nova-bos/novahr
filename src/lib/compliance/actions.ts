"use server";

import { ComplianceStatus, ComplianceType, Prisma } from "@prisma/client";
import { runAsTenant } from "@/lib/db-context";
import { requireTenant } from "@/lib/auth/require";
import { getComplianceDueDate, calculateSdl, isSdlLiable } from "./utils";
import {
  applyEti,
  calculateEti,
  isReconciliationPeriodStart,
  previousPeriod,
} from "@/lib/payroll/eti";

export interface ComplianceRecordRow {
  id: string;
  tenantId: string;
  period: string;
  type: ComplianceType;
  status: ComplianceStatus;
  totalPaye: number;
  totalUif: number;
  totalSdl: number;
  totalEti: number;
  etiCarriedForward: number;
  totalAmount: number;
  dueDate: string | null;
  submittedOn: string | null;
  reference: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceSummary {
  year: string;
  totalPaye: number;
  totalUif: number;
  totalSdl: number;
  totalAmount: number;
  pendingCount: number;
  submittedCount: number;
  acceptedCount: number;
  rejectedCount: number;
}

function mapRecord(r: {
  id: string;
  tenantId: string;
  period: string;
  type: ComplianceType;
  status: ComplianceStatus;
  totalPaye: Prisma.Decimal;
  totalUif: Prisma.Decimal;
  totalSdl: Prisma.Decimal;
  totalEti: Prisma.Decimal;
  etiCarriedForward: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  dueDate: Date | null;
  submittedOn: Date | null;
  reference: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ComplianceRecordRow {
  return {
    id: r.id,
    tenantId: r.tenantId,
    period: r.period,
    type: r.type,
    status: r.status,
    totalPaye: r.totalPaye.toNumber(),
    totalUif: r.totalUif.toNumber(),
    totalSdl: r.totalSdl.toNumber(),
    totalEti: r.totalEti.toNumber(),
    etiCarriedForward: r.etiCarriedForward.toNumber(),
    totalAmount: r.totalAmount.toNumber(),
    dueDate: r.dueDate ? r.dueDate.toISOString() : null,
    submittedOn: r.submittedOn ? r.submittedOn.toISOString() : null,
    reference: r.reference,
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

/**
 * Fetches all compliance records for a given year (defaults to current year).
 * Filters by period prefix "YYYY-".
 */
export async function getComplianceRecordsAction(
  tenantId: string,
  year?: string
): Promise<ComplianceRecordRow[]> {
  await requireTenant(tenantId, "hr", "exco");
  const targetYear = year ?? new Date().getFullYear().toString();
  return runAsTenant(tenantId, async (tx) => {
    const records = await tx.complianceRecord.findMany({
      where: {
        tenantId,
        period: { startsWith: targetYear },
      },
      orderBy: [{ period: "desc" }, { type: "asc" }],
    });
    return records.map(mapRecord);
  });
}

/**
 * Fetches the compliance records for the current month (PAYE, UIF, SDL).
 */
export async function getCurrentMonthComplianceAction(tenantId: string): Promise<{
  paye: ComplianceRecordRow | null;
  uif: ComplianceRecordRow | null;
  sdl: ComplianceRecordRow | null;
}> {
  await requireTenant(tenantId, "hr", "exco");
  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  return runAsTenant(tenantId, async (tx) => {
    const records = await tx.complianceRecord.findMany({
      where: {
        tenantId,
        period,
        type: {
          in: [
            ComplianceType.paye_return,
            ComplianceType.uif_return,
            ComplianceType.sdl_return,
          ],
        },
      },
    });

    const find = (t: ComplianceType) => records.find((r) => r.type === t) ?? null;
    return {
      paye: find(ComplianceType.paye_return) ? mapRecord(find(ComplianceType.paye_return)!) : null,
      uif: find(ComplianceType.uif_return) ? mapRecord(find(ComplianceType.uif_return)!) : null,
      sdl: find(ComplianceType.sdl_return) ? mapRecord(find(ComplianceType.sdl_return)!) : null,
    };
  });
}

/**
 * Generates three ComplianceRecord rows (PAYE, UIF, SDL) from a completed payroll run.
 * Uses upsert with the compound unique key tenantId_period_type.
 */
export async function generateComplianceFromRunAction(
  tenantId: string,
  payrollRunId: string
): Promise<{ paye: ComplianceRecordRow; uif: ComplianceRecordRow; sdl: ComplianceRecordRow }> {
  await requireTenant(tenantId, "hr");
  return runAsTenant(tenantId, async (tx) => {
    const run = await tx.payrollRun.findFirstOrThrow({ where: { id: payrollRunId, tenantId } });
    const period = run.period;
    const dueDate = getComplianceDueDate(period);
    // SDL only applies above the R500,000 annual-payroll threshold (SARS exemption).
    const activeEmployees = await tx.employee.findMany({
      where: { tenantId, status: { not: "terminated" } },
      select: { salaryAnnualGross: true },
    });
    const totalAnnualPayroll = activeEmployees.reduce((s, e) => s + e.salaryAnnualGross.toNumber(), 0);
    const sdlAmount = isSdlLiable(totalAnnualPayroll) ? calculateSdl(run.totalGross.toNumber()) : 0;

    const payeRecord = await tx.complianceRecord.upsert({
      where: { tenantId_period_type: { tenantId, period, type: ComplianceType.paye_return } },
      create: {
        tenantId,
        period,
        type: ComplianceType.paye_return,
        status: ComplianceStatus.pending,
        totalPaye: run.totalPaye,
        totalAmount: run.totalPaye,
        dueDate,
      },
      update: {
        totalPaye: run.totalPaye,
        totalAmount: run.totalPaye,
        dueDate,
      },
    });

    const uifRecord = await tx.complianceRecord.upsert({
      where: { tenantId_period_type: { tenantId, period, type: ComplianceType.uif_return } },
      create: {
        tenantId,
        period,
        type: ComplianceType.uif_return,
        status: ComplianceStatus.pending,
        totalUif: run.totalUif,
        totalAmount: run.totalUif,
        dueDate,
      },
      update: {
        totalUif: run.totalUif,
        totalAmount: run.totalUif,
        dueDate,
      },
    });

    const sdlRecord = await tx.complianceRecord.upsert({
      where: { tenantId_period_type: { tenantId, period, type: ComplianceType.sdl_return } },
      create: {
        tenantId,
        period,
        type: ComplianceType.sdl_return,
        status: ComplianceStatus.pending,
        totalSdl: sdlAmount,
        totalAmount: sdlAmount,
        dueDate,
      },
      update: {
        totalSdl: sdlAmount,
        totalAmount: sdlAmount,
        dueDate,
      },
    });

    return {
      paye: mapRecord(payeRecord),
      uif: mapRecord(uifRecord),
      sdl: mapRecord(sdlRecord),
    };
  });
}

/**
 * Sums the ETI claimable across every payslip in a completed payroll run and
 * records each qualifying claim in the EtiClaim ledger. The 24-month window is
 * counted from actual prior claims (periods before this one), not employment
 * tenure, so breaks in service and prior claims are handled correctly.
 * Idempotent: regenerating a period upserts that period's claim and removes it
 * if the employee no longer qualifies.
 */
async function computeRunEti(
  tx: Parameters<Parameters<typeof runAsTenant>[1]>[0],
  tenantId: string,
  payrollRunId: string,
  period: string
): Promise<number> {
  const payslips = await tx.payslip.findMany({
    where: { runId: payrollRunId, tenantId },
    include: { employee: { select: { idNumber: true, startDate: true } } },
  });

  let total = 0;
  for (const slip of payslips) {
    if (!slip.employee) continue;
    // Months already claimed = distinct prior periods in the ledger for this
    // employee. The current period is excluded so regeneration is stable.
    const monthsAlreadyClaimed = await tx.etiClaim.count({
      where: { tenantId, employeeId: slip.employeeId, period: { lt: period } },
    });
    const result = calculateEti(
      { period, monthlyRemuneration: slip.grossPay.toNumber(), monthsAlreadyClaimed },
      { idNumber: slip.employee.idNumber, startDate: slip.employee.startDate }
    );

    if (result.qualifies && result.amount > 0) {
      await tx.etiClaim.upsert({
        where: { employeeId_period: { employeeId: slip.employeeId, period } },
        create: {
          tenantId,
          employeeId: slip.employeeId,
          period,
          qualifyingMonth: result.qualifyingMonth ?? monthsAlreadyClaimed + 1,
          amount: result.amount,
        },
        update: {
          qualifyingMonth: result.qualifyingMonth ?? monthsAlreadyClaimed + 1,
          amount: result.amount,
        },
      });
      total += result.amount;
    } else {
      // No longer qualifies: clear any stale claim for this period.
      await tx.etiClaim.deleteMany({ where: { tenantId, employeeId: slip.employeeId, period } });
    }
  }
  return Math.round(total * 100) / 100;
}

/**
 * Generates the consolidated EMP201 declaration for a payroll run. EMP201 is
 * the single monthly return combining PAYE, SDL and UIF, reduced by ETI:
 *   payable = PAYE - ETI + SDL + UIF
 * The PAYE, UIF and SDL component records are also refreshed via
 * generateComplianceFromRunAction so the two stay consistent.
 */
export async function generateEmp201FromRunAction(
  tenantId: string,
  payrollRunId: string
): Promise<ComplianceRecordRow> {
  await requireTenant(tenantId, "hr");
  await generateComplianceFromRunAction(tenantId, payrollRunId);
  return runAsTenant(tenantId, async (tx) => {
    const run = await tx.payrollRun.findFirstOrThrow({ where: { id: payrollRunId, tenantId } });
    const period = run.period;
    const dueDate = getComplianceDueDate(period);
    // SDL only applies above the R500,000 annual-payroll threshold (SARS exemption).
    const activeEmployees = await tx.employee.findMany({
      where: { tenantId, status: { not: "terminated" } },
      select: { salaryAnnualGross: true },
    });
    const totalAnnualPayroll = activeEmployees.reduce((s, e) => s + e.salaryAnnualGross.toNumber(), 0);
    const totalSdl = isSdlLiable(totalAnnualPayroll) ? calculateSdl(run.totalGross.toNumber()) : 0;
    const etiCalculated = await computeRunEti(tx, tenantId, payrollRunId, period);

    // ETI carry-forward: unused ETI (calculated plus any brought forward from
    // the prior month of the same reconciliation period) may only reduce PAYE
    // to zero; the remainder is carried into next month, never dropped.
    let etiBroughtForward = 0;
    if (!isReconciliationPeriodStart(period)) {
      const prev = await tx.complianceRecord.findUnique({
        where: {
          tenantId_period_type: {
            tenantId,
            period: previousPeriod(period),
            type: ComplianceType.emp201,
          },
        },
        select: { etiCarriedForward: true },
      });
      etiBroughtForward = prev?.etiCarriedForward?.toNumber() ?? 0;
    }

    const { etiUtilised, etiCarriedForward, payablePaye } = applyEti(
      run.totalPaye.toNumber(),
      etiCalculated,
      etiBroughtForward
    );
    const payable = Math.round((payablePaye + run.totalUif.toNumber() + totalSdl) * 100) / 100;

    const data = {
      totalPaye: run.totalPaye,
      totalUif: run.totalUif,
      totalSdl,
      totalEti: etiUtilised,
      etiCarriedForward,
      totalAmount: payable,
      dueDate,
    };
    const record = await tx.complianceRecord.upsert({
      where: { tenantId_period_type: { tenantId, period, type: ComplianceType.emp201 } },
      create: {
        tenantId,
        period,
        type: ComplianceType.emp201,
        status: ComplianceStatus.pending,
        ...data,
      },
      update: data,
    });

    return mapRecord(record);
  });
}

/**
 * Fetches the EMP201 consolidated record for a given period, or null.
 */
export async function getEmp201Action(
  tenantId: string,
  period: string
): Promise<ComplianceRecordRow | null> {
  await requireTenant(tenantId, "hr", "exco");
  return runAsTenant(tenantId, async (tx) => {
    const record = await tx.complianceRecord.findUnique({
      where: { tenantId_period_type: { tenantId, period, type: ComplianceType.emp201 } },
    });
    return record ? mapRecord(record) : null;
  });
}

/**
 * Generates (or refreshes) the EMP201 for a period from the most recent
 * completed payroll run in that period. Throws a friendly error when no
 * completed run exists yet.
 */
export async function generateEmp201ForPeriodAction(
  tenantId: string,
  period: string
): Promise<ComplianceRecordRow> {
  await requireTenant(tenantId, "hr");
  const runId = await runAsTenant(tenantId, async (tx) => {
    const run = await tx.payrollRun.findFirst({
      where: { tenantId, period, status: "completed" },
      orderBy: { processedOn: "desc" },
      select: { id: true },
    });
    return run?.id ?? null;
  });
  if (!runId) {
    throw new Error(`No completed payroll run for ${period}. Complete a run before generating the EMP201.`);
  }
  return generateEmp201FromRunAction(tenantId, runId);
}

/**
 * Marks a compliance record as submitted with a reference number and timestamp.
 */
export async function markComplianceSubmittedAction(
  tenantId: string,
  recordId: string,
  reference: string
): Promise<ComplianceRecordRow> {
  await requireTenant(tenantId, "hr");
  return runAsTenant(tenantId, async (tx) => {
    const updated = await tx.complianceRecord.updateMany({
      where: { id: recordId, tenantId },
      data: {
        status: ComplianceStatus.submitted,
        reference,
        submittedOn: new Date(),
      },
    });
    if (updated.count === 0) throw new Error("Compliance record not found.");
    const record = await tx.complianceRecord.findFirstOrThrow({
      where: { id: recordId, tenantId },
    });
    return mapRecord(record);
  });
}

/**
 * Returns aggregate totals for compliance records in a given year.
 */
export async function getComplianceSummaryAction(
  tenantId: string,
  year?: string
): Promise<ComplianceSummary> {
  await requireTenant(tenantId, "hr", "exco");
  const targetYear = year ?? new Date().getFullYear().toString();
  return runAsTenant(tenantId, async (tx) => {
    const records = await tx.complianceRecord.findMany({
      where: {
        tenantId,
        period: { startsWith: targetYear },
      },
    });

    return {
      year: targetYear,
      totalPaye: records.reduce((s, r) => s + r.totalPaye.toNumber(), 0),
      totalUif: records.reduce((s, r) => s + r.totalUif.toNumber(), 0),
      totalSdl: records.reduce((s, r) => s + r.totalSdl.toNumber(), 0),
      totalAmount: records.reduce((s, r) => s + r.totalAmount.toNumber(), 0),
      pendingCount: records.filter((r) => r.status === ComplianceStatus.pending).length,
      submittedCount: records.filter((r) => r.status === ComplianceStatus.submitted).length,
      acceptedCount: records.filter((r) => r.status === ComplianceStatus.accepted).length,
      rejectedCount: records.filter((r) => r.status === ComplianceStatus.rejected).length,
    };
  });
}
