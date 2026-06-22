"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { PlanGate } from "@/components/layout/plan-gate";
import { useRoleGuard } from "@/lib/auth/use-role-guard";
import { useAuth } from "@/lib/auth/auth-provider";
import {
  getComplianceRecordsAction,
  getCurrentMonthComplianceAction,
} from "@/lib/compliance/actions";
import { ComplianceOverviewCards } from "@/components/compliance/compliance-overview-cards";
import { ComplianceRecordsTable } from "@/components/compliance/compliance-records-table";
import type { ComplianceRecordRow } from "@/lib/compliance/actions";

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function CompliancePage() {
  const allowed = useRoleGuard(["hr", "exco"]);
  const { user } = useAuth();

  const [paye, setPaye] = useState<ComplianceRecordRow | null>(null);
  const [uif, setUif] = useState<ComplianceRecordRow | null>(null);
  const [sdl, setSdl] = useState<ComplianceRecordRow | null>(null);
  const [records, setRecords] = useState<ComplianceRecordRow[]>([]);
  const [loading, setLoading] = useState(true);

  const period = getCurrentPeriod();

  useEffect(() => {
    if (!user?.tenantId) return;
    setLoading(true);
    Promise.all([
      getCurrentMonthComplianceAction(user.tenantId),
      getComplianceRecordsAction(user.tenantId),
    ])
      .then(([current, all]) => {
        setPaye(current.paye);
        setUif(current.uif);
        setSdl(current.sdl);
        setRecords(all);
      })
      .finally(() => setLoading(false));
  }, [user?.tenantId]);

  function handleRecordUpdated(updated: ComplianceRecordRow) {
    // Refresh the relevant overview card
    if (updated.type === "paye_return" && updated.period === period) setPaye(updated);
    if (updated.type === "uif_return" && updated.period === period) setUif(updated);
    if (updated.type === "sdl_return" && updated.period === period) setSdl(updated);

    // Update the records table in place
    setRecords((prev) =>
      prev.map((r) => (r.id === updated.id ? updated : r))
    );
  }

  if (!allowed) return null;

  return (
    <PlanGate feature="compliance">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Compliance"
          description="Track PAYE, UIF and SDL returns for your organisation."
        />
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading compliance data...</div>
        ) : (
          <>
            <ComplianceOverviewCards
              paye={paye}
              uif={uif}
              sdl={sdl}
              period={period}
              onRecordUpdated={handleRecordUpdated}
            />
            <ComplianceRecordsTable
              records={records}
              onRecordUpdated={handleRecordUpdated}
            />
          </>
        )}
      </div>
    </PlanGate>
  );
}
