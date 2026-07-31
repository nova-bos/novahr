"use client";

import * as React from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanySettings } from "@/components/settings/company-settings";
import { EmployeeNumberSettings } from "@/components/settings/employee-number-settings";
import { CustomFieldsSettings } from "@/components/settings/custom-fields-settings";
import { PayrollSettings } from "@/components/settings/payroll-settings";
import { PayrollTaxSettings } from "@/components/settings/payroll-tax-settings";
import { BenefitsSettings } from "@/components/settings/benefits-settings";
import { NetcashSettings } from "@/components/settings/netcash-settings";
import { PayslipStudio } from "@/components/settings/payslip-studio";
import { LeavePolicySettings } from "@/components/settings/leave-policy-settings";
import { BirthdayCalendarSettings } from "@/components/settings/birthday-calendar-settings";
import { DepartmentSettings } from "@/components/settings/department-settings";
import { BranchSettings } from "@/components/settings/branch-settings";
import { UserSettings } from "@/components/settings/user-settings";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { AuditLog } from "@/components/settings/audit-log";
import { SettingsSection } from "@/components/settings/settings-section";
import { useCurrentTenant } from "@/lib/store/hooks";
import { useRoleGuard } from "@/lib/auth/use-role-guard";
import { usePlan } from "@/lib/plan/use-plan";

export default function SettingsPage() {
  const allowed = useRoleGuard(["hr"]);
  const tenant = useCurrentTenant();
  const { can } = usePlan();

  const validTabs = React.useMemo(
    () => [
      "company",
      "users",
      "departments",
      "branches",
      ...(can("payrollSettings") ? ["payroll"] : []),
      "leave",
      "notifications",
      "appearance",
      "audit",
    ],
    [can],
  );

  // Open the tab named in the ?tab= query parameter (used by the dashboard
  // getting-started links and the welcome modal). Read on mount from the URL to
  // avoid a hydration mismatch; the user can switch tabs freely afterwards.
  const [tab, setTab] = React.useState("company");
  React.useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("tab");
    if (requested && validTabs.includes(requested)) setTab(requested);
  }, [validTabs]);

  if (!allowed) return null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Settings"
        description="Manage your company profile, payroll configuration and leave policies."
      />
      <Tabs value={tab} onValueChange={setTab} key={tenant.id}>
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex min-w-max w-full">
            <TabsTrigger value="company">Company</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="branches">Branches</TabsTrigger>
            {can("payrollSettings") ? (
              <TabsTrigger value="payroll">Payroll</TabsTrigger>
            ) : null}
            <TabsTrigger value="leave">Leave policies</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="audit">Audit log</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="company" className="mt-4">
          <div className="flex flex-col gap-4">
            <SettingsSection
              title="Company profile"
              description="Legal details, registration and contact information."
              defaultOpen
            >
              <CompanySettings />
            </SettingsSection>
            <SettingsSection
              title="Employee numbering"
              description="Prefix and sequence used for new employee numbers."
            >
              <EmployeeNumberSettings />
            </SettingsSection>
            <SettingsSection
              title="Custom fields"
              description="Extra fields captured on every employee profile."
            >
              <CustomFieldsSettings />
            </SettingsSection>
          </div>
        </TabsContent>
        <TabsContent value="users" className="mt-4">
          <UserSettings />
        </TabsContent>
        <TabsContent value="departments" className="mt-4">
          <DepartmentSettings />
        </TabsContent>
        <TabsContent value="branches" className="mt-4">
          <BranchSettings />
        </TabsContent>
        {can("payrollSettings") ? (
          <TabsContent value="payroll" className="mt-4">
            <div className="flex flex-col gap-4">
              <SettingsSection
                title="Pay run configuration"
                description="Pay frequency, pay day, statutory references and defaults."
                defaultOpen
              >
                <PayrollSettings />
              </SettingsSection>
              <SettingsSection
                title="SDL and UIF"
                description="Statutory tax rates and contribution ceilings."
              >
                <PayrollTaxSettings />
              </SettingsSection>
              <SettingsSection
                title="Benefits offered"
                description="Whether your company offers a pension or medical aid contribution."
              >
                <BenefitsSettings />
              </SettingsSection>
              <SettingsSection
                title="Netcash integration"
                description="Service keys, environment and payment instruction."
              >
                <NetcashSettings />
              </SettingsSection>
            </div>
          </TabsContent>
        ) : null}
        <TabsContent value="leave" className="mt-4 flex flex-col gap-6">
          <LeavePolicySettings />
          <BirthdayCalendarSettings />
        </TabsContent>
        <TabsContent value="notifications" className="mt-4">
          <NotificationSettings />
        </TabsContent>
        <TabsContent value="appearance" className="mt-4">
          <div className="flex flex-col gap-6">
            <AppearanceSettings />
            {can("payrollSettings") ? <PayslipStudio /> : null}
          </div>
        </TabsContent>
        <TabsContent value="audit" className="mt-4">
          <AuditLog />
        </TabsContent>
      </Tabs>
    </div>
  );
}
