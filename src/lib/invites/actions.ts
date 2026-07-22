"use server";

import { createHash, randomBytes } from "crypto";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { runAsTenant } from "@/lib/db-context";
import { checkRateLimit, clientKey } from "@/lib/security/rate-limit";
import { requireRole } from "@/lib/auth/require";
import { sendInviteEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/app-url";
import type { UserRole } from "@prisma/client";

const INVITE_TTL_DAYS = 7;

const ROLE_LABELS: Record<UserRole, string> = {
  hr: "an HR administrator",
  manager: "a manager",
  employee: "an employee",
  exco: "an executive",
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface InviteRow {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: "pending" | "accepted" | "revoked" | "expired";
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
}

export interface TenantUserRow {
  id: string;
  name: string;
  email: string;
  title: string;
  role: UserRole;
  initials: string;
  avatarColor: string;
  employeeId?: string;
}

function mapInvite(row: {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: "pending" | "accepted" | "revoked";
  invitedBy: string;
  createdAt: Date;
  expiresAt: Date;
}): InviteRow {
  const expired = row.status === "pending" && row.expiresAt < new Date();
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    status: expired ? "expired" : row.status,
    invitedBy: row.invitedBy,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
  };
}

const createInviteSchema = z.object({
  email: z.email("Enter a valid email address"),
  name: z.string().min(2, "Name is required"),
  role: z.enum(["hr", "manager", "employee", "exco"]),
  employeeId: z.string().optional(),
});

/**
 * Creates an invite and emails a one-time link. The raw token is only
 * embedded in the email link (and returned so the inviter can copy it when
 * email sending is not configured); the database stores a SHA-256 hash.
 */
export async function createInviteAction(input: {
  email: string;
  name: string;
  role: UserRole;
  employeeId?: string;
}): Promise<{ invite?: InviteRow; inviteUrl?: string; emailSent?: boolean; error?: string }> {
  const session = await requireRole("hr");

  const inviteRate = checkRateLimit(session.tenantId, { name: "invite-create", limit: 20, windowMs: 60 * 60 * 1000 });
  if (!inviteRate.allowed) {
    return { error: "Too many invitations sent. Try again in a few minutes." };
  }

  const parsed = createInviteSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { email, name, role, employeeId } = parsed.data;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return { error: "A user with this email already exists." };
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  const row = await runAsTenant(session.tenantId, async (tx) => {
    // Supersede any previous pending invite for the same address.
    await tx.invite.updateMany({
      where: { tenantId: session.tenantId, email, status: "pending" },
      data: { status: "revoked" },
    });
    return tx.invite.create({
      data: {
        tenantId: session.tenantId,
        email,
        name,
        role,
        employeeId,
        tokenHash,
        invitedBy: session.name,
        expiresAt,
      },
    });
  });

  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: session.tenantId },
    select: { name: true },
  });

  const appUrl = await getAppUrl();
  const inviteUrl = `${appUrl}/accept-invite/${token}`;

  const emailSent = await sendInviteEmail({
    recipientEmail: email,
    recipientName: name,
    inviterName: session.name,
    companyName: tenant.name,
    roleLabel: ROLE_LABELS[role],
    inviteUrl,
  });

  return { invite: mapInvite(row), inviteUrl, emailSent };
}

export async function listInvitesAction(): Promise<InviteRow[]> {
  const session = await requireRole("hr");
  const rows = await runAsTenant(session.tenantId, (tx) =>
    tx.invite.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { createdAt: "desc" },
    })
  );
  return rows.map(mapInvite);
}

/**
 * Regenerates the invite link for an existing pending invite and returns the
 * new URL. The old token is invalidated. Used when HR needs to copy the link
 * manually because email delivery is unavailable.
 */
export async function getInviteLinkAction(
  id: string
): Promise<{ inviteUrl?: string; error?: string }> {
  const session = await requireRole("hr");

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  const updated = await runAsTenant(session.tenantId, (tx) =>
    tx.invite.updateMany({
      where: { id, tenantId: session.tenantId, status: "pending" },
      data: { tokenHash, expiresAt },
    })
  );

  if (updated.count === 0) return { error: "Invite not found or already used." };

  const appUrl = await getAppUrl();
  return { inviteUrl: `${appUrl}/accept-invite/${token}` };
}

