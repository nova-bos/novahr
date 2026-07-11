import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { workingDaysBetween } from "../src/lib/leave/business-days";
import { createRunContext, type RunContext } from "./helpers/run-context";
import { getTenantByName, withDb } from "./helpers/db";
import { createConfirmedAuthUser } from "./helpers/supabase";

/**
 * The five golden journeys from docs/TESTING_ROADMAP.md section 3, run as one
 * serial chain inside a disposable tenant created through the real /signup
 * flow. The chain is order-dependent by design: a failure aborts the rest of
 * the run, and global teardown removes the tenant either way.
 *
 * Numeric payroll correctness (PAYE tables, MATC, UIF caps, ETI) is covered
 * by the unit suite; this suite asserts the flows a customer walks through.
 */

test.describe.configure({ mode: "serial" });

let ctx: RunContext;
let tenantId: string;
let hrPage: Page;
let hrContext: BrowserContext;

const EMPLOYEE = {
  firstName: "Thandi",
  lastName: "Mokoena",
  email: "thandi.mokoena@novahr-e2e.dev",
  // saPhone rejects spaces (even though the UI example shows them, a known
  // UX nit), so use the compact form.
  phone: "0712345678",
  idNumber: "8001015009087", // Luhn-valid fixture from sa.test.ts
  jobTitle: "Software Engineer",
  location: "Johannesburg",
  annualGross: "600000",
  accountNumber: "1234567890",
  branchCode: "632005",
};

/** Next weekday-only range of `days` working days, starting at least
 *  `fromOffset` days out, entirely inside the current month (so unpaid leave
 *  lands in the current payroll period). Falls back to earlier days of the
 *  month if the month is nearly over. */
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function loginAs(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator("button[type=submit]").click();
  await page.waitForURL("**/dashboard", { timeout: 30_000 });
  await expect(page.getByText("Loading NovaHR")).toHaveCount(0, { timeout: 60_000 });
}

test.beforeAll(async ({ browser }) => {
  ctx = createRunContext();
  hrContext = await browser.newContext();
  hrPage = await hrContext.newPage();
});

test.afterAll(async () => {
  await hrContext?.close();
});

