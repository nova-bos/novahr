"use client";

import { AnnouncementsPanel } from "@/components/announcements/announcements-panel";
import { PageHeader } from "@/components/layout/page-header";

export default function AnnouncementsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Announcements"
        description="Company-wide announcements and policies from your HR team."
      />
      <AnnouncementsPanel />
    </div>
  );
}
