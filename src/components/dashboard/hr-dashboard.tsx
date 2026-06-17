"use client";

import { useEmployees } from "@/lib/store/hooks";
import { ActivityFeed } from "./activity-feed";
import { DashboardHeader } from "./dashboard-header";
import { DepartmentBreakdown } from "./department-breakdown";
import { GettingStartedCard } from "./getting-started-card";
import { LeaveApprovals } from "./leave-approvals";
import { PayrollTrendChart } from "./payroll-trend-chart";
import { QuickActions } from "./quick-actions";
import { StatCards } from "./stat-cards";
import { UpcomingPayrollCard } from "./upcoming-payroll-card";

export function HRDashboard() {
  const employees = useEmployees();

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader />
      {employees.length === 0 && <GettingStartedCard />}
      <StatCards />
      <div className="grid gap-4 lg:grid-cols-3">
        <PayrollTrendChart />
        <DepartmentBreakdown />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <ActivityFeed />
        <div className="flex flex-col gap-4">
          <UpcomingPayrollCard />
          <LeaveApprovals />
        </div>
      </div>
      <QuickActions />
    </div>
  );
}
