"use server";

import { prisma } from "@/lib/prisma";
import { mapTenant } from "@/lib/workspace/mappers";
import type { PayFrequency, Tenant } from "@/lib/types";

export async function updateTenantProfile(
  tenantId: string,
  data: {
    name?: string;
    legalName?: string;
    industry?: string;
    founded?: string;
    registrationNumber?: string;
    vatNumber?: string;
    city?: string;
    address?: string;
    primaryContact?: string;
  }
): Promise<Tenant> {
  const row = await prisma.tenant.update({ where: { id: tenantId }, data });
  return mapTenant(row);
}

export async function updateTenantPayrollSettings(
  tenantId: string,
  data: {
    payFrequency?: PayFrequency;
    payDay?: number;
    bankName?: string;
  }
): Promise<Tenant> {
  const row = await prisma.tenant.update({ where: { id: tenantId }, data });
  return mapTenant(row);
}
