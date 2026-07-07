"use server";

import { prisma } from "@/lib/prisma";
import { requireUser, requireEmployeeScope } from "@/lib/auth/require";
import { createClient } from "@/lib/supabase/server";

const LEAVE_DOC_BUCKET = "leave-documents";
// Signed URLs are short-lived: long enough to open the document once, short
// enough that a leaked link is useless minutes later.
const SIGNED_URL_TTL_SECONDS = 60;

export interface LeaveDocumentUrlResult {
  url?: string;
  error?: string;
}

/**
 * Returns a short-lived signed URL for a leave request's supporting document.
 *
 * Leave documents (medical certificates and the like) live in a PRIVATE
 * Supabase Storage bucket, so a public URL is never stored or handed out. The
 * caller passes only the leave request id; the stored object path is read
 * server-side from the database, never trusted from the client, and access is
 * gated by `requireEmployeeScope` so only the employee, their manager, or HR
 * can open it.
 */
export async function getLeaveDocumentUrl(
  leaveRequestId: string
): Promise<LeaveDocumentUrlResult> {
  const user = await requireUser();

  const request = await prisma.leaveRequest.findFirst({
    where: { id: leaveRequestId, tenantId: user.tenantId },
    select: { employeeId: true, documentUrl: true },
  });

  if (!request || !request.documentUrl) {
    return { error: "This request has no supporting document." };
  }

  // Authorize against the request's employee (HR any, manager for reports,
  // employee for themselves). Throws if the caller is out of scope.
  await requireEmployeeScope(request.employeeId);

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(LEAVE_DOC_BUCKET)
    .createSignedUrl(request.documentUrl, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    return { error: "Could not open the document. Please try again." };
  }

  return { url: data.signedUrl };
}
