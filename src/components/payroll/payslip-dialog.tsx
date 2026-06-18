"use client";

import { Download } from "lucide-react";
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
import { printPayslip } from "@/lib/payroll/print";
import type { Employee, Payslip } from "@/lib/types";

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
  if (!payslip) return null;

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
          <Button variant="outline" onClick={() => printPayslip(employee, payslip)}>
            <Download />
            Download payslip
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
