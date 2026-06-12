"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate, getInitials } from "@/lib/format";
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
            <span className="shrink-0 font-medium">{formatCurrency(payslip.basicSalary)}</span>
          </div>
          {payslip.earnings.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate text-muted-foreground">{item.label}</span>
              <span className="shrink-0 font-medium">{formatCurrency(item.amount)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between gap-2 text-sm font-semibold">
            <span className="truncate">Gross pay</span>
            <span className="shrink-0">{formatCurrency(payslip.grossPay)}</span>
          </div>
        </div>

        <Separator />

        <div className="space-y-2.5">
          <p className="text-xs font-medium text-muted-foreground">Deductions</p>
          {payslip.deductions.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate text-muted-foreground">{item.label}</span>
              <span className="shrink-0 font-medium">-{formatCurrency(item.amount)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between gap-2 text-sm font-semibold">
            <span className="truncate">Total deductions</span>
            <span className="shrink-0">-{formatCurrency(payslip.totalDeductions)}</span>
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between gap-2 rounded-xl bg-primary/[0.03] p-3">
          <span className="shrink-0 text-sm font-semibold">Net pay</span>
          <span className="truncate text-lg font-semibold text-primary">
            {formatCurrency(payslip.netPay)}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
