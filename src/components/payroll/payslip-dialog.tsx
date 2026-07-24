"use client";

import * as React from "react";
import { Download } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate, getInitials } from "@/lib/format";
import type { Employee, Payslip } from "@/lib/types";
import { useAllPayslips, useCurrentTenant } from "@/lib/store/hooks";
import { getPayslipSettingsAction, type PayslipSettingsResult } from "@/lib/settings/actions";
import { computePayslipYtd, type PayslipYtd } from "@/lib/payroll/ytd";

async function downloadPayslipPdf(
  employee: Employee,
  payslip: Payslip,
  companyName: string,
  settings: {
    template: string;
    logoDataUrl: string | null;
    logoAlignment: "left" | "center" | "right";
    accentColor: string;
    footerNote: string | null;
    showBanking: boolean;
    showYtd: boolean;
    companyAddress?: string;
    companyRegistration?: string;
    payeReference?: string;
    uifReference?: string;
    sdlReference?: string;
    ytd?: PayslipYtd;
  }
): Promise<void> {
  const [{ pdf }, { PayslipDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/lib/payroll/pdf"),
  ]);
  const blob = await pdf(
    <PayslipDocument
      employee={employee}
      payslip={payslip}
      companyName={companyName}
      logoUrl={settings.logoDataUrl ?? undefined}
      logoAlignment={settings.logoAlignment}
      accentColor={settings.accentColor}
      template={settings.template}
      footerNote={settings.footerNote ?? undefined}
      showBanking={settings.showBanking}
      showYtd={settings.showYtd}
      companyAddress={settings.companyAddress}
      companyRegistration={settings.companyRegistration}
      payeReference={settings.payeReference}
      uifReference={settings.uifReference}
      sdlReference={settings.sdlReference}
      ytd={settings.ytd}
    />
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `payslip-${employee.lastName.toLowerCase()}-${payslip.period}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function PayslipDialog({
  employee,
  payslip,
  open,
  onOpenChange,
}: {
  employee: Employee;
  payslip: Payslip | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const tenant = useCurrentTenant();
  const allPayslips = useAllPayslips();
  const [downloading, setDownloading] = React.useState(false);

  if (!payslip) return null;

  async function handleDownload() {
    if (!payslip) return;
    setDownloading(true);
    try {
      // Fetch the current branding fresh at download time so the selected
      // template and logo always apply, with no dependence on cached state.
      const settings: PayslipSettingsResult =
        (await getPayslipSettingsAction(tenant.id).catch(() => null)) ?? {
          template: "classic",
          logoUrl: null,
          logoDataUrl: null,
          logoAlignment: "left",
          accentColor: "#6366f1",
          footerNote: null,
          showBanking: false,
          showYtd: true,
          companyName: null,
          payeReference: null,
          uifReference: null,
          sdlReference: null,
          taxYearStartMonth: 3,
        };
      const ytd = settings.showYtd
        ? computePayslipYtd(allPayslips, employee.id, payslip.period, settings.taxYearStartMonth)
        : undefined;
      await downloadPayslipPdf(employee, payslip, settings.companyName ?? tenant.name, {
        template: settings.template,
        logoDataUrl: settings.logoDataUrl,
        logoAlignment: settings.logoAlignment,
        accentColor: settings.accentColor,
        footerNote: settings.footerNote,
        showBanking: settings.showBanking,
        showYtd: settings.showYtd,
        companyAddress: `${tenant.address}, ${tenant.city}`,
        companyRegistration: tenant.registrationNumber || undefined,
        payeReference: settings.payeReference ?? undefined,
        uifReference: settings.uifReference ?? undefined,
        sdlReference: settings.sdlReference ?? undefined,
        ytd,
      });
    } catch {
      toast.error("Could not generate PDF", { description: "Please try again." });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Payslip</DialogTitle>
          <DialogDescription>{formatDate(payslip.payDate)} pay date</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3">
          <Avatar size="lg" className="size-11">
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
          <div>
            <p className="text-sm font-semibold">
              {employee.firstName} {employee.lastName}
            </p>
            <p className="text-xs text-muted-foreground">
              {employee.jobTitle} · {employee.department}
            </p>
          </div>
        </div>

        <Separator />

        <div className="space-y-2.5">
          <p className="text-xs font-medium text-muted-foreground">Earnings</p>
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate text-muted-foreground">Basic salary</span>
            <span className="shrink-0 font-medium tabular-nums">{formatCurrency(payslip.basicSalary)}</span>
          </div>
          {payslip.earnings.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate text-muted-foreground">{item.label}</span>
              <span className="shrink-0 font-medium tabular-nums">{formatCurrency(item.amount)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between gap-2 text-sm font-semibold">
            <span className="truncate">Gross pay</span>
            <span className="shrink-0 tabular-nums">{formatCurrency(payslip.grossPay)}</span>
          </div>
        </div>

        <Separator />

        <div className="space-y-2.5">
          <p className="text-xs font-medium text-muted-foreground">Deductions</p>
          {payslip.deductions.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate text-muted-foreground">{item.label}</span>
              <span className="shrink-0 font-medium tabular-nums">-{formatCurrency(item.amount)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between gap-2 text-sm font-semibold">
            <span className="truncate">Total deductions</span>
            <span className="shrink-0 tabular-nums">-{formatCurrency(payslip.totalDeductions)}</span>
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between gap-2 rounded-xl bg-primary/[0.03] p-3">
          <span className="shrink-0 text-sm font-semibold">Net pay</span>
          <span className="truncate text-lg font-semibold tabular-nums text-primary">
            {formatCurrency(payslip.netPay)}
          </span>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleDownload} disabled={downloading}>
            <Download />
            {downloading ? "Generating..." : "Download payslip"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
