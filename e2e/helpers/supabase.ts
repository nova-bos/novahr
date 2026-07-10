import fs from "node:fs";
import path from "node:path";
import { E2E_EMAIL_PREFIX, E2E_EMAIL_SUFFIX } from "./run-context";

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  const raw = fs.readFileSync(path.join(__dirname, "..", "..", ".env"), "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

/**
 * Creates a confirmed Supabase auth user through the GoTrue admin API.
 *
 * The suite cannot drive the real email-confirmation signup repeatedly:
 * Supabase's built-in mailer is limited to a handful of emails per hour, so
 * each UI signup would burn one and the second run of the day would hit
 * "email rate limit exceeded". Journey A therefore provisions the auth user
 * here (no email involved) and drives the in-app company setup UI, which
 * exercises the same server-side tenant bootstrap. Revisit once custom SMTP
 * is configured in Supabase.
 */
export async function createConfirmedAuthUser(email: string, password: string): Promise<void> {
  if (!email.startsWith(E2E_EMAIL_PREFIX) || !email.endsWith(E2E_EMAIL_SUFFIX)) {
    throw new Error(`Refusing to create non-E2E auth user "${email}"`);
  }
  const env = loadEnv();
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!res.ok) {
    throw new Error(`Admin user creation failed (${res.status}): ${await res.text()}`);
  }
}
