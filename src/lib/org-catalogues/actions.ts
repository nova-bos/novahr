"use server";

import { runAsTenant } from "@/lib/db-context";
import { requireRole, requireActiveSubscription } from "@/lib/auth/require";

export interface JobPositionDto {
  id: string;
  title: string;
  grade: string | null;
  isActive: boolean;
}

export interface CostCentreDto {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
}

// ---- Job positions ----

export async function listJobPositionsAction(): Promise<JobPositionDto[]> {
  const session = await requireRole("hr", "manager", "exco");
  return runAsTenant(session.tenantId, async (tx) => {
    const rows = await tx.jobPosition.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { title: "asc" },
    });
    return rows.map((r) => ({ id: r.id, title: r.title, grade: r.grade, isActive: r.isActive }));
  });
}

export async function createJobPositionAction(data: {
  title: string;
  grade?: string;
}): Promise<JobPositionDto> {
  const session = await requireRole("hr");
  await requireActiveSubscription(session.tenantId);
  const title = data.title.trim();
  if (title.length < 2) throw new Error("Position title must be at least 2 characters.");

  return runAsTenant(session.tenantId, async (tx) => {
    const existing = await tx.jobPosition.findFirst({
      where: { tenantId: session.tenantId, title: { equals: title, mode: "insensitive" } },
    });
    if (existing) throw new Error("A position with this title already exists.");
    const row = await tx.jobPosition.create({
      data: { tenantId: session.tenantId, title, grade: data.grade?.trim() || null },
    });
    return { id: row.id, title: row.title, grade: row.grade, isActive: row.isActive };
  });
}

export async function deleteJobPositionAction(id: string): Promise<{ ok: true }> {
  const session = await requireRole("hr");
  return runAsTenant(session.tenantId, async (tx) => {
    const row = await tx.jobPosition.findFirst({ where: { id, tenantId: session.tenantId } });
    if (!row) throw new Error("Position not found.");
    await tx.jobPosition.delete({ where: { id } });
    return { ok: true };
  });
}

// ---- Cost centres ----

export async function listCostCentresAction(): Promise<CostCentreDto[]> {
  const session = await requireRole("hr", "manager", "exco");
  return runAsTenant(session.tenantId, async (tx) => {
    const rows = await tx.costCentre.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { name: "asc" },
    });
    return rows.map((r) => ({ id: r.id, name: r.name, code: r.code, isActive: r.isActive }));
  });
}

export async function createCostCentreAction(data: {
  name: string;
  code?: string;
}): Promise<CostCentreDto> {
  const session = await requireRole("hr");
  await requireActiveSubscription(session.tenantId);
  const name = data.name.trim();
  if (name.length < 2) throw new Error("Cost centre name must be at least 2 characters.");

  return runAsTenant(session.tenantId, async (tx) => {
    const existing = await tx.costCentre.findFirst({
      where: { tenantId: session.tenantId, name: { equals: name, mode: "insensitive" } },
    });
    if (existing) throw new Error("A cost centre with this name already exists.");
    const row = await tx.costCentre.create({
      data: { tenantId: session.tenantId, name, code: data.code?.trim() || null },
    });
    return { id: row.id, name: row.name, code: row.code, isActive: row.isActive };
  });
}

export async function deleteCostCentreAction(id: string): Promise<{ reassigned: number }> {
  const session = await requireRole("hr");
  return runAsTenant(session.tenantId, async (tx) => {
    const row = await tx.costCentre.findFirst({ where: { id, tenantId: session.tenantId } });
    if (!row) throw new Error("Cost centre not found.");
    // Employees keep working when a cost centre is removed: clear their link.
    const reassigned = await tx.employee.updateMany({
      where: { tenantId: session.tenantId, costCentreId: id },
      data: { costCentreId: null },
    });
    await tx.costCentre.delete({ where: { id } });
    return { reassigned: reassigned.count };
  });
}
