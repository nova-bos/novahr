"use client";

import { CalendarCheck, CalendarClock, CalendarX, ClipboardList } from "lucide-react";
import { useScopedEmployees, useScopedLeaveRequests } from "@/lib/auth/scope";
import { plural } from "@/lib/format";
import { StatCardGrid, type StatItem } from "@/components/dashboard/stat-card-grid";

export function LeaveStats() {
  const requests = useScopedLeaveRequests();
  const employees = useScopedEmployees();

  const pending = requests.filter((r) => r.status === "pending");
  const approved = requests.filter((r) => r.status === "approved");
  const rejected = requests.filter((r) => r.status === "rejected");

  const today = new Date().toISOString().slice(0, 10);
  const onLeaveToday = requests.filter((r) => {
    if (r.status !== "approved") return false;
    if (r.daySelections && r.daySelections.length > 0) {
      return r.daySelections.some((d) => d.date === today);
    }
    return r.startDate <= today && today <= r.endDate;
  });

  const totalDaysApproved = approved.reduce((sum, r) => sum + r.days, 0);

  const stats: StatItem[] = [
    {
      label: "Pending requests",
      value: pending.length.toString(),
      detail: pending.length === 1 ? "Awaiting review" : "Awaiting review",
      icon: ClipboardList,
      iconClassName: "bg-warning/10 text-warning",
    },
    {
      label: "On leave today",
      value: onLeaveToday.length.toString(),
      detail: `Out of ${employees.length} ${plural(employees.length, "employee")}`,
      icon: CalendarClock,
      iconClassName: "bg-info/10 text-info",
    },
    {
      label: "Approved this period",
      value: approved.length.toString(),
      detail: `${totalDaysApproved} ${plural(totalDaysApproved, "day")} total`,
      icon: CalendarCheck,
      iconClassName: "bg-success/10 text-success",
    },
    {
      label: "Declined this period",
      value: rejected.length.toString(),
      detail: "Requests rejected",
      icon: CalendarX,
      iconClassName: "bg-destructive/10 text-destructive",
    },
  ];

  return <StatCardGrid stats={stats} />;
}
