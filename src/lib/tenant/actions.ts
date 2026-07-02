"use server";

import { runAsTenant } from "@/lib/db-context";
import { requireRole } from "@/lib/auth/require";
import { mapTenant } from "@/lib/workspace/mappers";
import type { PayFrequency, Tenant } from "@/lib/types";

export async function updateTenantProfile(data: {
  name?: string;
  legalName?: string;
  industry?: string;
  founded?: string;
  registrationNumber?: string;
  vatNumber?: string;
  city?: string;
  address?: string;
  primaryContact?: string;
}): Promise<Tenant> {
  const session = await requireRole("hr");
  const row = await runAsTenant(session.tenantId, (tx) =>
    tx.tenant.update({ where: { id: session.tenantId }, data })
  );
  return mapTenant(row);
}

export async function updateTenantPayrollSettings(data: {
  payFrequency?: PayFrequency;
  payDay?: number;
  bankName?: string;
}): Promise<Tenant> {
  const session = await requireRole("hr");
  const row = await runAsTenant(session.tenantId, (tx) =>
    tx.tenant.update({ where: { id: session.tenantId }, data })
  );
  return mapTenant(row);
}
