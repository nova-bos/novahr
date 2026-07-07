"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Employee } from "@/lib/types";
import { ProfileHeader } from "./profile-header";
import { ProfileOverview } from "./profile-overview";
import { ProfileCompensation } from "./profile-compensation";
import { ProfileLeave } from "./profile-leave";
import { ProfileDeductions } from "./profile-deductions";
import { ProfileDocuments } from "./profile-documents";
import { ProfileEquity } from "./profile-equity";
import { ProfileOnboarding } from "./profile-onboarding";
import { ProfileSidebar } from "./profile-sidebar";
import { PayrollProfileSection } from "./payroll-profile-section";
import { EditEmployeeDialog } from "./edit-employee-dialog";
import { TerminateEmployeeDialog } from "./terminate-employee-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/auth-provider";

export function EmployeeProfile({ employee }: { employee: Employee }) {
  const [editOpen, setEditOpen] = React.useState(false);
  const [terminateOpen, setTerminateOpen] = React.useState(false);
  const { user } = useAuth();

  return (
    <div className="flex flex-col gap-6">
      <ProfileHeader employee={employee} onEdit={() => setEditOpen(true)} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Tabs defaultValue="overview">
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <TabsList className="inline-flex min-w-max w-full">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="compensation">Compensation</TabsTrigger>
                <TabsTrigger value="leave">Leave</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                {employee.onboarding ? (
                  <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
                ) : null}
              </TabsList>
            </div>

            <TabsContent value="overview" className="mt-4 flex flex-col gap-6">
              <ProfileOverview employee={employee} />
              <ProfileEquity employee={employee} />
            </TabsContent>
            <TabsContent value="compensation" className="mt-4 flex flex-col gap-6">
              <ProfileCompensation employee={employee} />
              <ProfileDeductions employee={employee} />
            </TabsContent>
            <TabsContent value="leave" className="mt-4">
              <ProfileLeave employee={employee} />
            </TabsContent>
            <TabsContent value="documents" className="mt-4">
              <ProfileDocuments employee={employee} />
            </TabsContent>
            {employee.onboarding ? (
              <TabsContent value="onboarding" className="mt-4">
                <ProfileOnboarding employee={employee} />
              </TabsContent>
            ) : null}
          </Tabs>
        </div>

        <div className="lg:col-span-1 flex flex-col gap-6">
          <ProfileSidebar employee={employee} />
          <PayrollProfileSection employeeId={employee.id} />
        </div>
      </div>

      {user?.role === "hr" && employee.status !== "terminated" ? (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-destructive text-base">Danger zone</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Terminate employment</p>
                <p className="text-xs text-muted-foreground">
                  This action will change the employee status to terminated and deactivate their
                  payroll profile.
                </p>
              </div>
              <Button variant="destructive" size="sm" onClick={() => setTerminateOpen(true)}>
                Terminate
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <EditEmployeeDialog employee={employee} open={editOpen} onOpenChange={setEditOpen} />
      <TerminateEmployeeDialog
        employee={employee}
        open={terminateOpen}
        onOpenChange={setTerminateOpen}
      />
    </div>
  );
}
