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
