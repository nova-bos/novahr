"use server";

import { ComplianceStatus, ComplianceType } from "@prisma/client";
import { runAsTenant } from "@/lib/db-context";
import { requireTenant } from "@/lib/auth/require";
import { getComplianceDueDate, calculateSdl } from "./utils";

export interface ComplianceRecordRow {
  id: string;
  tenantId: string;
  period: string;
  type: ComplianceType;
  status: ComplianceStatus;
  totalPaye: number;
  totalUif: number;
  totalSdl: number;
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
    const run = await tx.payrollRun.findUniqueOrThrow({ where: { id: payrollRunId } });
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
 * Marks a compliance record as submitted with a reference number and timestamp.
 */
export async function markComplianceSubmittedAction(
  tenantId: string,
  recordId: string,
  reference: string
): Promise<ComplianceRecordRow> {
  await requireTenant(tenantId, "hr");
  return runAsTenant(tenantId, async (tx) => {
    const record = await tx.complianceRecord.update({
      where: { id: recordId },
      data: {
        status: ComplianceStatus.submitted,
        reference,
        submittedOn: new Date(),
      },
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
