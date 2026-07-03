import "server-only";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@prisma/client";

export interface SessionUser {
  id: string;
  tenantId: string;
  role: UserRole;
  name: string;
  email: string;
  employeeId?: string;
}

/**
 * Resolves the signed-in user from the Supabase session cookie and loads
 * their profile row. Throws if there is no valid session.
 *
 * Every server action that reads or writes tenant data MUST call this (or
 * `requireRole`) and use the returned `tenantId`. Never trust a tenantId
 * passed in from the client.
 */
export async function requireUser(): Promise<SessionUser> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error("Not authenticated");
  }

  const profile = await prisma.user.findUnique({ where: { id: data.user.id } });
  if (!profile) {
    throw new Error("No profile for this account");
  }

  return {
    id: profile.id,
    tenantId: profile.tenantId,
    role: profile.role,
    name: profile.name,
    email: profile.email,
    employeeId: profile.employeeId ?? undefined,
  };
}

/**
 * Like `requireUser`, but also asserts the user holds one of `roles`.
 */
export async function requireRole(...roles: UserRole[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    throw new Error("Not authorized");
  }
  return user;
}

/**
 * Verifies the session user belongs to `tenantId` (and optionally holds one
 * of `roles`). Use in actions whose public signature still accepts a
 * tenantId from the client: the value is only trusted after this check.
 */
export async function requireTenant(tenantId: string, ...roles: UserRole[]): Promise<SessionUser> {
  const user = roles.length > 0 ? await requireRole(...roles) : await requireUser();
  if (user.tenantId !== tenantId) {
    throw new Error("Not authorized for this tenant");
  }
  return user;
}

/**
 * Asserts the current user may act on behalf of `employeeId`:
 * HR always can, managers can for themselves and their direct reports,
 * employees only for themselves.
 */
export async function requireEmployeeScope(employeeId: string): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role === "hr" || user.role === "exco") {
    // HR and exco act across their own tenant only; verify the target
    // employee actually belongs to it before granting scope.
    const inTenant = await prisma.employee.findFirst({
      where: { id: employeeId, tenantId: user.tenantId },
      select: { id: true },
    });
    if (inTenant) return user;
    throw new Error("Not authorized for this employee");
  }
  if (user.employeeId === employeeId) return user;

  if (user.role === "manager") {
    const report = await prisma.employee.findFirst({
      where: { id: employeeId, tenantId: user.tenantId, managerId: user.employeeId },
      select: { id: true },
    });
    if (report) return user;
  }

  throw new Error("Not authorized for this employee");
}
