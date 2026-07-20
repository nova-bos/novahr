"use client";

import { PageHeader } from "@/components/layout/page-header";
import { LeaveStats } from "@/components/leave/leave-stats";
import { NewLeaveRequestDialog } from "@/components/leave/new-leave-request-dialog";
import { LeaveRequestsTable } from "@/components/leave/leave-requests-table";
import { LeaveCalendar } from "@/components/leave/leave-calendar";
import { LeaveBalancesTable } from "@/components/leave/leave-balances-table";
import { LeavePolicies } from "@/components/leave/leave-policies";
import { PublicHolidaysCard } from "@/components/leave/public-holidays-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth/auth-provider";
import { useRoleGuard } from "@/lib/auth/use-role-guard";

const COPY: Record<string, { title: string; description: string }> = {
  hr: {
    title: "Leave",
    description: "Review requests, track balances and manage leave policies.",
  },
  manager: {
    title: "Leave",
    description: "Review your team's leave requests and balances.",
  },
  employee: {
    title: "My Leave",
    description: "Track your leave balance and request time off.",
  },
  exco: {
    title: "Leave",
    description: "An overview of leave activity across the organisation.",
  },
};

export default function LeavePage() {
  const allowed = useRoleGuard(["hr", "manager", "employee"]);
  const { user } = useAuth();
  if (!allowed) return null;
  const copy = COPY[user?.role ?? "hr"];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={copy.title} description={copy.description}>
        <NewLeaveRequestDialog />
      </PageHeader>
      <LeaveStats />
      <Tabs defaultValue="requests">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex min-w-max w-full">
            <TabsTrigger value="requests">Requests</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="balances">Balances</TabsTrigger>
            <TabsTrigger value="policies">Policies</TabsTrigger>
            <TabsTrigger value="holidays">Public holidays</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="requests" className="mt-4">
          <LeaveRequestsTable />
        </TabsContent>
        <TabsContent value="calendar" className="mt-4">
          <LeaveCalendar />
        </TabsContent>
        <TabsContent value="balances" className="mt-4">
          <LeaveBalancesTable />
        </TabsContent>
        <TabsContent value="policies" className="mt-4">
          <LeavePolicies />
        </TabsContent>
        <TabsContent value="holidays" className="mt-4">
          <PublicHolidaysCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
