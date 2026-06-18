"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanySettings } from "@/components/settings/company-settings";
import { PayrollSettings } from "@/components/settings/payroll-settings";
import { LeavePolicySettings } from "@/components/settings/leave-policy-settings";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { useCurrentTenant } from "@/lib/store/hooks";
import { useRoleGuard } from "@/lib/auth/use-role-guard";

export default function SettingsPage() {
  const allowed = useRoleGuard(["hr"]);
  const tenant = useCurrentTenant();

  if (!allowed) return null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Settings"
        description="Manage your company profile, payroll configuration and leave policies."
      />
      <Tabs defaultValue="company" key={tenant.id}>
        <TabsList>
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="leave">Leave policies</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>
        <TabsContent value="company" className="mt-4">
          <CompanySettings />
        </TabsContent>
        <TabsContent value="payroll" className="mt-4">
          <PayrollSettings />
        </TabsContent>
        <TabsContent value="leave" className="mt-4">
          <LeavePolicySettings />
        </TabsContent>
        <TabsContent value="notifications" className="mt-4">
          <NotificationSettings />
        </TabsContent>
        <TabsContent value="appearance" className="mt-4">
          <AppearanceSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
