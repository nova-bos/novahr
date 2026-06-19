import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

/**
 * Runs `fn` inside a Prisma transaction with the Postgres session variable
 * `app.tenant_id` set to `tenantId` for the duration of the transaction.
 *
 * RLS policies on tenant-scoped tables use this variable to enforce row-level
 * isolation: only rows where "tenantId" matches the session variable are
 * visible or writable.
 *
 * All server actions that touch tenant-scoped data must call this instead of
 * using the global `prisma` client directly.
 */
export async function runAsTenant<T>(
  tenantId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    return fn(tx);
  });
}
