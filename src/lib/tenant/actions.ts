"use server";

import { runAsTenant } from "@/lib/db-context";
import { requireRole } from "@/lib/auth/require";
import { mapTenant } from "@/lib/workspace/mappers";
import { prisma } from "@/lib/prisma";
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
  const [row] = await Promise.all([
    runAsTenant(session.tenantId, (tx) =>
      tx.tenant.update({ where: { id: session.tenantId }, data })
    ),
    prisma.$transaction(async (tx) => {
      const existing = await tx.payrollSettings.findUnique({
        where: { tenantId: session.tenantId },
        select: { payrollConfiguredAt: true },
      });
      await tx.payrollSettings.upsert({
        where: { tenantId: session.tenantId },
        update: { payrollConfiguredAt: existing?.payrollConfiguredAt ?? new Date() },
        create: { tenantId: session.tenantId, payrollConfiguredAt: new Date() },
      });
    }),
  ]);
  return mapTenant(row);
}