test("journey A: new customer signup, departments, first employee", async () => {
  const page = hrPage;

  // Auth user is provisioned via the admin API (see helpers/supabase.ts for
  // why the email-confirmation signup cannot run repeatedly), then the
  // in-app company setup drives the same server-side tenant bootstrap.
  await createConfirmedAuthUser(ctx.hrEmail, ctx.hrPassword);
  await page.goto("/login");
  await page.locator("#email").fill(ctx.hrEmail);
  await page.locator("#password").fill(ctx.hrPassword);
  await page.locator("button[type=submit]").click();
  // Wait for the Supabase session cookie: navigating away earlier aborts the
  // in-flight login action and /signup/complete then has no session.
  await page.waitForFunction(() => document.cookie.includes("-auth-token"), undefined, {
    timeout: 60_000,
  });

  await page.goto("/signup/complete");
  // Input events fired before React hydrates never reach component state, so
  // the submit stays disabled even though the DOM shows the value. Wait for
  // the page to settle, then type with real key events, retrying until
  // hydrated React enables the button.
  await page.waitForLoadState("networkidle");
  const companyInput = page.locator("#companyName");
  const createBtn = page.getByRole("button", { name: "Create my workspace" });
  await expect(async () => {
    await companyInput.fill("");
    await companyInput.click();
    await page.keyboard.type(ctx.tenantName, { delay: 30 });
    await expect(createBtn).toBeEnabled({ timeout: 2_000 });
    await expect(companyInput).toHaveValue(ctx.tenantName);
  }).toPass({ timeout: 90_000 });
  await page.getByRole("button", { name: "Create my workspace" }).click();
  await page.waitForURL("**/dashboard", { timeout: 60_000 });
  await expect(page.getByText("Loading NovaHR")).toHaveCount(0, { timeout: 60_000 });

  // Empty dashboard shows the Getting started card.
  await expect(page.getByText("Getting started")).toBeVisible({ timeout: 30_000 });

  // Trial tenant exists with trialEndsAt ~14 days out.
  const tenant = await getTenantByName(ctx.tenantName);
  expect(tenant).toBeTruthy();
  tenantId = tenant!.id;
  expect(tenant!.plan).toBe("trial");
  const daysOut = (tenant!.trialEndsAt!.getTime() - Date.now()) / 86_400_000;
  expect(daysOut).toBeGreaterThan(13);
  expect(daysOut).toBeLessThan(15);

  // Create two departments in Settings > Departments.
  await page.goto("/settings");
  await page.getByRole("tab", { name: "Departments" }).click();
  for (const dept of ["Engineering", "Operations"]) {
    await page.getByRole("button", { name: "Add department" }).click();
    await page.locator("#dept-name").fill(dept);
    await page.getByRole("dialog").getByRole("button", { name: /Add department|Create/ }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByText(dept, { exact: true })).toBeVisible();
  }

  // Onboarding wizard, all four steps.
  await page.goto("/employees/new");
  await page.locator("#firstName").fill(EMPLOYEE.firstName);
  await page.locator("#lastName").fill(EMPLOYEE.lastName);
  await page.locator("#email").fill(EMPLOYEE.email);
  await page.locator("#phone").fill(EMPLOYEE.phone);
  await page.locator("#idNumber").fill(EMPLOYEE.idNumber);
  await page.getByRole("button", { name: "Continue" }).click();

  await page.locator("#jobTitle").fill(EMPLOYEE.jobTitle);
  await page.locator("#department").click();
  await page.getByRole("option", { name: "Engineering" }).click();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  await page.locator("#startDate").fill(isoDate(monthStart));
  await page.locator("#location").fill(EMPLOYEE.location);
  await page.getByRole("button", { name: "Continue" }).click();

  await page.locator("#annualGross").fill(EMPLOYEE.annualGross);
  await page.locator("#bank").click();
  await page.getByRole("option").first().click();
  await page.locator("#accountNumber").fill(EMPLOYEE.accountNumber);
  // Branch code is set silently from the selected bank's universal code.
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByRole("button", { name: "Create employee" }).click();
  // Success lands on the new employee's profile (/employees/<id>). Waiting
  // for a bare **/employees** would match /employees/new and race the
  // in-flight creation action.
  await page.waitForURL(/\/employees\/(?!new)[\w-]+/, { timeout: 60_000 });

  // Employee appears in the directory with an employee number. New hires
  // start in onboarding status, so widen the default Active-only filter.
  await page.goto("/employees");
  await page.getByRole("combobox").filter({ hasText: "Active" }).click();
  await page.getByRole("option", { name: "All statuses" }).click();
  await expect(page.getByText(`${EMPLOYEE.firstName} ${EMPLOYEE.lastName}`)).toBeVisible({
    timeout: 30_000,
  });
  const empNumber = await withDb(async (c) => {
    const r = await c.query(
      'SELECT "employeeNumber" FROM "Employee" WHERE "tenantId" = $1 AND "lastName" = $2',
      [tenantId, EMPLOYEE.lastName]
    );
    return r.rows[0]?.employeeNumber as string | undefined;
  });
  expect(empNumber).toBeTruthy();
});

