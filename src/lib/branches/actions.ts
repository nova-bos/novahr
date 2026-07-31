"use server";

import { runAsTenant } from "@/lib/db-context";
import { requireRole, requireActiveSubscription } from "@/lib/auth/require";
import { mapBranch } from "@/lib/workspace/mappers";
import type { Branch } from "@/lib/types";

export async function createBranchRecord(data: {
  name: string;
  code?: string;
  address?: string;
  city?: string;
  isDefault?: boolean;
}): Promise<Branch> {
  const session = await requireRole("hr");
  await requireActiveSubscription(session.tenantId);
  const name = data.name.trim();
  if (name.length < 2) throw new Error("Branch name must be at least 2 characters.");

  return runAsTenant(session.tenantId, async (tx) => {
    const existing = await tx.branch.findFirst({
      where: { tenantId: session.tenantId, name: { equals: name, mode: "insensitive" } },
    });
    if (existing) throw new Error("A branch with this name already exists.");

    // The first branch a tenant creates becomes the default unless told otherwise.
    const count = await tx.branch.count({ where: { tenantId: session.tenantId } });
    const isDefault = data.isDefault ?? count === 0;
    if (isDefault) {
      await tx.branch.updateMany({
        where: { tenantId: session.tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const row = await tx.branch.create({
      data: {
        tenantId: session.tenantId,
        name,
        code: data.code?.trim() || null,
        address: data.address?.trim() || null,
        city: data.city?.trim() || null,
        isDefault,
      },
    });
    return mapBranch(row);
  });
}

export async function updateBranchRecord(
  id: string,
  data: {
    name?: string;
    code?: string | null;
    address?: string | null;
    city?: string | null;
    isDefault?: boolean;
    isActive?: boolean;
  }
): Promise<Branch> {
  const session = await requireRole("hr");
  await requireActiveSubscription(session.tenantId);

  return runAsTenant(session.tenantId, async (tx) => {
    const existing = await tx.branch.findFirst({
      where: { id, tenantId: session.tenantId },
      select: { id: true },
    });
    if (!existing) throw new Error("Branch not found.");

    if (data.name !== undefined) {
      const name = data.name.trim();
      if (name.length < 2) throw new Error("Branch name must be at least 2 characters.");
      const clash = await tx.branch.findFirst({
        where: {
          tenantId: session.tenantId,
          name: { equals: name, mode: "insensitive" },
          id: { not: id },
        },
        select: { id: true },
      });
      if (clash) throw new Error("A branch with this name already exists.");
    }

    if (data.isDefault === true) {
      await tx.branch.updateMany({
        where: { tenantId: session.tenantId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const row = await tx.branch.update({
      where: { id },
      data: {
        name: data.name?.trim(),
        code: data.code === undefined ? undefined : data.code?.trim() || null,
        address: data.address === undefined ? undefined : data.address?.trim() || null,
        city: data.city === undefined ? undefined : data.city?.trim() || null,
        isDefault: data.isDefault,
        isActive: data.isActive,
      },
    });
    return mapBranch(row);
  });
}

/**
 * Deactivates a branch. Additive and non-destructive: employees keep their
 * branchId and a null-branch payroll run still includes them, so nothing breaks.
 * We do not delete so that historical payroll runs referencing the branch stay
 * intelligible.
 */
export async function deactivateBranchRecord(id: string): Promise<Branch> {
  return updateBranchRecord(id, { isActive: false });
}
