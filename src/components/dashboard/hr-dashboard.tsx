"use client";

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
  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader />
      <GettingStartedCard />
      <StatCards />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <PayrollTrendChart />
        <DepartmentBreakdown />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
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