test("journey B: invite a manager, accept, revoked link dies", async ({ browser }) => {
  const page = hrPage;

  // Invite a manager; with no RESEND_API_KEY locally the dialog surfaces the
  // one-time link for manual sharing.
  await page.goto("/settings");
  await page.getByRole("tab", { name: "Users" }).click();
  await page.getByRole("button", { name: "Invite user" }).click();
  await page.locator("#invite-name").fill("Mandla Dube");
  await page.locator("#invite-email").fill(ctx.managerEmail);
  await page.locator("#invite-role").click();
  await page.getByRole("option", { name: /Manager/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Send invitation" }).click();

  const linkInput = page.getByRole("dialog").locator("input[readonly]");
  await expect(linkInput).toBeVisible({ timeout: 15_000 });
  const inviteUrl = await linkInput.inputValue();
  expect(inviteUrl).toContain("/accept-invite/");
  await page.keyboard.press("Escape");

  // Accept in a fresh browser context (separate session from HR).
  const mgrContext = await browser.newContext();
  const mgrPage = await mgrContext.newPage();
  await mgrPage.goto(inviteUrl);
  await expect(mgrPage.getByText(`Join ${ctx.tenantName} on NovaHR.`)).toBeVisible({
    timeout: 30_000,
  });
  await mgrPage.locator("#password").fill(ctx.managerPassword);
  await mgrPage.locator("#confirmPassword").fill(ctx.managerPassword);
  await mgrPage.getByRole("button", { name: "Accept and join" }).click();
  await mgrPage.waitForURL("**/dashboard", { timeout: 60_000 });
  await expect(mgrPage.getByText("Loading NovaHR")).toHaveCount(0, { timeout: 60_000 });

  // Manager role: no Settings entry in the nav.
  await expect(mgrPage.getByRole("link", { name: "Dashboard" }).first()).toBeVisible();
  await expect(mgrPage.getByRole("link", { name: "Settings" })).toHaveCount(0);
  await mgrContext.close();

  // Second invite gets revoked; its link must stop working.
  await page.getByRole("button", { name: "Invite user" }).click();
  await page.locator("#invite-name").fill("Revoked Person");
  await page.locator("#invite-email").fill(`e2e-revoked-${ctx.runId}@novahr-e2e.dev`);
  await page.getByRole("dialog").getByRole("button", { name: "Send invitation" }).click();
  const revokedInput = page.getByRole("dialog").locator("input[readonly]");
  await expect(revokedInput).toBeVisible({ timeout: 15_000 });
  const revokedUrl = await revokedInput.inputValue();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /Revoke/ }).first().click();

  const probeContext = await browser.newContext();
  const probePage = await probeContext.newPage();
  await probePage.goto(revokedUrl);
  await expect(probePage.getByText(/invalid|expired|revoked|no longer/i).first()).toBeVisible({
    timeout: 30_000,
  });
  await probeContext.close();
});

