"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, clientKey } from "@/lib/security/rate-limit";
import type { AppUser } from "./types";

/**
 * Signs out the current session server-side so the auth cookie is cleared in
 * the server action response before the client navigates away. This prevents
 * the middleware from redirecting a stale cookie back to /dashboard.
 */
export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

/**
 * Server-side throttle for password sign-in, called before Supabase Auth is
 * hit so brute-force guessing is slowed even though sign-in runs client-side.
 * Keyed by client IP when available, otherwise the submitted email. Returns a
 * friendly message when the caller is over the limit, or `null` to proceed.
 */
export async function throttleLogin(email: string): Promise<string | null> {
  const ip = await clientKey();
  const key = ip !== "unknown" ? ip : email.trim().toLowerCase();
  const rate = await checkRateLimit(key, { name: "login", limit: 10, windowMs: 60 * 1000 });
  if (!rate.allowed) {
    return "Too many sign-in attempts. Please wait a minute and try again.";
  }
  return null;
}

/**
 * Loads the signed-in user's profile (the `User` row keyed by the Supabase
 * `auth.users.id`). Returns `null` if there is no session or the profile
 * row doesn't exist yet (e.g. signup is still in progress).
 */
export async function getCurrentUserProfile(): Promise<AppUser | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const profile = await prisma.user.findUnique({ where: { id: data.user.id } });
  if (!profile) return null;

  return {
    id: profile.id,
    role: profile.role,
    name: profile.name,
    title: profile.title,
    email: profile.email,
    tenantId: profile.tenantId,
    employeeId: profile.employeeId ?? undefined,
    avatarColor: profile.avatarColor,
    initials: profile.initials,
    branchScopeId: profile.branchScopeId ?? undefined,
  };
}
