"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type { AppUser } from "./types";

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
  };
}
