import { cleanupAllE2eData } from "./db";

/**
 * Removes everything the suite created from the shared database, regardless
 * of whether the run passed, failed, or a previous run crashed mid-way.
 */
export default async function globalTeardown(): Promise<void> {
  const { tenants, users } = await cleanupAllE2eData();
  console.log(`[e2e teardown] removed ${tenants} E2E tenant(s), ${users} E2E auth user(s)`);
}
