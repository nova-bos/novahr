"use client";

import * as React from "react";
import { PageHeader } from "@/components/layout/page-header";
import { TenantCard } from "@/components/tenants/tenant-card";
import { TenantProfile } from "@/components/tenants/tenant-profile";
import { useCurrentTenant } from "@/lib/store/hooks";
import { useRoleGuard } from "@/lib/auth/use-role-guard";
import { getAllTenants } from "@/lib/workspace/actions";
import { tenants as demoTenants } from "@/demo/tenants";
import type { Tenant } from "@/lib/types";

export default function TenantsPage() {
  const allowed = useRoleGuard(["hr", "exco"]);
  const tenant = useCurrentTenant();
  const [liveTenants, setLiveTenants] = React.useState<Tenant[]>([]);

  React.useEffect(() => {
    getAllTenants().then(setLiveTenants);
  }, []);

  // Use liveTenants if loaded, otherwise fall back to the demo array (handles loading state)
  const displayTenants = liveTenants.length > 0 ? liveTenants : demoTenants;

  if (!allowed) return null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tenants"
        description="Switch between connected companies and review their workspace settings."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {displayTenants.map((t) => (
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
