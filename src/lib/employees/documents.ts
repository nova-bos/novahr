"use server";

import type { EmployeeDocumentCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole, requireEmployeeScope } from "@/lib/auth/require";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "employee-documents";
const SIGNED_URL_TTL_SECONDS = 60;
const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

const CATEGORIES: EmployeeDocumentCategory[] = [
  "contract",
  "id_document",
  "qualification",
  "certificate",
  "disciplinary",
  "medical",
  "other",
];

export interface EmployeeDocumentRow {
  id: string;
  employeeId: string;
  name: string;
  category: EmployeeDocumentCategory;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  expiresAt: string | null;
  uploadedBy: string | null;
  createdAt: string;
}

function mapDoc(d: {
  id: string;
  employeeId: string;
  name: string;
  category: EmployeeDocumentCategory;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  expiresAt: Date | null;
  uploadedBy: string | null;
  createdAt: Date;
}): EmployeeDocumentRow {
  return {
    id: d.id,
    employeeId: d.employeeId,
    name: d.name,
    category: d.category,
    fileName: d.fileName,
    mimeType: d.mimeType,
    sizeBytes: d.sizeBytes,
    expiresAt: d.expiresAt ? d.expiresAt.toISOString() : null,
    uploadedBy: d.uploadedBy,
    createdAt: d.createdAt.toISOString(),
  };
}

/**
 * Lists an employee's documents (metadata only, no file bytes or URLs).
 * Visible to the employee, their manager, and HR via requireEmployeeScope.
 */
export async function listEmployeeDocuments(
  employeeId: string
): Promise<EmployeeDocumentRow[]> {
  const user = await requireEmployeeScope(employeeId);
  const docs = await prisma.employeeDocument.findMany({
    where: { employeeId, tenantId: user.tenantId },
    orderBy: { createdAt: "desc" },
  });
  return docs.map(mapDoc);
}

/**
 * Uploads a document to the private bucket and records it. HR only: the vault
 * holds employer records (contracts, disciplinary, certificates). Bytes are
 * streamed via a service-role client because the bucket is private and this
 * app enforces isolation in application code, not storage RLS.
 */
export async function uploadEmployeeDocument(
  formData: FormData
): Promise<{ document?: EmployeeDocumentRow; error?: string }> {
  const employeeId = String(formData.get("employeeId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const categoryRaw = String(formData.get("category") ?? "other");
  const expiresAtRaw = String(formData.get("expiresAt") ?? "").trim();
  const file = formData.get("file");

  const session = await requireRole("hr");
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, tenantId: session.tenantId },
    select: { id: true },
  });
  if (!employee) return { error: "Employee not found." };
  if (!name) return { error: "A document name is required." };
  if (!(file instanceof File) || file.size === 0) return { error: "Please choose a file." };
  if (file.size > MAX_BYTES) return { error: "File is too large (max 15 MB)." };

  const category = (CATEGORIES as string[]).includes(categoryRaw)
    ? (categoryRaw as EmployeeDocumentCategory)
    : "other";
  const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    return { error: "The expiry date is invalid." };
  }

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const path = `${session.tenantId}/${employeeId}/${crypto.randomUUID()}.${ext}`;

  const supabase = createAdminClient();
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
  if (uploadError) return { error: "Upload failed. Please try again." };

  const created = await prisma.employeeDocument.create({
    data: {
      tenantId: session.tenantId,
      employeeId,
      name,
      category,
      storagePath: path,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      expiresAt,
      uploadedBy: session.name ?? null,
    },
  });
  return { document: mapDoc(created) };
}

/**
 * Returns a short-lived signed URL to open a document. Access is gated by
 * requireEmployeeScope; the storage path is read server-side, never trusted
 * from the client.
 */
export async function getEmployeeDocumentUrl(
  documentId: string
): Promise<{ url?: string; error?: string }> {
  const doc = await prisma.employeeDocument.findUnique({
    where: { id: documentId },
    select: { employeeId: true, tenantId: true, storagePath: true },
  });
  if (!doc) return { error: "Document not found." };
  const user = await requireEmployeeScope(doc.employeeId);
  if (doc.tenantId !== user.tenantId) return { error: "Document not found." };

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(doc.storagePath, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) return { error: "Could not open the document." };
  return { url: data.signedUrl };
}

/** Deletes a document and its stored file. HR only. */
export async function deleteEmployeeDocument(
  documentId: string
): Promise<{ ok?: boolean; error?: string }> {
  const session = await requireRole("hr");
  const doc = await prisma.employeeDocument.findFirst({
    where: { id: documentId, tenantId: session.tenantId },
    select: { id: true, storagePath: true },
  });
  if (!doc) return { error: "Document not found." };

  const supabase = createAdminClient();
  await supabase.storage.from(BUCKET).remove([doc.storagePath]);
  await prisma.employeeDocument.delete({ where: { id: doc.id } });
  return { ok: true };
}
