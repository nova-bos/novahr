"use server";

import { runAsTenant } from "@/lib/db-context";
import { requireRole } from "@/lib/auth/require";
import type { DisciplinaryRecord, DisciplinaryType } from "@/lib/types";

function mapRecord(row: {
  id: string;
  tenantId: string;
  employeeId: string;
  type: string;
  description: string;
  issuedAt: Date;
  expiresAt: Date | null;
  createdBy: string;
  documentId: string | null;
  createdAt: Date;
}): DisciplinaryRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    employeeId: row.employeeId,
    type: row.type as DisciplinaryType,
    description: row.description,
    issuedAt: row.issuedAt.toISOString(),
    expiresAt: row.expiresAt?.toISOString() ?? null,
    createdBy: row.createdBy,
    documentId: row.documentId ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getDisciplinaryRecordsAction(
  employeeId: string
): Promise<DisciplinaryRecord[]> {
  const session = await requireRole("hr");
  const tenantId = session.tenantId;
  return runAsTenant(tenantId, async (tx) => {
    const rows = await tx.disciplinaryRecord.findMany({
      where: { tenantId, employeeId },
      orderBy: { issuedAt: "desc" },
    });
    return rows.map(mapRecord);
  });
}

export async function createDisciplinaryRecordAction(input: {
  employeeId: string;
  type: DisciplinaryType;
  description: string;
  issuedAt: string;
  expiresAt?: string | null;
}): Promise<DisciplinaryRecord> {
  const session = await requireRole("hr");
  const tenantId = session.tenantId;

  if (!input.employeeId || !input.type || !input.description.trim() || !input.issuedAt) {
    throw new Error("Employee, type, description, and issued date are required.");
  }

  return runAsTenant(tenantId, async (tx) => {
    const employee = await tx.employee.findFirst({
      where: { id: input.employeeId, tenantId },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!employee) throw new Error("Employee not found.");

    const row = await tx.disciplinaryRecord.create({
      data: {
        tenantId,
        employeeId: input.employeeId,
        type: input.type,
        description: input.description.trim(),
        issuedAt: new Date(input.issuedAt),
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        createdBy: session.name,
      },
    });

    await tx.activityItem.create({
      data: {
        tenantId,
        type: "promotion",
        message: `issued a ${input.type.replace(/_/g, " ")} to ${employee.firstName} ${employee.lastName}`,
        actor: session.name,
      },
    });

    return mapRecord(row);
  });
}

export async function deleteDisciplinaryRecordAction(recordId: string): Promise<void> {
  const session = await requireRole("hr");
  const tenantId = session.tenantId;
  return runAsTenant(tenantId, async (tx) => {
    const record = await tx.disciplinaryRecord.findFirst({
      where: { id: recordId, tenantId },
    });
    if (!record) throw new Error("Record not found.");
    await tx.disciplinaryRecord.delete({ where: { id: recordId } });
  });
}
