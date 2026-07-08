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
import { WelcomeModal } from "@/components/onboarding/welcome-modal";
import { useEmployees, useCurrentTenant } from "@/lib/store/hooks";

export function HRDashboard() {
  const employees = useEmployees();
  const tenant = useCurrentTenant();
  const isFirstTime = employees.length === 0;

  return (
    <div className="flex flex-col gap-6">
      {isFirstTime && (
        <WelcomeModal companyName={tenant.name} tenantId={tenant.id} />
      )}
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
