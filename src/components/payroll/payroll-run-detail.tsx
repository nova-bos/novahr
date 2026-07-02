"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Banknote, Download, Receipt, ReceiptText, Send, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import { useEmployees, usePayslipsByRun, useTenantId } from "@/lib/store/hooks";
import type { PayrollRun, Payslip } from "@/lib/types";
import { StatCardGrid, type StatItem } from "@/components/dashboard/stat-card-grid";
import { usePlan } from "@/lib/plan/use-plan";
import { generateBankExportCsvAction, generateNetcashNifAction, submitNetcashBatchAction } from "@/lib/bank-exports/actions";
import { getPayslipSettingsAction } from "@/lib/settings/actions";
import { approvePayrollRunAction, rejectPayrollApprovalAction } from "@/lib/payroll/approval-actions";
import { useCurrentTenant } from "@/lib/store/hooks";
import { PayrollStatusBadge } from "./payroll-status-badge";
import { PayslipDialog } from "./payslip-dialog";

export function PayrollRunDetail({ run }: { run: PayrollRun }) {
  const payslips = usePayslipsByRun(run.id);
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

  function handleApprove() {
    startApproveTransition(async () => {
      try {
        await approvePayrollRunAction(run.id);
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
        toast.info("Payroll sent back for review.");
      } catch (err) {
        toast.error("Could not reject payroll", {
          description: err instanceof Error ? err.message : "Please try again.",
        });
      }
    });
  }

  async function handleBulkDownload() {
    setBulkDownloading(true);
    try {
      const [{ pdf }, { PayslipDocument }, JSZip] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/lib/payroll/pdf"),
        import("jszip").then((m) => m.default),
      ]);
      const zip = new JSZip();
      const settings = await getPayslipSettingsAction(tenantId);
      for (let i = 0; i < payslips.length; i++) {
        const ps = payslips[i];
        const emp = employees.find((e) => e.id === ps.employeeId);
        if (!emp) continue;
        setBulkProgress(`Generating ${i + 1} of ${payslips.length}...`);
        const blob = await pdf(
          <PayslipDocument
            employee={emp}
            payslip={ps}
            companyName={settings.companyName ?? tenant.name}
            logoUrl={settings.logoUrl ?? undefined}
            accentColor={settings.accentColor}
            template={settings.template}
            footerNote={settings.footerNote ?? undefined}
            showBanking={settings.showBanking}
            showYtd={settings.showYtd}
            companyAddress={`${tenant.address}, ${tenant.city}`}
          />
        ).toBlob();
        const arrayBuffer = await blob.arrayBuffer();
        zip.file(`payslip-${emp.lastName.toLowerCase()}-${ps.period}.pdf`, arrayBuffer);
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
                  variant="outline"
                  size="sm"
                  onClick={handleNetcashSubmit}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none"
                >
                  <Send className="mr-2 size-4" />
                  {isSubmitting ? "Submitting..." : "Submit to Netcash"}
                </Button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      {run.status === "awaiting_approval" ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-amber-800">Payroll awaiting sign-off</p>
            <p className="text-xs text-amber-700 mt-1">
              This run has been processed and is waiting for approval before employees are paid.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={handleReject}
              disabled={isRejecting || isApproving}
              className="border-amber-300 text-amber-800 hover:bg-amber-100"
            >
              {isRejecting ? "Sending back..." : "Send back"}
            </Button>
            <Button
              size="sm"
              onClick={handleApprove}
              disabled={isApproving || isRejecting}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isApproving ? "Approving..." : "Approve"}
            </Button>
          </div>
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
