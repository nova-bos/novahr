"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Banknote, Download, Loader2, Receipt, ReceiptText, Send, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDateLong, getInitials } from "@/lib/format";
import { useAllPayslips, useEmployees, usePayslipsByRun, useTenantId } from "@/lib/store/hooks";
import type { PayrollRun, Payslip } from "@/lib/types";
import { StatCardGrid, type StatItem } from "@/components/dashboard/stat-card-grid";
import { usePlan } from "@/lib/plan/use-plan";
import { generateBankExportCsvAction, generateNetcashNifAction, submitNetcashBatchAction } from "@/lib/bank-exports/actions";
import { getPayslipSettingsAction } from "@/lib/settings/actions";
import { approvePayrollRunAction, rejectPayrollApprovalAction } from "@/lib/payroll/approval-actions";
import { cancelPayrollRunRecord } from "@/lib/payroll/actions";
import { useApp } from "@/lib/store/app-provider";
import { useCurrentTenant } from "@/lib/store/hooks";
import { PayrollStatusBadge } from "./payroll-status-badge";
import { PayslipDialog } from "./payslip-dialog";

export function PayrollRunDetail({ run }: { run: PayrollRun }) {
  const payslips = usePayslipsByRun(run.id);
  const allPayslips = useAllPayslips();
  const employees = useEmployees();
  const tenantId = useTenantId();
  const tenant = useCurrentTenant();
  const { can } = usePlan();
  const [selected, setSelected] = React.useState<Payslip | null>(null);
  const [isExporting, startExportTransition] = React.useTransition();
  const [isNifExporting, startNifExportTransition] = React.useTransition();
  const [isSubmitting, startSubmitTransition] = React.useTransition();
  const [bulkDownloading, setBulkDownloading] = React.useState(false);
  const [bulkProgress, setBulkProgress] = React.useState<string | null>(null);
  const [isApproving, startApproveTransition] = React.useTransition();
  const [isRejecting, startRejectTransition] = React.useTransition();
  const [isCancelling, startCancelTransition] = React.useTransition();
  const [confirmApproveOpen, setConfirmApproveOpen] = React.useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = React.useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = React.useState(false);
  const { reloadWorkspace } = useApp();

  function handleApprove() {
    startApproveTransition(async () => {
      try {
        await approvePayrollRunAction(run.id);
        setConfirmApproveOpen(false);
        reloadWorkspace();
        toast.success("Payroll approved. Payslip emails will be sent shortly.");
      } catch (err) {
        toast.error("Could not approve payroll", {
          description: err instanceof Error ? err.message : "Please try again.",
        });
      }
    });
  }

  function handleReject() {
    startRejectTransition(async () => {
      try {
        await rejectPayrollApprovalAction(run.id, "Sent back for review.");
        reloadWorkspace();
        toast.info("Payroll sent back for review. Payslips were cleared so you can re-run it.");
      } catch (err) {
        toast.error("Could not reject payroll", {
          description: err instanceof Error ? err.message : "Please try again.",
        });
      }
    });
  }

  function handleCancel() {
    startCancelTransition(async () => {
      try {
        await cancelPayrollRunRecord(run.id);
        setConfirmCancelOpen(false);
        reloadWorkspace();
        toast.success("Payroll run cancelled", {
          description: "Payslips were removed and any loan deductions reversed. The run is back to scheduled.",
        });
      } catch (err) {
        toast.error("Could not cancel run", {
          description: err instanceof Error ? err.message : "Please try again.",
        });
      }
    });
  }

  async function handleBulkDownload() {
    setBulkDownloading(true);
    try {
      const [{ pdf }, { PayslipDocument }, JSZip, { resolveLogoDataUrl }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/lib/payroll/pdf"),
        import("jszip").then((m) => m.default),
        import("@/lib/payroll/logo"),
      ]);
      const zip = new JSZip();
      const settings = await getPayslipSettingsAction(tenantId);
      const logoSrc = await resolveLogoDataUrl(settings.logoUrl);
      const { computePayslipYtd } = await import("@/lib/payroll/ytd");
      for (let i = 0; i < payslips.length; i++) {
        const ps = payslips[i];
        const emp = employees.find((e) => e.id === ps.employeeId);
        if (!emp) continue;
        setBulkProgress(`Generating ${i + 1} of ${payslips.length}...`);
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
        const arrayBuffer = await blob.arrayBuffer();
        zip.file(`payslip-${emp.lastName.toLowerCase()}-${emp.employeeNumber}-${ps.period}.pdf`, arrayBuffer);
      }
      setBulkProgress("Building archive...");
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `NovaHR_Payslips_${run.period}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not generate payslip archive");
    } finally {
      setBulkDownloading(false);
      setBulkProgress(null);
    }
  }

  function handleBankExport() {
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
      toast.success("Bank export downloaded", { description: result.filename });
    });
  }

  function handleNifExport() {
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

  function handleNetcashSubmit() {
    startSubmitTransition(async () => {
      const result = await submitNetcashBatchAction(tenantId, run.id);
      if (result.error) {
        toast.error("Netcash submission failed", { description: result.error });
        return;
      }
      setConfirmSubmitOpen(false);
      toast.success("Batch submitted to Netcash", {
        description: `File token: ${result.token}. You will receive a load report by email.`,
      });
    });
  }

  const employeeById = React.useMemo(() => {
    const map = new Map<string, (typeof employees)[number]>();
    for (const employee of employees) map.set(employee.id, employee);
    return map;
  }, [employees]);

  const selectedEmployee = selected ? employeeById.get(selected.employeeId) : undefined;

  const stats: StatItem[] = [
    {
      label: "Total gross",
      value: formatCurrency(run.totalGross),
      icon: Banknote,
      iconClassName: "bg-primary/10 text-primary",
    },
    {
      label: "PAYE withheld",
      value: formatCurrency(run.totalPaye),
      icon: Receipt,
      iconClassName: "bg-warning/10 text-warning",
    },
    {
      label: "UIF contributions",
      value: formatCurrency(run.totalUif),
      icon: ReceiptText,
      iconClassName: "bg-info/10 text-info",
    },
    {
      label: "Total net pay",
      value: formatCurrency(run.totalNet),
      icon: Wallet,
      iconClassName: "bg-success/10 text-success",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/payroll"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to payroll
      </Link>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight">{run.label}</h2>
            <PayrollStatusBadge status={run.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Pay date {formatDateLong(run.payDate)}
            {run.processedOn ? ` · Processed ${formatDateLong(run.processedOn)}` : ""}
          </p>
        </div>
        {run.status === "completed" ? (
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkDownload}
              disabled={bulkDownloading}
              className="flex-1 sm:flex-none"
            >
              <Download className="mr-2 size-4" />
              {bulkDownloading ? (bulkProgress ?? "Generating...") : "Download all payslips"}
            </Button>
            {can("bankExports") ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleBankExport}
              disabled={isExporting}
              className="flex-1 sm:flex-none"
            >
              <Download className="mr-2 size-4" />
              {isExporting ? "Exporting..." : "Export CSV"}
            </Button>
            ) : null}
            {can("bankExports") ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNifExport}
                  disabled={isNifExporting}
                  className="flex-1 sm:flex-none"
                >
                  <Download className="mr-2 size-4" />
                  {isNifExporting ? "Generating..." : "Download Netcash NIF"}
                </Button>
                <Button
                  size="lg"
                  onClick={() => setConfirmSubmitOpen(true)}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto sm:order-first"
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 size-4" />
                  )}
                  {isSubmitting ? "Submitting..." : "Submit payroll to Netcash"}
                </Button>
                <Dialog open={confirmSubmitOpen} onOpenChange={(o) => !isSubmitting && setConfirmSubmitOpen(o)}>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Submit this payroll to Netcash?</DialogTitle>
                      <DialogDescription>
                        This sends a payment batch of {formatCurrency(run.totalNet)} for {run.employeeCount}
                        {" "}employee{run.employeeCount === 1 ? "" : "s"} to Netcash for disbursement. Once submitted
                        the batch is handed to your bank and cannot be recalled from NovaHR.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setConfirmSubmitOpen(false)} disabled={isSubmitting}>
                        Cancel
                      </Button>
                      <Button onClick={handleNetcashSubmit} disabled={isSubmitting}>
                        {isSubmitting ? "Submitting..." : "Submit to Netcash"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      {run.status === "awaiting_approval" ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Payroll awaiting sign-off</p>
            <p className="text-xs text-amber-700/90 dark:text-amber-400/90 mt-1">
              This run has been processed and is waiting for approval before employees are paid.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={handleReject}
              disabled={isRejecting || isApproving}
              className="border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
            >
              {isRejecting ? "Sending back..." : "Send back"}
            </Button>
            <Button
              size="sm"
              onClick={() => setConfirmApproveOpen(true)}
              disabled={isApproving || isRejecting}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isApproving ? "Approving..." : "Approve"}
            </Button>
          </div>

          <Dialog open={confirmApproveOpen} onOpenChange={(o) => !isApproving && setConfirmApproveOpen(o)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Approve this payroll run?</DialogTitle>
                <DialogDescription>
                  This will finalise pay for {run.employeeCount} employee{run.employeeCount === 1 ? "" : "s"}
                  {" "}with a net total of {formatCurrency(run.totalNet)} and email a payslip to every employee.
                  Payslip emails cannot be recalled once sent.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmApproveOpen(false)} disabled={isApproving}>
                  Cancel
                </Button>
                <Button onClick={handleApprove} disabled={isApproving}>
                  {isApproving ? "Approving..." : "Approve and send payslips"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      ) : null}

      {run.status === "completed" || run.status === "awaiting_approval" ? (
        <div className="flex items-start justify-between gap-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <div>
            <p className="text-sm font-semibold text-destructive">Made a mistake, or need to add or remove someone?</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Cancel this run to remove its payslips and reverse any loan or garnishee deductions it applied, returning it to scheduled so you can make changes and run it again. Not available once the batch has been submitted to Netcash.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setConfirmCancelOpen(true)}
            disabled={isCancelling}
            className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10"
          >
            {isCancelling ? "Cancelling..." : "Cancel run"}
          </Button>

          <Dialog open={confirmCancelOpen} onOpenChange={(o) => !isCancelling && setConfirmCancelOpen(o)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Cancel this payroll run?</DialogTitle>
                <DialogDescription>
                  This removes all {payslips.length} payslip{payslips.length === 1 ? "" : "s"} for this run and reverses any loan or garnishee instalments it applied, restoring those balances. The run returns to scheduled so you can amend it and run again. This cannot be done once the batch has been submitted to Netcash.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmCancelOpen(false)} disabled={isCancelling}>
                  Keep run
                </Button>
                <Button variant="destructive" onClick={handleCancel} disabled={isCancelling}>
                  {isCancelling ? "Cancelling..." : "Cancel run"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      ) : null}

      <StatCardGrid stats={stats} />

      <Card>
        <CardHeader>
          <CardTitle>Payslips ({payslips.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border border-border">
          <Table className="min-w-[560px] w-full">
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Deductions</TableHead>
                <TableHead className="text-right">Net pay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payslips.map((payslip) => {
                const employee = employeeById.get(payslip.employeeId);
                if (!employee) return null;
                return (
                  <TableRow
                    key={payslip.id}
                    className="cursor-pointer"
                    onClick={() => setSelected(payslip)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar size="sm">
                          {employee.photoUrl ? (
                            <AvatarImage src={employee.photoUrl} alt={`${employee.firstName} ${employee.lastName}`} />
                          ) : null}
                          <AvatarFallback
                            className="text-white"
                            style={{ backgroundColor: employee.avatarColor }}
                          >
                            {getInitials(employee.firstName, employee.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-sm font-medium">
                            {employee.firstName} {employee.lastName}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {employee.jobTitle}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{employee.department}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(payslip.grossPay)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      -{formatCurrency(payslip.totalDeductions)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatCurrency(payslip.netPay)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {selectedEmployee ? (
        <PayslipDialog
          employee={selectedEmployee}
          payslip={selected}
          open={Boolean(selected)}
          onOpenChange={(open) => !open && setSelected(null)}
        />
      ) : null}
    </div>
  );
}