test("journey C: leave lifecycle with weekend exclusion and unpaid leave", async () => {
  const page = hrPage;

  // Annual leave spanning a weekend: Thursday through next Tuesday.
  const thursday = new Date();
  thursday.setUTCDate(thursday.getUTCDate() + ((4 - thursday.getUTCDay() + 7) % 7 || 7));
  const tuesday = new Date(thursday);
  tuesday.setUTCDate(thursday.getUTCDate() + 5);
  const expectedDays = workingDaysBetween(isoDate(thursday), isoDate(tuesday));
  expect(expectedDays).toBeLessThan(6); // sanity: the weekend was excluded

  await page.goto("/leave");
  await page.getByRole("button", { name: "Request leave" }).click();
  await page.locator("#employee").click();
  await page.getByRole("option", { name: new RegExp(EMPLOYEE.lastName) }).click();
  await page.locator("#startDate").fill(isoDate(thursday));
  await page.locator("#endDate").fill(isoDate(tuesday));
  await page.locator("#reason").fill("Family visit");
  await page.getByRole("dialog").getByRole("button", { name: /Submit|Request/ }).click();
  await expect(page.getByRole("dialog")).toBeHidden({ timeout: 15_000 });

  const annual = await withDb(async (c) => {
    const r = await c.query(
      'SELECT id, days, status FROM "LeaveRequest" WHERE "tenantId" = $1 AND type = $2',
      [tenantId, "annual"]
    );
    return r.rows[0] as { id: string; days: number; status: string };
  });
  expect(Number(annual.days)).toBe(expectedDays);

  // Weekend-only range is rejected before it ever reaches the server.
  const saturday = new Date(thursday);
  saturday.setUTCDate(thursday.getUTCDate() + 2);
  const sunday = new Date(thursday);
  sunday.setUTCDate(thursday.getUTCDate() + 3);
  await page.getByRole("button", { name: "Request leave" }).click();
  await page.locator("#employee").click();
  await page.getByRole("option", { name: new RegExp(EMPLOYEE.lastName) }).click();
  await page.locator("#startDate").fill(isoDate(saturday));
  await page.locator("#endDate").fill(isoDate(sunday));
  await page.locator("#reason").fill("Weekend only");
  await page.getByRole("dialog").getByRole("button", { name: /Submit|Request/ }).click();
  await expect(page.getByText(/no working days/i)).toBeVisible({ timeout: 15_000 });
  await page.keyboard.press("Escape");

  // Approve the annual request; balance decrements by the working-day count.
  await page.goto("/leave");
  await page.getByRole("button", { name: /^Approve$/ }).first().click();
  await expect
    .poll(
      async () =>
        withDb(async (c) => {
          const r = await c.query('SELECT status FROM "LeaveRequest" WHERE id = $1', [annual.id]);
          return r.rows[0]?.status as string;
        }),
      { timeout: 20_000 }
    )
    .toBe("approved");
  const used = await withDb(async (c) => {
    const r = await c.query(
      `SELECT lb.used FROM "LeaveBalance" lb
       JOIN "Employee" e ON e.id = lb."employeeId"
       WHERE e."tenantId" = $1 AND e."lastName" = $2 AND lb.type = 'annual'`,
      [tenantId, EMPLOYEE.lastName]
    );
    return Number(r.rows[0]?.used ?? 0);
  });
  expect(used).toBe(expectedDays);

  // Approved unpaid leave inside the current month; journey D asserts it
  // lands on the payslip as an Unpaid Leave deduction (regression coverage
  // for the CV-3 wiring).
  const today = new Date();
  const inMonth = (d: Date) => d.getUTCMonth() === today.getUTCMonth();
  const unpaidStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 2));
  while (workingDaysBetween(isoDate(unpaidStart), isoDate(unpaidStart)) === 0 && inMonth(unpaidStart)) {
    unpaidStart.setUTCDate(unpaidStart.getUTCDate() + 1);
  }
  await page.getByRole("button", { name: "Request leave" }).click();
  await page.locator("#employee").click();
  await page.getByRole("option", { name: new RegExp(EMPLOYEE.lastName) }).click();
  await page.locator("#leaveType").click();
  await page.getByRole("option", { name: /Unpaid/ }).click();
  await page.locator("#startDate").fill(isoDate(unpaidStart));
  await page.locator("#endDate").fill(isoDate(unpaidStart));
  await page.locator("#reason").fill("Unpaid day");
  await page.getByRole("dialog").getByRole("button", { name: /Submit|Request/ }).click();
  await expect(page.getByRole("dialog")).toBeHidden({ timeout: 15_000 });
  await page.goto("/leave");
  await page.getByRole("button", { name: /^Approve$/ }).first().click();
  await expect
    .poll(
      async () =>
        withDb(async (c) => {
          const r = await c.query(
            'SELECT count(*)::int AS n FROM "LeaveRequest" WHERE "tenantId" = $1 AND type = $2 AND status = $3',
            [tenantId, "unpaid", "approved"]
          );
          return r.rows[0].n as number;
        }),
      { timeout: 20_000 }
    )
    .toBe(1);
});

