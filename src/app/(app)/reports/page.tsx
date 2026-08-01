"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PayrollReport } from "@/components/reports/payroll-report";
import { WorkforceReport } from "@/components/reports/workforce-report";
import { LeaveReport } from "@/components/reports/leave-report";
import { EquityReport } from "@/components/reports/equity-report";
import { ExpiryReport } from "@/components/reports/expiry-report";
import { OrgChart } from "@/components/reports/org-chart";
import { useRoleGuard } from "@/lib/auth/use-role-guard";

export default function ReportsPage() {
  const allowed = useRoleGuard(["hr", "exco"]);
  if (!allowed) return null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reports"
        description="Payroll, headcount and leave analytics for your workspace."
      />
      <Tabs defaultValue="payroll">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex min-w-max w-full">
            <TabsTrigger value="payroll">Payroll</TabsTrigger>
            <TabsTrigger value="workforce">Workforce</TabsTrigger>
            <TabsTrigger value="leave">Leave</TabsTrigger>
            <TabsTrigger value="equity">Equity</TabsTrigger>
            <TabsTrigger value="expiries">Reminders</TabsTrigger>
            <TabsTrigger value="structure">Structure</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="payroll" className="mt-4">
          <PayrollReport />
        </TabsContent>
        <TabsContent value="workforce" className="mt-4">
          <WorkforceReport />
        </TabsContent>
        <TabsContent value="leave" className="mt-4">
          <LeaveReport />
        </TabsContent>
        <TabsContent value="equity" className="mt-4">
          <EquityReport />
        </TabsContent>
        <TabsContent value="expiries" className="mt-4">
          <ExpiryReport />
        </TabsContent>
        <TabsContent value="structure" className="mt-4">
          <OrgChart />
        </TabsContent>
      </Tabs>
    </div>
  );
}
