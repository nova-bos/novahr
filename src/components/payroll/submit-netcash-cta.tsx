"use client";

import * as React from "react";
import { toast } from "sonner";
import { Download, FileText, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency, formatDateLong, formatMonthYear } from "@/lib/format";
import { usePayrollRuns, useTenantId, usePayslipsByRun, useEmployees, useCurrentTenant, useAllPayslips } from "@/lib/store/hooks";
import { usePlan } from "@/lib/plan/use-plan";
import {
  submitNetcashBatchAction,
  generateBankExportCsvAction,
  generateNetcashNifAction,
} from "@/lib/bank-exports/actions";
import { getPayslipSettingsAction } from "@/lib/settings/actions";

export function SubmitNetcashCta() {
  const tenantId = useTenantId();
  const tenant = useCurrentTenant();
  const runs = usePayrollRuns();
  const employees = useEmployees();
  const allPayslips = useAllPayslips();
  const { can } = usePlan();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [isSubmitting, startSubmitTransition] = React.useTransition();
  const [isExporting, startExportTransition] = React.useTransition();
  const [isNifExporting, startNifExportTransition] = React.useTransition();
  const [bulkDownloading, setBulkDownloading] = React.useState(false);
  const [submittedRunId, setSubmittedRunId] = React.useState<string | null>(null);

  const run = runs
    .filter((r) => r.status === "completed")
    .sort((a, b) => (a.payDate < b.payDate ? 1 : -1))[0];

  const payslips = usePayslipsByRun(run?.id ?? "");

  if (!run || submittedRunId === run.id) return null;

  function handleSubmit() {
    if (!run) return;
    startSubmitTransition(async () => {
      const result = await submitNetcashBatchAction(tenantId, run.id);
      if (result.error) {
        toast.error("Netcash submission failed", { description: result.error });
        return;
      }
      setConfirmOpen(false);
      setSubmittedRunId(run.id);
      toast.success("Payroll submitted to Netcash", {
        description: `File token: ${result.token}. Netcash will email the load report.`,
      });
    });
  }

  function handleBankExport() {
    if (!run) return;
    startExportTransition(async () => {
      const result = await generateBankExportCsvAction(tenantId, run.id);
      if (result.error) {
        toast.error("Export failed", { description: result.error });
        return;
      }
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Bank CSV downloaded", { description: result.filename });
    });
  }

  function handleNifExport() {
    if (!run) return;
    startNifExportTransition(async () => {
      const result = await generateNetcashNifAction(tenantId, run.id);
      if (result.error) {
        toast.error("NIF export failed", { description: result.error });
        return;
      }
      const blob = new Blob([result.nif], { type: "text/plain;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Netcash NIF downloaded", { description: result.filename });
    });
  }

  async function handleBulkDownload() {
    if (!run || payslips.length === 0) return;
    setBulkDownloading(true);
    try {
      const [{ pdf }, { PayslipDocument }, JSZip] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/lib/payroll/pdf"),
        import("jszip").then((m) => m.default),
      ]);
      const zip = new JSZip();
      const settings = await getPayslipSettingsAction(tenantId);
      const logoSrc = settings.logoDataUrl ?? undefined;
      const { computePayslipYtd } = await import("@/lib/payroll/ytd");
      for (const ps of payslips) {
        const emp = employees.find((e) => e.id === ps.employeeId);
        if (!emp) continue;
        const ytd = settings.showYtd
          ? computePayslipYtd(allPayslips, emp.id, ps.period, settings.taxYearStartMonth)
          : undefined;
        const blob = await pdf(
          <PayslipDocument
            employee={emp}
            payslip={ps}
            companyName={settings.companyName ?? tenant.name}
            logoUrl={logoSrc}
            logoAlignment={settings.logoAlignment}
            accentColor={settings.accentColor}
            template={settings.template}
            footerNote={settings.footerNote ?? undefined}
            showBanking={settings.showBanking}
            showYtd={settings.showYtd}
            companyAddress={`${tenant.address}, ${tenant.city}`}
            companyRegistration={tenant.registrationNumber || undefined}
            payeReference={settings.payeReference ?? undefined}
            uifReference={settings.uifReference ?? undefined}
            sdlReference={settings.sdlReference ?? undefined}
            ytd={ytd}
          />
        ).toBlob();
        const ab = await blob.arrayBuffer();
        zip.file(`payslip-${emp.lastName.toLowerCase()}-${emp.employeeNumber}-${ps.period}.pdf`, ab);
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `NovaHR_Payslips_${run.period}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Payslips downloaded");
    } catch {
      toast.error("Download failed", { description: "Please try again." });
    } finally {
      setBulkDownloading(false);
    }
  }

  return (
    <section aria-label="Pay this payroll run" className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4 sm:p-5 flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight">
            {formatMonthYear(run.period)} payroll is ready to pay
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {run.employeeCount} employees · {formatCurrency(run.totalNet)} net · pay date{" "}
            {formatDateLong(run.payDate)}
          </p>
        </div>
        {can("bankExports") ? (
          <Button
            size="lg"
            onClick={() => setConfirmOpen(true)}
            disabled={isSubmitting}
            className="shrink-0"
          >
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            {isSubmitting ? "Submitting..." : "Submit payroll to Netcash"}
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-1 border-t border-primary/10 pt-3">
        <span className="text-xs text-muted-foreground mr-1">Other options:</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-muted-foreground hover:text-foreground"
          onClick={handleBulkDownload}
          disabled={bulkDownloading || payslips.length === 0}
        >
          <Download className="size-3" />
          {bulkDownloading ? "Generating..." : "Download payslips"}
        </Button>
        {can("bankExports") ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleBankExport}
              disabled={isExporting}
            >
              <FileText className="size-3" />
              {isExporting ? "Exporting..." : "Export bank CSV"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleNifExport}
              disabled={isNifExporting}
            >
              <Download className="size-3" />
              {isNifExporting ? "Generating..." : "Download Netcash NIF"}
            </Button>
          </>
        ) : null}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit {formatMonthYear(run.period)} payroll to Netcash?</DialogTitle>
            <DialogDescription>
              This uploads the salary batch to Netcash for payment on{" "}
              {formatDateLong(run.payDate)}. Confirm the totals before submitting.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="min-w-0 rounded-xl border border-border/70 p-3">
              <p className="text-xs text-muted-foreground">Employees paid</p>
              <p className="mt-1 truncate text-base font-semibold tabular-nums">{run.employeeCount}</p>
            </div>
            <div className="min-w-0 rounded-xl border border-border/70 p-3">
              <p className="text-xs text-muted-foreground">Total net pay</p>
              <p className="mt-1 truncate text-base font-semibold tabular-nums">
                {formatCurrency(run.totalNet)}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              {isSubmitting ? "Submitting..." : "Confirm and submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
