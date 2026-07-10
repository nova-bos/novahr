import fs from "node:fs";
import path from "node:path";

/**
 * Identity for one E2E run. Every journey shares the disposable tenant this
 * run signs up, and global teardown deletes anything matching these markers,
 * so the markers must never collide with real customer data.
 *
 * Auth emails use plus-addressing on a real inbox because Supabase hosted
 * auth rejects unresolvable domains at signup. Each run triggers one
 * Supabase confirmation email to the +e2e- address; filter on "+e2e-" in
 * Gmail to archive them.
 */
export const E2E_EMAIL_PREFIX = "mtshwenewesley+e2e-";
export const E2E_EMAIL_SUFFIX = "@gmail.com";
export const E2E_TENANT_PREFIX = "E2E Test Co";

// Outside the repo: files written into the project tree trigger the Next.js
// dev watcher and destabilize the app under test.
const CONTEXT_FILE = path.join("/tmp", "novahr-e2e", "run-context.json");

export interface RunContext {
  runId: string;
  tenantName: string;
  hrEmail: string;
  hrName: string;
  hrPassword: string;
  managerEmail: string;
  managerPassword: string;
}

export function createRunContext(): RunContext {
  const runId = Date.now().toString(36);
  const ctx: RunContext = {
    runId,
    tenantName: `${E2E_TENANT_PREFIX} ${runId}`,
    hrEmail: `${E2E_EMAIL_PREFIX}hr-${runId}${E2E_EMAIL_SUFFIX}`,
    hrName: "Erin Tester",
    hrPassword: `E2e-Passw0rd-${runId}`,
    managerEmail: `${E2E_EMAIL_PREFIX}mgr-${runId}${E2E_EMAIL_SUFFIX}`,
    managerPassword: `E2e-Manager-${runId}`,
  };
  fs.mkdirSync(path.dirname(CONTEXT_FILE), { recursive: true });
  fs.writeFileSync(CONTEXT_FILE, JSON.stringify(ctx, null, 2));
  return ctx;
}

export function loadRunContext(): RunContext {
  return JSON.parse(fs.readFileSync(CONTEXT_FILE, "utf8")) as RunContext;
}
