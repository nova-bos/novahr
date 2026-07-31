"use server";

import { runAsTenant } from "@/lib/db-context";
import { requireRole, requireUser } from "@/lib/auth/require";
import type { Announcement } from "@/lib/types";

function mapAnnouncement(row: {
  id: string;
  tenantId: string;
  title: string;
  body: string;
  audience: string;
  isPublished: boolean;
  publishedAt: Date | null;
  createdBy: string;
  createdAt: Date;
}): Announcement {
  return {
    id: row.id,
    tenantId: row.tenantId,
    title: row.title,
    body: row.body,
    audience: row.audience as Announcement["audience"],
    isPublished: row.isPublished,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getAnnouncementsAction(): Promise<Announcement[]> {
  const session = await requireUser();
  const tenantId = session.tenantId;
  return runAsTenant(tenantId, async (tx) => {
    const isHrOrExco = session.role === "hr" || session.role === "exco";
    const isManager = session.role === "manager";
    const rows = await tx.announcement.findMany({
      where: {
        tenantId,
        // Non-HR see only published; HR see all (including drafts).
        ...(isHrOrExco ? {} : { isPublished: true }),
        // Employees only see "all" audience; managers see "all" and "managers".
        ...(!isHrOrExco && !isManager ? { audience: "all" } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapAnnouncement);
  });
}

export async function createAnnouncementAction(input: {
  title: string;
  body: string;
  audience: "all" | "managers";
  isPublished: boolean;
}): Promise<Announcement> {
  const session = await requireRole("hr");
  const tenantId = session.tenantId;

  if (!input.title.trim() || !input.body.trim()) {
    throw new Error("Title and body are required.");
  }

  return runAsTenant(tenantId, async (tx) => {
    const row = await tx.announcement.create({
      data: {
        tenantId,
        title: input.title.trim(),
        body: input.body.trim(),
        audience: input.audience,
        isPublished: input.isPublished,
        publishedAt: input.isPublished ? new Date() : null,
        createdBy: session.name,
      },
    });
    return mapAnnouncement(row);
  });
}

export async function updateAnnouncementAction(
  id: string,
  input: Partial<Pick<Announcement, "title" | "body" | "audience" | "isPublished">>
): Promise<Announcement> {
  const session = await requireRole("hr");
  const tenantId = session.tenantId;
  return runAsTenant(tenantId, async (tx) => {
    const existing = await tx.announcement.findFirst({ where: { id, tenantId } });
    if (!existing) throw new Error("Announcement not found.");

    const willPublish = input.isPublished && !existing.isPublished;
    const row = await tx.announcement.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.body !== undefined ? { body: input.body.trim() } : {}),
        ...(input.audience !== undefined ? { audience: input.audience } : {}),
        ...(input.isPublished !== undefined ? { isPublished: input.isPublished } : {}),
        ...(willPublish ? { publishedAt: new Date() } : {}),
      },
    });
    return mapAnnouncement(row);
  });
}

export async function deleteAnnouncementAction(id: string): Promise<void> {
  const session = await requireRole("hr");
  const tenantId = session.tenantId;
  return runAsTenant(tenantId, async (tx) => {
    const existing = await tx.announcement.findFirst({ where: { id, tenantId } });
    if (!existing) throw new Error("Announcement not found.");
    await tx.announcement.delete({ where: { id } });
  });
}
