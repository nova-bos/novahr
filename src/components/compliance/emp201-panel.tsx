"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import { toCSV, downloadCSV } from "@/lib/export/csv";
import { formatPeriod } from "@/lib/compliance/utils";
import { getUifDeclarationAction } from "@/lib/compliance/uif-actions";
import {
  generateEmp201ForPeriodAction,
  markComplianceSubmittedAction,
} from "@/lib/compliance/actions";
import { ComplianceStatusBadge } from "./compliance-status-badge";
import type { ComplianceRecordRow } from "@/lib/compliance/actions";

interface Emp201PanelProps {
  tenantId: string;
  period: string;
  record: ComplianceRecordRow | null;
  onChanged: (updated: ComplianceRecordRow) => void;
}

function LineRow({ label, amount, muted, credit }: { label: string; amount: number; muted?: boolean; credit?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
      <span className="tabular-nums">
        {credit ? `(${formatCurrency(amount)})` : formatCurrency(amount)}
      </span>
    </div>
  );
}

export function Emp201Panel({ tenantId, period, record, onChanged }: Emp201PanelProps) {
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const updated = await generateEmp201ForPeriodAction(tenantId, period);
      onChanged(updated);
      toast.success("EMP201 generated", {
        description: `Consolidated declaration for ${formatPeriod(period)} is ready.`,
      });
    } catch (err) {
      toast.error("Could not generate EMP201", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setGenerating(false);
    }
  }

  function handleExport() {
    if (!record) return;
    const csv = toCSV(
      ["Period", "PAYE", "ETI credit", "SDL", "UIF", "Total payable", "Status"],
      [
        [
          record.period,
          record.totalPaye.toFixed(2),
          record.totalEti.toFixed(2),
          record.totalSdl.toFixed(2),
          record.totalUif.toFixed(2),
          record.totalAmount.toFixed(2),
          record.status,
        ],
      ]
    );
    downloadCSV(csv, `emp201-${record.period}`);
  }

  async function handleUifExport() {
    try {
      const decl = await getUifDeclarationAction(tenantId, period);
      if (decl.rows.length === 0) {
        toast.error("No completed payroll run for this period to declare.");
        return;
      }
      const csv = toCSV(
        ["ID number", "Employee", "Gross remuneration", "Employee UIF", "Employer UIF", "Total UIF"],
        decl.rows.map((r) => [
          r.idNumber,
          r.name,
          r.grossRemuneration.toFixed(2),
          r.employeeContribution.toFixed(2),
          r.employerContribution.toFixed(2),
          r.totalContribution.toFixed(2),
        ])
      );
      downloadCSV(csv, `uif-declaration-${period}`);
      toast.success("UIF declaration exported");
    } catch (err) {
      toast.error("Could not export the UIF declaration", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  }

  async function handleMarkSubmitted() {
    if (!record) return;
    const ref = window.prompt("Enter the SARS eFiling reference number:");
    if (!ref) return;
    setSubmitting(true);
    try {
      const updated = await markComplianceSubmittedAction(record.tenantId, record.id, ref);
      onChanged(updated);
      toast.success("EMP201 marked as submitted");
    } catch (err) {
      toast.error("Could not update the EMP201", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>EMP201 declaration</CardTitle>
            <CardDescription>
              Monthly SARS return for {formatPeriod(period)}: PAYE less ETI, plus SDL and UIF.
            </CardDescription>
          </div>
          {record && <ComplianceStatusBadge status={record.status} dueDate={record.dueDate} />}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {record ? (
          <>
            <div className="rounded-lg border border-border/60 px-4 py-2">
              <LineRow label="PAYE" amount={record.totalPaye} />
              <LineRow label="Less: ETI credit" amount={record.totalEti} muted credit />
              <LineRow label="SDL" amount={record.totalSdl} />
              <LineRow label="UIF" amount={record.totalUif} />
              <div className="mt-1 flex items-center justify-between border-t border-border/60 pt-2 text-sm font-semibold">
                <span>Total payable to SARS</span>
                <span className="tabular-nums">{formatCurrency(record.totalAmount)}</span>
              </div>
            </div>

            {record.etiCarriedForward > 0 && (
              <p className="text-xs text-muted-foreground">
                ETI carried forward to next month: {formatCurrency(record.etiCarriedForward)}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3">
              {record.dueDate && (
                <span className="text-xs text-muted-foreground">Due {formatDate(record.dueDate)}</span>
              )}
              {record.reference && (
                <span className="text-xs text-muted-foreground">Ref: {record.reference}</span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating}>
                {generating ? "Refreshing..." : "Refresh from latest run"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="size-4" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleUifExport}>
                <Download className="size-4" />
                UIF declaration
              </Button>
              {record.status === "pending" && (
                <Button size="sm" onClick={handleMarkSubmitted} disabled={submitting}>
                  {submitting ? "Saving..." : "Mark submitted"}
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-muted-foreground">
              No EMP201 for {formatPeriod(period)} yet. Generate it from this period&apos;s completed payroll run.
            </p>
            <Button size="sm" onClick={handleGenerate} disabled={generating}>
              {generating ? "Generating..." : "Generate EMP201"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
