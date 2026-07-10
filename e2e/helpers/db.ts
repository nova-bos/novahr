import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { E2E_EMAIL_PREFIX, E2E_EMAIL_SUFFIX, E2E_TENANT_PREFIX } from "./run-context";

/**
 * Direct database access for verification and cleanup. Uses DIRECT_URL from
 * the project .env, which points at the SAME Supabase project as production:
 * every query here must be scoped to E2E markers (tenant prefix or email
 * domain) and nothing else.
 */
function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  const raw = fs.readFileSync(path.join(__dirname, "..", "..", ".env"), "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

export async function withDb<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: loadEnv().DIRECT_URL });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

export async function getTenantByName(name: string) {
  if (!name.startsWith(E2E_TENANT_PREFIX)) {
    throw new Error(`Refusing to query non-E2E tenant "${name}"`);
  }
  return withDb(async (c) => {
    const r = await c.query('SELECT id, name, plan, "trialEndsAt" FROM "Tenant" WHERE name = $1', [name]);
    return r.rows[0] as { id: string; name: string; plan: string; trialEndsAt: Date | null } | undefined;
  });
}

/** Marks a Supabase auth user as email-confirmed so signup flows that would
 *  normally wait for a confirmation email can proceed in tests. */
export async function confirmAuthUser(email: string): Promise<void> {
  if (!email.startsWith(E2E_EMAIL_PREFIX) || !email.endsWith(E2E_EMAIL_SUFFIX)) {
    throw new Error(`Refusing to confirm non-E2E user "${email}"`);
  }
  await withDb((c) =>
    c.query("UPDATE auth.users SET email_confirmed_at = COALESCE(email_confirmed_at, now()) WHERE email = $1", [email])
  );
}

/** Deletes every E2E tenant (cascades to all tenant-scoped rows) and every
 *  E2E auth user, including leftovers from earlier crashed runs. */
export async function cleanupAllE2eData(): Promise<{ tenants: number; users: number }> {
  return withDb(async (c) => {
    const t = await c.query('DELETE FROM "Tenant" WHERE name LIKE $1', [`${E2E_TENANT_PREFIX} %`]);
    const u = await c.query("DELETE FROM auth.users WHERE email LIKE $1", [`${E2E_EMAIL_PREFIX}%${E2E_EMAIL_SUFFIX}`]);
    return { tenants: t.rowCount ?? 0, users: u.rowCount ?? 0 };
  });
}
