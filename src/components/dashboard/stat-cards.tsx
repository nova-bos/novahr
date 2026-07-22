"use client";

import * as React from "react";
import { CalendarClock, ClipboardList, Users, Wallet } from "lucide-react";
import { useEmployees, useLeaveRequests, usePayrollRuns } from "@/lib/store/hooks";
import { calculateMonthlyPayroll } from "@/lib/payroll/calculator";
import { formatCurrencyCompact, formatDate } from "@/lib/format";
import { StatCardGrid, type StatItem } from "./stat-card-grid";

export function StatCards() {
  const employees = useEmployees();
  const leaveRequests = useLeaveRequests();
  const payrollRuns = usePayrollRuns();
  const [revealed, setRevealed] = React.useState(false);

  const activeEmployees = employees.filter((e) => e.status !== "terminated");
  const onProbation = activeEmployees.filter((e) => e.status === "probation").length;
  const onLeaveToday = activeEmployees.filter((e) => e.status === "on_leave").length;

  const monthlyGross = activeEmployees.reduce(
    (sum, e) => sum + calculateMonthlyPayroll(e).grossPay,
    0
  );

  const pendingLeave = leaveRequests.filter((r) => r.status === "pending").length;

  const upcomingRun = payrollRuns.find((r) => r.status === "scheduled");

  const stats: StatItem[] = [
    {
      label: "Team members",
      value: activeEmployees.length.toString(),
      detail:
        onProbation > 0
          ? `${onProbation} onboarding · ${onLeaveToday} on leave`
          : `${onLeaveToday} on leave today`,
      icon: Users,
      iconClassName: "bg-info/10 text-info",
    },
    {
      label: "Monthly payroll",
      value: formatCurrencyCompact(monthlyGross),
      detail: "Gross, current roster",
      icon: Wallet,
      iconClassName: "bg-primary/10 text-primary",
      sensitive: true,
    },
    {
      label: "Pending leave requests",
      value: pendingLeave.toString(),
      detail: pendingLeave === 1 ? "Awaiting your review" : "Awaiting your review",
      icon: ClipboardList,
      iconClassName: "bg-warning/10 text-warning",
    },
    {
      label: "Next payroll run",
      value: upcomingRun ? formatDate(upcomingRun.payDate, { day: "numeric", month: "short" }) : "-",
      detail: upcomingRun ? `${upcomingRun.employeeCount} employees` : "No run scheduled",
      icon: CalendarClock,
      iconClassName: "bg-success/10 text-success",
    },
  ];

  return <StatCardGrid stats={stats} revealed={revealed} onToggle={() => setRevealed((v) => !v)} />;
}
