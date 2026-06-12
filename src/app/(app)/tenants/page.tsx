"use client";

import { PageHeader } from "@/components/layout/page-header";
import { TenantCard } from "@/components/tenants/tenant-card";
import { TenantProfile } from "@/components/tenants/tenant-profile";
import { useCurrentTenant, useTenants } from "@/lib/store/hooks";
import { useRoleGuard } from "@/lib/auth/use-role-guard";

export default function TenantsPage() {
  const allowed = useRoleGuard(["hr", "exco"]);
  const tenants = useTenants();
  const tenant = useCurrentTenant();

  if (!allowed) return null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tenants"
        description="Switch between connected companies and review their workspace settings."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {tenants.map((t) => (
          <TenantCard key={t.id} tenant={t} />
        ))}
      </div>
      <div className="space-y-4">
        <h3 className="text-sm font-semibold tracking-tight">{tenant.name} workspace</h3>
        <TenantProfile />
      </div>
    </div>
  );
}
