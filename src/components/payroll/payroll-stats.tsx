"use client";

import { Banknote, CalendarClock, ReceiptText, Users } from "lucide-react";
import { useEmployees, usePayrollRuns } from "@/lib/store/hooks";
import { calculateMonthlyPayroll } from "@/lib/payroll/calculator";
import { formatDate, plural } from "@/lib/format";
import { Currency } from "@/components/ui/currency";
import { StatCardGrid, type StatItem } from "@/components/dashboard/stat-card-grid";

export function PayrollStats() {
  const employees = useEmployees();
  const runs = usePayrollRuns();

  const activeEmployees = employees.filter((e) => e.status !== "terminated");
  const monthlyGross = activeEmployees.reduce(
    (sum, e) => sum + calculateMonthlyPayroll(e).grossPay,
    0
  );
  const monthlyNet = activeEmployees.reduce(
    (sum, e) => sum + calculateMonthlyPayroll(e).netPay,
    0
  );

  const completedRuns = runs.filter((r) => r.status === "completed");
  const ytdNet = completedRuns.reduce((sum, r) => sum + r.totalNet, 0);

  const upcomingRun = runs.find((r) => r.status === "scheduled" || r.status === "processing");

  const stats: StatItem[] = [
    {
      label: "Next pay date",
      value: upcomingRun ? formatDate(upcomingRun.payDate, { day: "numeric", month: "short" }) : "-",
      detail: upcomingRun ? `${upcomingRun.employeeCount} ${plural(upcomingRun.employeeCount, "employee")}` : "No run scheduled",
      icon: CalendarClock,
      iconClassName: "bg-info/10 text-info",
    },
    {
      label: "Projected gross",
      value: <Currency amount={monthlyGross} />,
      detail: "Current roster, per month",
      icon: Banknote,
      iconClassName: "bg-primary/10 text-primary",
    },
    {
      label: "Projected net",
      value: <Currency amount={monthlyNet} />,
      detail: "After tax and deductions",
      icon: ReceiptText,
      iconClassName: "bg-success/10 text-success",
    },
    {
      label: "Year to date",
      value: <Currency amount={ytdNet} />,
      detail: `${completedRuns.length} completed runs`,
      icon: Users,
      iconClassName: "bg-warning/10 text-warning",
    },
  ];

  return <StatCardGrid stats={stats} />;
}
