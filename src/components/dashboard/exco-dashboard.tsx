"use client";

import { CalendarClock, ClipboardList, ShieldCheck, Users, Wallet } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  useCurrentTenant,
  useEmployees,
  useLeaveRequests,
  usePayrollRuns,
} from "@/lib/store/hooks";
import { calculateMonthlyPayroll } from "@/lib/payroll/calculator";
import { formatCurrency, formatCurrencyCompact, formatDateLong, formatMonthYear } from "@/lib/format";
import { DashboardHeader } from "./dashboard-header";
import { StatCardGrid, type StatItem } from "./stat-card-grid";
import { PayrollTrendChart } from "./payroll-trend-chart";
import { DepartmentBreakdown } from "./department-breakdown";
import { ActivityFeed } from "./activity-feed";

export function ExcoDashboard() {
  const tenant = useCurrentTenant();
  const employees = useEmployees();
  const leaveRequests = useLeaveRequests();
  const payrollRuns = usePayrollRuns();

  const activeEmployees = employees.filter((e) => e.status !== "terminated");
  const onLeaveToday = activeEmployees.filter((e) => e.status === "on_leave").length;
  const monthlyGross = activeEmployees.reduce(
    (sum, e) => sum + calculateMonthlyPayroll(e).grossPay,
    0
  );
  const pendingLeave = leaveRequests.filter((r) => r.status === "pending").length;

  const upcomingRun = payrollRuns.find(
    (r) => r.status === "scheduled" || r.status === "processing"
  );
  const eligibleForRun = upcomingRun
    ? activeEmployees.filter((e) => e.startDate <= upcomingRun.payDate)
    : [];
  const projectedGross = eligibleForRun.reduce(
    (sum, e) => sum + calculateMonthlyPayroll(e).grossPay,
    0
  );

  const stats: StatItem[] = [
    {
      label: "Headcount",
      value: activeEmployees.length.toString(),
      detail: "Active employees",
      icon: Users,
      iconClassName: "bg-info/10 text-info",
    },
    {
      label: "Monthly payroll",
      value: formatCurrencyCompact(monthlyGross),
      detail: "Gross, current roster",
      icon: Wallet,
      iconClassName: "bg-primary/10 text-primary",
    },
    {
      label: "Pending leave",
      value: pendingLeave.toString(),
      detail: "Awaiting HR review",
      icon: ClipboardList,
      iconClassName: "bg-warning/10 text-warning",
    },
    {
      label: "On leave today",
      value: onLeaveToday.toString(),
      detail: "Currently away",
      icon: CalendarClock,
      iconClassName: "bg-success/10 text-success",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader
        subtitle={`A read-only executive view of ${tenant.name}, ${formatDateLong(new Date())}.`}
      />
      <StatCardGrid stats={stats} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <PayrollTrendChart />
        <DepartmentBreakdown />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ActivityFeed />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-muted-foreground" />
              Next payroll
            </CardTitle>
            <CardDescription>
              {upcomingRun ? "Read-only summary of the scheduled run" : "No run scheduled"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {upcomingRun ? (
              <>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-muted-foreground">Period</span>
                  <span className="shrink-0 font-medium">{formatMonthYear(upcomingRun.period)}</span>
                </div>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-muted-foreground">Pay date</span>
                  <span className="shrink-0 font-medium">{formatDateLong(upcomingRun.payDate)}</span>
                </div>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-muted-foreground">Employees</span>
                  <span className="shrink-0 font-medium tabular-nums">{eligibleForRun.length}</span>
                </div>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-muted-foreground">Projected gross</span>
                  <span className="shrink-0 font-medium tabular-nums">
                    {formatCurrency(projectedGross)}
                  </span>
                </div>
              </>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No payroll run is currently scheduled.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
