"use server";

import { runAsTenant } from "@/lib/db-context";
import { requireTenant, requireActiveSubscription } from "@/lib/auth/require";
import type { TenantTransactionClient } from "@/lib/prisma";

export interface EmployeeNumberConfig {
  prefix: string;
  padLength: number;
  separator: string;
  nextNumber: number;
}

export async function getEmployeeNumberConfigAction(
  tenantId: string
): Promise<EmployeeNumberConfig> {
  await requireTenant(tenantId, "hr");
  return runAsTenant(tenantId, async (tx) => {
    const config = await tx.employeeNumberConfig.findUnique({ where: { tenantId } });
    return config ?? { prefix: "EMP", padLength: 4, separator: "-", nextNumber: 1 };
  });
}

export async function updateEmployeeNumberConfigAction(
  tenantId: string,
  data: { prefix: string; padLength: number; separator: string }
): Promise<{ success: boolean; error?: string }> {
  await requireTenant(tenantId, "hr");
  await requireActiveSubscription(tenantId);
  if (!data.prefix || data.prefix.length > 6)
    return { success: false, error: "Prefix must be 1 to 6 characters." };
  if (data.padLength < 1 || data.padLength > 8)
    return { success: false, error: "Pad length must be 1 to 8." };
  return runAsTenant(tenantId, async (tx) => {
    await tx.employeeNumberConfig.upsert({
      where: { tenantId },
      update: {
        prefix: data.prefix.toUpperCase(),
        padLength: data.padLength,
        separator: data.separator,
      },
      create: {
        tenantId,
        prefix: data.prefix.toUpperCase(),
        padLength: data.padLength,
        separator: data.separator,
        nextNumber: 1,
      },
    });
    return { success: true };
  });
}

export async function retroactivelyRenumberEmployeesAction(
  tenantId: string,
  data: { prefix: string; padLength: number; separator: string }
): Promise<{ success: boolean; count?: number; error?: string }> {
  await requireTenant(tenantId, "hr");
  await requireActiveSubscription(tenantId);
  if (!data.prefix || data.prefix.length > 6)
    return { success: false, error: "Prefix must be 1 to 6 characters." };
  if (data.padLength < 1 || data.padLength > 8)
    return { success: false, error: "Pad length must be 1 to 8." };

  return runAsTenant(tenantId, async (tx) => {
    const employees = await tx.employee.findMany({
      where: { tenantId },
      select: { id: true },
      orderBy: [{ startDate: "asc" }, { createdAt: "asc" }],
    });

    const prefix = data.prefix.toUpperCase();
    const sep = data.separator;

    await Promise.all(
      employees.map((emp, i) => {
        const num = i + 1;
        const employeeNumber = `${prefix}${sep}${String(num).padStart(data.padLength, "0")}`;
        return tx.employee.update({ where: { id: emp.id }, data: { employeeNumber } });
      })
    );

    await tx.employeeNumberConfig.upsert({
      where: { tenantId },
      update: { prefix, separator: sep, padLength: data.padLength, nextNumber: employees.length + 1 },
      create: { tenantId, prefix, separator: sep, padLength: data.padLength, nextNumber: employees.length + 1 },
    });

    return { success: true, count: employees.length };
  });
}

/**
 * Called inside createEmployeeRecord to claim the next employee number atomically.
 * The tx parameter must be a Prisma transaction client.
 */
export async function claimNextEmployeeNumber(
  tenantId: string,
  tx: TenantTransactionClient
): Promise<string> {
  const config = await tx.employeeNumberConfig.upsert({
    where: { tenantId },
    update: { nextNumber: { increment: 1 } },
    create: { tenantId, prefix: "EMP", padLength: 4, separator: "-", nextNumber: 2 },
  });
  // nextNumber is AFTER increment, so the claimed number is nextNumber - 1
  const num = config.nextNumber - 1;
  return `${config.prefix}${config.separator}${String(num).padStart(config.padLength, "0")}`;
}
