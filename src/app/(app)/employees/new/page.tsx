"use client";

import { PageHeader } from "@/components/layout/page-header";
import { OnboardingWizard } from "@/components/employees/onboarding/onboarding-wizard";
import { useRoleGuard } from "@/lib/auth/use-role-guard";

export default function NewEmployeePage() {
  const allowed = useRoleGuard(["hr"], "/employees");
  if (!allowed) return null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Add employee"
        description="Capture the details needed to add a new team member and kick off their onboarding checklist."
      />
      <OnboardingWizard />
    </div>
  );
}