test("journey D: payroll run completes, unpaid leave deducted, bank export", async () => {
  const page = hrPage;

  await page.goto("/payroll");
  await page.getByRole("button", { name: "Start payroll run" }).click();
  await page.getByRole("button", { name: "Finalize & publish payslips" }).click({ timeout: 30_000 });
  await page.getByRole("button", { name: "Confirm & publish" }).click();

  await expect
    .poll(
      async () =>
        withDb(async (c) => {
          const r = await c.query(
            'SELECT status FROM "PayrollRun" WHERE "tenantId" = $1 ORDER BY period LIMIT 1',
            [tenantId]
          );
          return r.rows[0]?.status as string;
        }),
      { timeout: 30_000 }
    )
    .toBe("completed");

  const payslip = await withDb(async (c) => {
    const r = await c.query(
      'SELECT "netPay", "grossPay", deductions FROM "Payslip" WHERE "tenantId" = $1',
      [tenantId]
    );
    return r.rows[0] as { netPay: string; grossPay: string; deductions: unknown };
  });
  expect(payslip).toBeTruthy();
  expect(Number(payslip.netPay)).toBeGreaterThan(0);
  expect(Number(payslip.netPay)).toBeLessThan(Number(payslip.grossPay));
  // The approved unpaid day from journey C must appear as a deduction.
  expect(JSON.stringify(payslip.deductions)).toContain("Unpaid Leave");

  // Next month's run auto-scheduled; statutory compliance records generated.
  const followUps = await withDb(async (c) => {
    const runs = await c.query(
      'SELECT count(*)::int AS n FROM "PayrollRun" WHERE "tenantId" = $1 AND status = $2',
      [tenantId, "scheduled"]
    );
    const compliance = await c.query(
      'SELECT count(*)::int AS n FROM "ComplianceRecord" WHERE "tenantId" = $1',
      [tenantId]
    );
    return { scheduled: runs.rows[0].n as number, compliance: compliance.rows[0].n as number };
  });
  expect(followUps.scheduled).toBe(1);
  expect(followUps.compliance).toBeGreaterThan(0);

  // Bank export CSV downloads and contains the employee's net pay line.
  const run = await withDb(async (c) => {
    const r = await c.query(
      'SELECT id FROM "PayrollRun" WHERE "tenantId" = $1 AND status = $2',
      [tenantId, "completed"]
    );
    return r.rows[0] as { id: string };
  });
  await page.goto(`/payroll/${run.id}`);
  const downloadPromise = page.waitForEvent("download", { timeout: 30_000 });
  await page.getByRole("button", { name: "Export CSV" }).click();
  const download = await downloadPromise;
  const csvPath = await download.path();
  const fs = await import("node:fs");
  const csv = fs.readFileSync(csvPath, "utf8");
  expect(csv).toContain(`${EMPLOYEE.firstName} ${EMPLOYEE.lastName}`);
  expect(csv).toContain(EMPLOYEE.accountNumber);
});

test("journey E: security probes", async ({ browser, request }) => {
  // Signed-out fetch of an app route redirects to /login.
  const res = await request.get("/dashboard", { maxRedirects: 0 });
  expect(res.status()).toBeGreaterThanOrEqual(300);
  expect(res.status()).toBeLessThan(400);
  expect(res.headers()["location"]).toContain("/login");

  // Random invite token shows the friendly invalid-invite page, not a crash.
  const probeContext = await browser.newContext();
  const probePage = await probeContext.newPage();
  await probePage.goto("/accept-invite/this-token-does-not-exist");
  await expect(probePage.getByText(/invalid|expired|no longer/i).first()).toBeVisible({
    timeout: 30_000,
  });

  // Manager session: HR-only pages are refused and colleague pay is hidden.
  const mgrPage = await probeContext.newPage();
  await loginAs(mgrPage, ctx.managerEmail, ctx.managerPassword);
  await mgrPage.goto("/settings");
  await mgrPage.waitForTimeout(2_000);
  await expect(mgrPage.getByRole("tab", { name: "Payroll" })).toHaveCount(0);
  await mgrPage.goto("/employees");
  await mgrPage.getByRole("combobox").filter({ hasText: "Active" }).click();
  await mgrPage.getByRole("option", { name: "All statuses" }).click();
  await expect(mgrPage.getByText(`${EMPLOYEE.firstName} ${EMPLOYEE.lastName}`)).toBeVisible({
    timeout: 30_000,
  });
  const body = await mgrPage.locator("body").textContent();
  expect(body).not.toContain("600,000"); // non-report salary never rendered
  await probeContext.close();
});
