"use client";

import { useEffect, useRef, useState } from "react";
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
import { CoidaPanel } from "@/components/compliance/coida-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ComplianceRecordRow } from "@/lib/compliance/actions";

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

interface ComplianceCache {
  tenantId: string;
  period: string;
  paye: ComplianceRecordRow | null;
  uif: ComplianceRecordRow | null;
  sdl: ComplianceRecordRow | null;
  emp201: ComplianceRecordRow | null;
  records: ComplianceRecordRow[];
}

let _cache: ComplianceCache | null = null;

export default function CompliancePage() {
  const allowed = useRoleGuard(["hr", "exco"]);
  if (!allowed) return null;
  return <ComplianceContent />;
}

function ComplianceContent() {
  const { user } = useAuth();

  const period = getCurrentPeriod();
  const cached = _cache?.tenantId === user?.tenantId && _cache?.period === period ? _cache : null;

  const [paye, setPaye] = useState<ComplianceRecordRow | null>(cached?.paye ?? null);
  const [uif, setUif] = useState<ComplianceRecordRow | null>(cached?.uif ?? null);
  const [sdl, setSdl] = useState<ComplianceRecordRow | null>(cached?.sdl ?? null);
  const [emp201, setEmp201] = useState<ComplianceRecordRow | null>(cached?.emp201 ?? null);
  const [records, setRecords] = useState<ComplianceRecordRow[]>(cached?.records ?? []);
  const [loading, setLoading] = useState(!cached);
  const fetchedRef = useRef(!!cached);

  useEffect(() => {
    if (!user?.tenantId || fetchedRef.current) return;
    fetchedRef.current = true;
    setLoading(true);
    Promise.all([
      getCurrentMonthComplianceAction(user.tenantId),
      getComplianceRecordsAction(user.tenantId),
      getEmp201Action(user.tenantId, period),
    ])
      .then(([current, all, emp]) => {
        const next = {
          tenantId: user.tenantId,
          period,
          paye: current.paye,
          uif: current.uif,
          sdl: current.sdl,
          emp201: emp,
          records: all,
        };
        _cache = next;
        setPaye(next.paye);
        setUif(next.uif);
        setSdl(next.sdl);
        setRecords(next.records);
        setEmp201(next.emp201);
      })
      .finally(() => setLoading(false));
  }, [user?.tenantId, period]);

  function handleRecordUpdated(updated: ComplianceRecordRow) {
    if (updated.type === "paye_return" && updated.period === period) setPaye(updated);
    if (updated.type === "uif_return" && updated.period === period) setUif(updated);
    if (updated.type === "sdl_return" && updated.period === period) setSdl(updated);
    if (updated.type === "emp201" && updated.period === period) setEmp201(updated);

    setRecords((prev) => {
      const next = prev.some((r) => r.id === updated.id)
        ? prev.map((r) => (r.id === updated.id ? updated : r))
        : [updated, ...prev];
      if (_cache) _cache = { ..._cache, records: next };
      return next;
    });
  }

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
              <TabsTrigger value="coida">Annual (COIDA)</TabsTrigger>
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
            <TabsContent value="coida" className="mt-4">
              {user?.tenantId && <CoidaPanel tenantId={user.tenantId} />}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </PlanGate>
  );
}
