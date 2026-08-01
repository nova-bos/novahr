"use server";

import { runAsTenant } from "@/lib/db-context";
import { requireRole } from "@/lib/auth/require";

export interface ExpiringQualification {
  qualificationId: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  type: string;
  name: string;
  expiresAt: string;
  daysUntilExpiry: number;
}

/**
 * Returns qualifications that expire within `withinDays` days (default 60).
 * Only tenant-scoped qualifications with an expiresAt date are considered.
 * Already-expired qualifications are included with a negative daysUntilExpiry.
 */
export async function getExpiringQualificationsAction(
  withinDays = 60
): Promise<ExpiringQualification[]> {
  const session = await requireRole("hr");
  const tenantId = session.tenantId;

  return runAsTenant(tenantId, async (tx) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + withinDays);

    const rows = await tx.employeeQualification.findMany({
      where: {
        tenantId,
        expiresAt: { lte: cutoff },
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, employeeNumber: true, status: true },
        },
      },
      orderBy: { expiresAt: "asc" },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return rows
      .filter((r) => r.employee.status !== "terminated")
      .map((r) => {
        const expiry = new Date(r.expiresAt!);
        expiry.setHours(0, 0, 0, 0);
        const daysUntilExpiry = Math.round(
          (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        return {
          qualificationId: r.id,
          employeeId: r.employeeId,
          employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
          employeeNumber: r.employee.employeeNumber,
          type: r.type,
          name: r.name,
          expiresAt: r.expiresAt!.toISOString().slice(0, 10),
          daysUntilExpiry,
        };
      });
  });
}

export interface EndingProbation {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  probationEndDate: string;
  daysUntilEnd: number;
}

/**
 * Employees on probation whose probation ends within `withinDays` days (default
 * 60), or has already passed. HR should confirm or extend these.
 */
export async function getEndingProbationsAction(withinDays = 60): Promise<EndingProbation[]> {
  const session = await requireRole("hr");
  const tenantId = session.tenantId;

  return runAsTenant(tenantId, async (tx) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + withinDays);

    const rows = await tx.employee.findMany({
      where: { tenantId, status: "probation", probationEndDate: { lte: cutoff, not: null } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeNumber: true,
        probationEndDate: true,
      },
      orderBy: { probationEndDate: "asc" },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return rows.map((r) => {
      const end = new Date(r.probationEndDate!);
      end.setHours(0, 0, 0, 0);
      const daysUntilEnd = Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return {
        employeeId: r.id,
        employeeName: `${r.firstName} ${r.lastName}`,
        employeeNumber: r.employeeNumber,
        probationEndDate: r.probationEndDate!.toISOString().slice(0, 10),
        daysUntilEnd,
      };
    });
  });
}

export interface ExpiringDocument {
  documentId: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  category: string;
  name: string;
  expiresAt: string;
  daysUntilExpiry: number;
}

/**
 * Returns employee documents that expire within `withinDays` days (default 60).
 * Only documents with an expiresAt date are considered; already-expired ones are
 * included with a negative daysUntilExpiry. Terminated employees are excluded.
 */
export async function getExpiringDocumentsAction(
  withinDays = 60
): Promise<ExpiringDocument[]> {
  const session = await requireRole("hr");
  const tenantId = session.tenantId;

  return runAsTenant(tenantId, async (tx) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + withinDays);

    const rows = await tx.employeeDocument.findMany({
      where: { tenantId, expiresAt: { lte: cutoff } },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, employeeNumber: true, status: true },
        },
      },
      orderBy: { expiresAt: "asc" },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return rows
      .filter((r) => r.employee.status !== "terminated")
      .map((r) => {
        const expiry = new Date(r.expiresAt!);
        expiry.setHours(0, 0, 0, 0);
        const daysUntilExpiry = Math.round(
          (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        return {
          documentId: r.id,
          employeeId: r.employeeId,
          employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
          employeeNumber: r.employee.employeeNumber,
          category: r.category,
          name: r.name,
          expiresAt: r.expiresAt!.toISOString().slice(0, 10),
          daysUntilExpiry,
        };
      });
  });
}
