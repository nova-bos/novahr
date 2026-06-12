"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Employee } from "@/lib/types";
import { ProfileHeader } from "./profile-header";
import { ProfileOverview } from "./profile-overview";
import { ProfileCompensation } from "./profile-compensation";
import { ProfileLeave } from "./profile-leave";
import { ProfileOnboarding } from "./profile-onboarding";
import { ProfileSidebar } from "./profile-sidebar";
import { EditEmployeeDialog } from "./edit-employee-dialog";

export function EmployeeProfile({ employee }: { employee: Employee }) {
  const [editOpen, setEditOpen] = React.useState(false);

  return (
    <div className="flex flex-col gap-6">
      <ProfileHeader employee={employee} onEdit={() => setEditOpen(true)} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="compensation">Compensation</TabsTrigger>
              <TabsTrigger value="leave">Leave</TabsTrigger>
              {employee.onboarding ? (
                <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
              ) : null}
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <ProfileOverview employee={employee} />
            </TabsContent>
            <TabsContent value="compensation" className="mt-4">
              <ProfileCompensation employee={employee} />
            </TabsContent>
            <TabsContent value="leave" className="mt-4">
              <ProfileLeave employee={employee} />
            </TabsContent>
            {employee.onboarding ? (
              <TabsContent value="onboarding" className="mt-4">
                <ProfileOnboarding employee={employee} />
              </TabsContent>
            ) : null}
          </Tabs>
        </div>

        <div className="lg:col-span-1">
          <ProfileSidebar employee={employee} />
        </div>
      </div>

      <EditEmployeeDialog employee={employee} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}
