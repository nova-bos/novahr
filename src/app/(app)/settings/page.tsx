"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanySettings } from "@/components/settings/company-settings";
import { PayrollSettings } from "@/components/settings/payroll-settings";
import { PayrollTaxSettings } from "@/components/settings/payroll-tax-settings";
import { LeavePolicySettings } from "@/components/settings/leave-policy-settings";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { useCurrentTenant } from "@/lib/store/hooks";
import { useRoleGuard } from "@/lib/auth/use-role-guard";
import { usePlan } from "@/lib/plan/use-plan";

export default function SettingsPage() {
  const allowed = useRoleGuard(["hr"]);
  const tenant = useCurrentTenant();
  const { can } = usePlan();

  if (!allowed) return null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Settings"
        description="Manage your company profile, payroll configuration and leave policies."
      />
      <Tabs defaultValue="company" key={tenant.id}>
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex min-w-max w-full">
            <TabsTrigger value="company">Company</TabsTrigger>
            <TabsTrigger value="payroll">Payroll</TabsTrigger>
            <TabsTrigger value="leave">Leave policies</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="company" className="mt-4">
          <CompanySettings />
        </TabsContent>
        <TabsContent value="payroll" className="mt-4">
          <div className="flex flex-col gap-6">
            <PayrollSettings />
            {can("payrollSettings") ? <PayrollTaxSettings /> : null}
          </div>
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
