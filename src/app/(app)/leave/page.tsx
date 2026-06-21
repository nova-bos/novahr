"use client";

import { PageHeader } from "@/components/layout/page-header";
import { LeaveStats } from "@/components/leave/leave-stats";
import { NewLeaveRequestDialog } from "@/components/leave/new-leave-request-dialog";
import { LeaveRequestsTable } from "@/components/leave/leave-requests-table";
import { LeaveBalancesTable } from "@/components/leave/leave-balances-table";
import { LeavePolicies } from "@/components/leave/leave-policies";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth/auth-provider";

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
  const { user } = useAuth();
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
            <TabsTrigger value="balances">Balances</TabsTrigger>
            <TabsTrigger value="policies">Policies</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="requests" className="mt-4">
          <LeaveRequestsTable />
        </TabsContent>
        <TabsContent value="balances" className="mt-4">
          <LeaveBalancesTable />
        </TabsContent>
        <TabsContent value="policies" className="mt-4">
          <LeavePolicies />
        </TabsContent>
      </Tabs>
    </div>
  );
}
