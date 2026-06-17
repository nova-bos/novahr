"use client";

import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  Briefcase,
  CalendarRange,
  FileText,
  Wallet,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { NewLeaveRequestDialog } from "@/components/leave/new-leave-request-dialog";
import { useCurrentEmployee } from "@/lib/auth/scope";
import { useEmployee, usePayslipsByEmployee } from "@/lib/store/hooks";
import { calculateMonthlyPayroll } from "@/lib/payroll/calculator";
import {
  employmentTypeLabel,
  formatCurrency,
  formatDate,
  formatDateLong,
  formatMonthYear,
} from "@/lib/format";
import type { LeaveType } from "@/lib/types";
import { DashboardHeader } from "./dashboard-header";
import { StatCardGrid, type StatItem } from "./stat-card-grid";

const LEAVE_COLUMNS: { type: LeaveType; label: string }[] = [
  { type: "annual", label: "Annual leave" },
  { type: "sick", label: "Sick leave" },
  { type: "family", label: "Family responsibility" },
  { type: "unpaid", label: "Unpaid leave" },
];

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="truncate text-sm font-medium">{value}</span>
    </div>
  );
}

export function EmployeeDashboard() {
  const employee = useCurrentEmployee();
  const manager = useEmployee(employee?.managerId);
  const payslips = usePayslipsByEmployee(employee?.id);
  const latestPayslip = payslips[0];

  if (!employee) return null;

  const annualBalance = employee.leaveBalances.find((b) => b.type === "annual");
  const annualRemaining = annualBalance ? annualBalance.total - annualBalance.used : 0;
  const tenureYears = new Date().getFullYear() - new Date(employee.startDate).getFullYear();
  const monthly = calculateMonthlyPayroll(employee);

  const stats: StatItem[] = [
    {
      label: "Annual leave left",
      value: `${annualRemaining} days`,
      detail: `of ${annualBalance?.total ?? 0} days this year`,
      icon: CalendarRange,
      iconClassName: "bg-info/10 text-info",
    },
    {
      label: "Latest payslip",
      value: latestPayslip ? formatCurrency(latestPayslip.netPay) : "—",
      detail: latestPayslip ? `${formatMonthYear(latestPayslip.period)} · net pay` : "No payslips yet",
      icon: Wallet,
      iconClassName: "bg-primary/10 text-primary",
    },
    {
      label: "Monthly gross",
      value: formatCurrency(monthly.grossPay),
      detail: "Current salary",
      icon: Banknote,
      iconClassName: "bg-success/10 text-success",
    },
    {
      label: "At NovaTech",
      value: `${tenureYears} yr${tenureYears === 1 ? "" : "s"}`,
      detail: `Since ${formatDate(employee.startDate)}`,
      icon: Briefcase,
      iconClassName: "bg-warning/10 text-warning",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader subtitle={`Here's your overview for today, ${formatDateLong(new Date())}.`} />
      <StatCardGrid stats={stats} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>My profile</CardTitle>
            <CardDescription>
              {employee.jobTitle} · {employee.department}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoRow label="Manager" value={manager ? `${manager.firstName} ${manager.lastName}` : "—"} />
              <InfoRow label="Location" value={employee.location} />
              <InfoRow label="Employment type" value={employmentTypeLabel(employee.employmentType)} />
              <InfoRow label="Start date" value={formatDate(employee.startDate)} />
              <InfoRow label="Email" value={employee.email} />
              <InfoRow label="Phone" value={employee.phone} />
            </div>
          </CardContent>
          <CardFooter className="border-t-0 bg-transparent p-(--card-spacing) pt-0">
            <Link
              href={`/employees/${employee.id}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
            >
              View full profile
              <ArrowRight className="size-3.5" />
            </Link>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leave balances</CardTitle>
            <CardDescription>Days remaining this year</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {LEAVE_COLUMNS.map((col) => {
              const balance = employee.leaveBalances.find((b) => b.type === col.type);
              if (!balance) return null;
              const remaining = balance.total - balance.used;
              const pct = balance.total > 0 ? (balance.used / balance.total) * 100 : 0;
              return (
                <div key={col.type} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{col.label}</span>
                    <span className="shrink-0 font-medium tabular-nums">
                      {remaining}/{balance.total}
                    </span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              );
            })}
          </CardContent>
          <CardFooter className="border-t-0 bg-transparent p-(--card-spacing) pt-0">
            <NewLeaveRequestDialog />
          </CardFooter>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/payroll"
          className="group flex flex-col gap-2.5 rounded-xl border border-border/70 p-4 transition-colors hover:border-primary/40 hover:bg-primary/[0.03]"
        >
          <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
            <FileText className="size-4" />
          </div>
          <div className="space-y-0.5">
            <p className="text-sm font-medium">My payslips</p>
            <p className="text-xs text-muted-foreground">View and download past payslips</p>
          </div>
        </Link>
        <Link
          href="/leave"
          className="group flex flex-col gap-2.5 rounded-xl border border-border/70 p-4 transition-colors hover:border-primary/40 hover:bg-primary/[0.03]"
        >
          <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
            <CalendarRange className="size-4" />
          </div>
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Leave requests</p>
            <p className="text-xs text-muted-foreground">Track the status of your time off</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
