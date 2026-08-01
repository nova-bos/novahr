"use server";

import type { EmployeeDocumentCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole, requireEmployeeScope, requireUser } from "@/lib/auth/require";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "employee-documents";
const SIGNED_URL_TTL_SECONDS = 60;
const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

// Mirrors the bucket's allowed_mime_types so the user gets a clear error
// instead of a generic storage rejection.
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

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
  version: number;
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
  version: number;
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
    version: d.version,
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
    where: { employeeId, tenantId: user.tenantId, isCurrent: true },
    orderBy: { createdAt: "desc" },
  });
  return docs.map(mapDoc);
}

/**
 * Returns every version of a document (the given current version plus its
 * superseded predecessors), newest first. Scoped like the document itself.
 */
export async function listEmployeeDocumentVersions(
  documentId: string
): Promise<EmployeeDocumentRow[]> {
  const user = await requireUser();
  const current = await prisma.employeeDocument.findFirst({
    where: { id: documentId, tenantId: user.tenantId },
    select: { employeeId: true, name: true, category: true },
  });
  if (!current) return [];
  await requireEmployeeScope(current.employeeId);
  const docs = await prisma.employeeDocument.findMany({
    where: {
      tenantId: user.tenantId,
      employeeId: current.employeeId,
      name: current.name,
      category: current.category,
    },
    orderBy: { version: "desc" },
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
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return { error: "Unsupported file type. Use PDF, Word, Excel, or an image (JPEG, PNG, WebP)." };
  }

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

  // Auto-version: if a current document with the same name and category already
  // exists for this employee, this upload becomes its next version and the old
  // one is retained as history (isCurrent = false).
  const prior = await prisma.employeeDocument.findFirst({
    where: {
      tenantId: session.tenantId,
      employeeId,
      category,
      name: { equals: name, mode: "insensitive" },
      isCurrent: true,
    },
    orderBy: { version: "desc" },
    select: { id: true, version: true },
  });

  const created = await prisma.$transaction(async (tx) => {
    if (prior) {
      await tx.employeeDocument.update({
        where: { id: prior.id },
        data: { isCurrent: false },
      });
    }
    return tx.employeeDocument.create({
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
        version: prior ? prior.version + 1 : 1,
        isCurrent: true,
        previousVersionId: prior?.id ?? null,
      },
    });
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
  // Scope the lookup by tenantId in the query itself (defence in depth), not
  // only via a post-fetch guard, so the row can never be fetched across tenants.
  const user = await requireUser();
  const doc = await prisma.employeeDocument.findFirst({
    where: { id: documentId, tenantId: user.tenantId },
    select: { employeeId: true, storagePath: true },
  });
  if (!doc) return { error: "Document not found." };
  await requireEmployeeScope(doc.employeeId);

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
    select: { id: true, storagePath: true, isCurrent: true, previousVersionId: true },
  });
  if (!doc) return { error: "Document not found." };

  const supabase = createAdminClient();
  await supabase.storage.from(BUCKET).remove([doc.storagePath]);
  await prisma.$transaction(async (tx) => {
    // If the current version is deleted, promote its predecessor so the document
    // still appears in the list with its history intact.
    if (doc.isCurrent && doc.previousVersionId) {
      await tx.employeeDocument.updateMany({
        where: { id: doc.previousVersionId, tenantId: session.tenantId },
        data: { isCurrent: true },
      });
    }
    await tx.employeeDocument.deleteMany({ where: { id: doc.id, tenantId: session.tenantId } });
  });
  return { ok: true };
}
