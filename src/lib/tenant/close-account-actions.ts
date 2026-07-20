"use server";

import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/require";

export interface CloseAccountResult {
  success: boolean;
  error?: string;
}

/**
 * Permanently closes the current company account. Only an HR administrator can
 * do this. It deletes the tenant (which cascades to every employee, payroll
 * run, leave record and user), then removes the Supabase auth identities so the
 * email addresses are free to be used again. This is the self-service side of
 * the POPIA right to deletion.
 */
export async function closeTenantAccount(confirmation: string): Promise<CloseAccountResult> {
  const session = await requireRole("hr");
  const tenantId = session.tenantId;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true },
  });
  if (!tenant) return { success: false, error: "Account not found." };

  if (confirmation.trim() !== tenant.name.trim()) {
    return { success: false, error: "The name you typed does not match your company name." };
  }

  // Capture the auth user ids before the cascade removes the User rows.
  const users = await prisma.user.findMany({ where: { tenantId }, select: { id: true } });

  // Deleting the tenant cascades to users, employees, payroll and everything else.
  await prisma.tenant.delete({ where: { id: tenantId } });

  // Best-effort removal of the login identities so the emails can be reused.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && serviceKey) {
    const admin = createSupabaseAdminClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    for (const u of users) {
      try {
        await admin.auth.admin.deleteUser(u.id);
      } catch {
        // Non-fatal: the tenant data is already gone. A leftover auth user only
        // blocks reusing that exact email, which support can clear if needed.
      }
    }
  }

  return { success: true };
}
