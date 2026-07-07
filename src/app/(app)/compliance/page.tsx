"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { PlanGate } from "@/components/layout/plan-gate";
import { useRoleGuard } from "@/lib/auth/use-role-guard";
import { useAuth } from "@/lib/auth/auth-provider";
import {
  getComplianceRecordsAction,
  getCurrentMonthComplianceAction,
  getEmp201Action,
} from "@/lib/compliance/actions";
import { ComplianceOverviewCards } from "@/components/compliance/compliance-overview-cards";
import { ComplianceRecordsTable } from "@/components/compliance/compliance-records-table";
import { Emp201Panel } from "@/components/compliance/emp201-panel";
import { Emp501Panel } from "@/components/compliance/emp501-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [emp201, setEmp201] = useState<ComplianceRecordRow | null>(null);
  const [records, setRecords] = useState<ComplianceRecordRow[]>([]);
  const [loading, setLoading] = useState(true);

  const period = getCurrentPeriod();

  useEffect(() => {
    if (!user?.tenantId) return;
    setLoading(true);
    Promise.all([
      getCurrentMonthComplianceAction(user.tenantId),
      getComplianceRecordsAction(user.tenantId),
      getEmp201Action(user.tenantId, period),
    ])
      .then(([current, all, emp]) => {
        setPaye(current.paye);
        setUif(current.uif);
        setSdl(current.sdl);
        setRecords(all);
        setEmp201(emp);
      })
      .finally(() => setLoading(false));
  }, [user?.tenantId, period]);

  function handleRecordUpdated(updated: ComplianceRecordRow) {
    // Refresh the relevant overview card
    if (updated.type === "paye_return" && updated.period === period) setPaye(updated);
    if (updated.type === "uif_return" && updated.period === period) setUif(updated);
    if (updated.type === "sdl_return" && updated.period === period) setSdl(updated);
    if (updated.type === "emp201" && updated.period === period) setEmp201(updated);

    // Update the records table in place, inserting the EMP201 if it is new
    setRecords((prev) =>
      prev.some((r) => r.id === updated.id)
        ? prev.map((r) => (r.id === updated.id ? updated : r))
        : [updated, ...prev]
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
          <Tabs defaultValue="monthly">
            <TabsList>
              <TabsTrigger value="monthly">Monthly (EMP201)</TabsTrigger>
              <TabsTrigger value="year-end">Year-end (IRP5 / EMP501)</TabsTrigger>
            </TabsList>
            <TabsContent value="monthly" className="mt-4 flex flex-col gap-6">
              {user?.tenantId && (
                <Emp201Panel
                  tenantId={user.tenantId}
                  period={period}
                  record={emp201}
                  onChanged={handleRecordUpdated}
                />
              )}
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
            </TabsContent>
            <TabsContent value="year-end" className="mt-4">
              {user?.tenantId && <Emp501Panel tenantId={user.tenantId} />}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </PlanGate>
  );
}
