"use server";

import { ComplianceStatus, ComplianceType } from "@prisma/client";
import { runAsTenant } from "@/lib/db-context";
import { requireTenant } from "@/lib/auth/require";
import { getComplianceDueDate, calculateSdl } from "./utils";
import { calculateEti } from "@/lib/payroll/eti";

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
  totalPaye: number;
  totalUif: number;
  totalSdl: number;
  totalEti: number;
  totalAmount: number;
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
    totalPaye: r.totalPaye,
    totalUif: r.totalUif,
    totalSdl: r.totalSdl,
    totalEti: r.totalEti,
    totalAmount: r.totalAmount,
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
    const sdlAmount = calculateSdl(run.totalGross);

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
 * Number of complete months between an employee's start date and the start of
 * the given period, clamped to the 24-month ETI window. This is a pragmatic
 * proxy for "ETI months already claimed" based on tenure. It assumes continuous
 * employment and no ETI claimed by a previous employer. For exact compliance
 * this should be replaced by a persisted per-employee ETI claim ledger.
 */
function etiMonthsAlreadyClaimed(startDate: Date, period: string): number {
  const [year, month] = period.split("-").map(Number);
  const periodIndex = year * 12 + (month - 1);
  const startIndex = startDate.getFullYear() * 12 + startDate.getMonth();
  const diff = periodIndex - startIndex;
  return Math.max(0, Math.min(diff, 24));
}

/**
 * Sums the ETI claimable across every payslip in a completed payroll run.
 * ETI reduces the PAYE payable to SARS on the EMP201.
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
    const result = calculateEti(
      {
        period,
        monthlyRemuneration: slip.grossPay,
        monthsAlreadyClaimed: etiMonthsAlreadyClaimed(slip.employee.startDate, period),
      },
      { idNumber: slip.employee.idNumber, startDate: slip.employee.startDate }
    );
    total += result.amount;
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
    const totalSdl = calculateSdl(run.totalGross);
    const totalEti = await computeRunEti(tx, tenantId, payrollRunId, period);
    const payable = Math.max(
      Math.round((run.totalPaye - totalEti + run.totalUif + totalSdl) * 100) / 100,
      0
    );

    const record = await tx.complianceRecord.upsert({
      where: { tenantId_period_type: { tenantId, period, type: ComplianceType.emp201 } },
      create: {
        tenantId,
        period,
        type: ComplianceType.emp201,
        status: ComplianceStatus.pending,
        totalPaye: run.totalPaye,
        totalUif: run.totalUif,
        totalSdl,
        totalEti,
        totalAmount: payable,
        dueDate,
      },
      update: {
        totalPaye: run.totalPaye,
        totalUif: run.totalUif,
        totalSdl,
        totalEti,
        totalAmount: payable,
        dueDate,
      },
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
      totalPaye: records.reduce((s, r) => s + r.totalPaye, 0),
      totalUif: records.reduce((s, r) => s + r.totalUif, 0),
      totalSdl: records.reduce((s, r) => s + r.totalSdl, 0),
      totalAmount: records.reduce((s, r) => s + r.totalAmount, 0),
      pendingCount: records.filter((r) => r.status === ComplianceStatus.pending).length,
      submittedCount: records.filter((r) => r.status === ComplianceStatus.submitted).length,
      acceptedCount: records.filter((r) => r.status === ComplianceStatus.accepted).length,
      rejectedCount: records.filter((r) => r.status === ComplianceStatus.rejected).length,
    };
  });
}
