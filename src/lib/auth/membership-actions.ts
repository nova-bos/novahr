"use server";

import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "./require";

export interface TenantMembershipDto {
  tenantId: string;
  tenantName: string;
  role: UserRole;
  isActive: boolean;
}

/** The tenants (workspaces) the signed-in user can access, active one flagged. */
export async function listMyTenantsAction(): Promise<TenantMembershipDto[]> {
  const user = await requireUser();
  const memberships = await prisma.tenantMembership.findMany({
    where: { userId: user.id },
    include: { tenant: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });
  return memberships.map((m) => ({
    tenantId: m.tenantId,
    tenantName: m.tenant.name,
    role: m.role,
    isActive: m.tenantId === user.tenantId,
  }));
}

/**
 * Switches the active workspace by copying the chosen membership onto the User
 * row (the active context every scoped query reads). Only tenants the user is a
 * member of are allowed. The caller should reload after this resolves.
 */
export async function switchTenantAction(tenantId: string): Promise<{ ok: true }> {
  const user = await requireUser();
  if (tenantId === user.tenantId) return { ok: true };

  const membership = await prisma.tenantMembership.findUnique({
    where: { userId_tenantId: { userId: user.id, tenantId } },
  });
  if (!membership) throw new Error("You do not have access to this workspace.");

  await prisma.user.update({
    where: { id: user.id },
    data: {
      tenantId: membership.tenantId,
      role: membership.role,
      employeeId: membership.employeeId,
      branchScopeId: membership.branchScopeId,
      ...(membership.title ? { title: membership.title } : {}),
    },
  });
  return { ok: true };
}
