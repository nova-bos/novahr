import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

/**
 * Runs `fn` inside a Prisma transaction with the Postgres session variable
 * `app.tenant_id` set to `tenantId` for the duration of the transaction.
 *
 * IMPORTANT: tenant isolation is enforced in APPLICATION CODE, not by the
 * database. The runtime DB role carries BYPASSRLS, so the row-level security
 * policies that reference `app.tenant_id` do NOT constrain these queries at
 * runtime. This helper sets the variable (so RLS would work if the role ever
 * loses BYPASSRLS), but the real protection is that every query inside `fn`
 * MUST carry an explicit `where: { tenantId }` predicate. Never rely on this
 * helper alone to scope a query.
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
