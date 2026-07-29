"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require";
import { getInitials } from "@/lib/format";

export async function updateUserProfileAction(data: {
  name: string;
  title: string;
  avatarColor: string;
}): Promise<{ success: boolean; error?: string }> {
  const session = await requireUser();
  await prisma.user.update({
    where: { id: session.id },
    data: {
      name: data.name.trim(),
      title: data.title.trim(),
      avatarColor: data.avatarColor,
      initials: getInitials(
        data.name.split(" ")[0] ?? "",
        data.name.split(" ").slice(1).join(" ") ?? ""
      ),
    },
  });
  return { success: true };
}

const DEFAULT_NOTIFICATION_PREFS = {
  leaveRequests: true,
  leaveDecisions: true,
  payrollReminders: true,
  payslipsPublished: true,
  onboardingUpdates: true,
  weeklyDigest: false,
};

export type NotificationPreferences = typeof DEFAULT_NOTIFICATION_PREFS;

export async function getNotificationPreferencesAction(): Promise<NotificationPreferences> {
  const session = await requireUser();
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { notificationPreferences: true },
  });
  if (!user?.notificationPreferences || typeof user.notificationPreferences !== "object") {
    return DEFAULT_NOTIFICATION_PREFS;
  }
  return { ...DEFAULT_NOTIFICATION_PREFS, ...(user.notificationPreferences as Partial<NotificationPreferences>) };
}

export async function updateNotificationPreferencesAction(
  prefs: NotificationPreferences
): Promise<{ success: boolean }> {
  const session = await requireUser();
  await prisma.user.update({
    where: { id: session.id },
    data: { notificationPreferences: prefs },
  });
  return { success: true };
}

export async function sendPasswordResetAction(): Promise<{ success: boolean; error?: string }> {
  const session = await requireUser();
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const email = userData.user?.email ?? session.email;
  if (!email) return { success: false, error: "Could not determine email." };
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://hr.novabos.co.za";
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/reset-password`,
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}