export async function revokeInviteAction(id: string): Promise<{ success: boolean }> {
  const session = await requireRole("hr");
  const revoked = await runAsTenant(session.tenantId, (tx) =>
    tx.invite.updateMany({
      where: { id, tenantId: session.tenantId },
      data: { status: "revoked" },
    })
  );
  if (revoked.count === 0) throw new Error("Invite not found.");
  return { success: true };
}

export async function removeUserAccessAction(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await requireRole("hr");

  if (userId === session.id) return { success: false, error: "You cannot remove your own access." };

  const existing = await prisma.user.findFirst({
    where: { id: userId, tenantId: session.tenantId },
  });
  if (!existing) return { success: false, error: "User not found." };

  await prisma.user.delete({ where: { id: userId } });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (serviceKey && supabaseUrl) {
    const admin = createSupabaseAdminClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    await admin.auth.admin.deleteUser(userId);
  }

  return { success: true };
}

export async function updateUserRoleAction(
  userId: string,
  role: UserRole
): Promise<{ success: boolean; error?: string }> {
  const session = await requireRole("hr");

  if (userId === session.id) return { success: false, error: "You cannot change your own role." };

  const updated = await runAsTenant(session.tenantId, (tx) =>
    tx.user.updateMany({ where: { id: userId, tenantId: session.tenantId }, data: { role } })
  );

  if (updated.count === 0) return { success: false, error: "User not found." };
  return { success: true };
}

export async function listTenantUsersAction(): Promise<TenantUserRow[]> {
  const session = await requireRole("hr");
  const rows = await prisma.user.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    title: u.title,
    role: u.role,
    initials: u.initials,
    avatarColor: u.avatarColor,
    employeeId: u.employeeId ?? undefined,
  }));
}

export interface PublicInviteInfo {
  name: string;
  email: string;
  role: UserRole;
  companyName: string;
}

/** Public: resolves an invite token into display info for the accept page. */
export async function getInviteByTokenAction(
  token: string
): Promise<{ invite?: PublicInviteInfo; error?: string }> {
  const lookupRate = checkRateLimit(await clientKey(), { name: "invite-lookup", limit: 20, windowMs: 10 * 60 * 1000 });
  if (!lookupRate.allowed) {
    return { error: "Too many attempts. Please wait a few minutes and try again." };
  }
  const row = await prisma.invite.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { tenant: { select: { name: true } } },
  });

  if (!row || row.status === "revoked") return { error: "This invitation is no longer valid." };
  if (row.status === "accepted") return { error: "This invitation has already been used." };
  if (row.expiresAt < new Date()) return { error: "This invitation has expired. Ask your administrator to send a new one." };

  return {
    invite: {
      name: row.name,
      email: row.email,
      role: row.role,
      companyName: row.tenant.name,
    },
  };
}

const acceptInviteSchema = z.object({
  token: z.string().min(10),
  name: z.string().min(2, "Your name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

/**
 * Public: accepts an invite by creating a confirmed Supabase Auth user
 * (via the service role, so no email round trip is needed) plus the tenant
 * `User` row. The caller then signs in with the chosen password.
 */
export async function acceptInviteAction(input: {
  token: string;
  name: string;
  password: string;
}): Promise<{ status: "success"; email: string } | { status: "error"; message: string }> {
  const acceptRate = checkRateLimit(await clientKey(), { name: "invite-accept", limit: 10, windowMs: 10 * 60 * 1000 });
  if (!acceptRate.allowed) {
    return { status: "error", message: "Too many attempts. Please wait a few minutes and try again." };
  }

  const parsed = acceptInviteSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { token, name, password } = parsed.data;

  const row = await prisma.invite.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!row || row.status !== "pending" || row.expiresAt < new Date()) {
    return { status: "error", message: "This invitation is no longer valid." };
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !supabaseUrl) {
    return {
      status: "error",
      message: "Account provisioning is not configured. Contact your administrator.",
    };
  }

  const admin = createSupabaseAdminClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin.auth.admin.createUser({
    email: row.email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    return {
      status: "error",
      message: error?.message ?? "Couldn't create your account. Please try again.",
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.create({
      data: {
        id: data.user.id,
        tenantId: row.tenantId,
        email: row.email,
        name,
        title: row.role === "hr" ? "HR Administrator" : "Team member",
        role: row.role,
        employeeId: row.employeeId,
        avatarColor: "#4C6FFF",
        initials: deriveInitials(name),
      },
    });
    await tx.invite.update({
      where: { id: row.id },
      data: { status: "accepted", acceptedAt: new Date() },
    });
  });

  return { status: "success", email: row.email };
}

function deriveInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "??";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
