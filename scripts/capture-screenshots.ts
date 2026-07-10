/**
 * Playwright screenshot capture script for NovaHR user guide assets.
 *
 * Usage:
 *   npm run screenshots
 *   npm run screenshots -- --headed
 *
 * Requires the dev server to be running at http://localhost:3000
 * (run `npm run dev` in a separate terminal first).
 *
 * Output: docs/screenshots/ as PNG files.
 *
 * The persona used is "Lerato Dlamini" (HR Admin), which has access to all
 * authenticated sections of the app. Credentials come from src/lib/auth/demo-users.ts.
 */

import { chromium } from "playwright";
import * as fs from "node:fs";
import * as path from "node:path";

const BASE_URL = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3000";
const OUTPUT_DIR = path.resolve(__dirname, "../docs/screenshots");

// Lerato Dlamini: HR Admin persona from src/lib/auth/demo-users.ts
const PERSONA = {
  name: "Lerato Dlamini",
  email: "lerato.dlamini@novatech.co.za",
  password: "hr123",
};

const headed = process.argv.includes("--headed");

function log(message: string) {
  process.stdout.write(message + "\n");
}

async function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

async function signIn(page: import("playwright").Page): Promise<void> {
  await page.goto(`${BASE_URL}/login`);

  // The demo persona picker pre-fills credentials when a persona row is clicked.
  // Click Lerato Dlamini's row (matched by the visible text on the button).
  const personaButton = page.locator("button").filter({ hasText: PERSONA.name });
  await personaButton.click();

  // Submit the pre-filled form (button text includes the first name).
  await page.locator("button[type=submit]").click();

  // Wait for the dashboard to confirm a successful login.
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });

  // Dismiss the loading state if it appears.
  await page
    .getByText("Loading NovaHR")
    .waitFor({ state: "hidden", timeout: 60_000 })
    .catch(() => {
      // If the element was never present, that is fine.
    });
}

type CaptureOptions = {
  filename: string;
  fullPage?: boolean;
};

async function capture(
  page: import("playwright").Page,
  options: CaptureOptions
): Promise<void> {
  const { filename, fullPage = true } = options;
  const outputPath = path.join(OUTPUT_DIR, filename);
  await page.screenshot({ path: outputPath, fullPage });
  log(`Captured: ${filename}`);
}

async function run() {
  await ensureOutputDir();

  const browser = await chromium.launch({ headless: !headed });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  try {
    // Sign in as Lerato Dlamini (HR Admin).
    await signIn(page);

    // a. dashboard.png
    try {
      await page.goto(`${BASE_URL}/dashboard`);
      // Wait for stat cards: the HR dashboard renders a StatCardGrid.
      // The grid is client-side, so wait for a visible heading or stat value.
      await page
        .locator("text=Team members")
        .waitFor({ state: "visible", timeout: 20_000 })
        .catch(() =>
          // Fallback: wait for any card content to appear.
          page.locator("main").waitFor({ state: "visible", timeout: 20_000 })
        );
      await capture(page, { filename: "dashboard.png" });
    } catch (err) {
      log(`Skipped: dashboard.png - ${(err as Error).message}`);
    }

    // b. employees-list.png
    try {
      await page.goto(`${BASE_URL}/employees`);
      // Wait for the employee table header row to appear.
      await page
        .locator("th")
        .filter({ hasText: "Employee" })
        .first()
        .waitFor({ state: "visible", timeout: 20_000 });
      await capture(page, { filename: "employees-list.png" });
    } catch (err) {
      log(`Skipped: employees-list.png - ${(err as Error).message}`);
    }

    // c. add-employee.png
    try {
      await page.goto(`${BASE_URL}/employees`);
      // Wait for the Add employee button (only visible to HR role).
      const addBtn = page.getByRole("link", { name: /Add employee/i });
      await addBtn.waitFor({ state: "visible", timeout: 15_000 });
      await addBtn.click();
      await page.waitForURL(/\/employees\/new/, { timeout: 15_000 });
      // Wait for the first field of the onboarding wizard.
      await page.locator("#firstName").waitFor({ state: "visible", timeout: 15_000 });
      await capture(page, { filename: "add-employee.png" });
    } catch (err) {
      log(`Skipped: add-employee.png - ${(err as Error).message}`);
    }

    // d. employee-profile.png — click the first row in the employees table.
    try {
      await page.goto(`${BASE_URL}/employees`);
      // Wait for table rows to render.
      await page
        .locator("table tbody tr")
        .first()
        .waitFor({ state: "visible", timeout: 20_000 });
      await page.locator("table tbody tr").first().click();
      // The employee profile URL is /employees/<id>.
      await page.waitForURL(/\/employees\/(?!new)[\w-]+/, { timeout: 15_000 });
      // Wait for the profile header content.
      await page
        .locator("h1, h2")
        .first()
        .waitFor({ state: "visible", timeout: 15_000 });
      await capture(page, { filename: "employee-profile.png" });
    } catch (err) {
      log(`Skipped: employee-profile.png - ${(err as Error).message}`);
    }

    // e. leave-requests.png
    try {
      await page.goto(`${BASE_URL}/leave`);
      // Wait for the Requests tab content, which shows the leave table or empty state.
      await page
        .locator("text=Requests")
        .first()
        .waitFor({ state: "visible", timeout: 20_000 });
      // Give the table time to hydrate.
      await page.waitForLoadState("networkidle").catch(() => null);
      await capture(page, { filename: "leave-requests.png" });
    } catch (err) {
      log(`Skipped: leave-requests.png - ${(err as Error).message}`);
    }

    // f. leave-approval.png — if there is at least one pending request, open it.
    // The leave table shows inline Approve/Reject buttons; we capture the page
    // scrolled so a pending row is in view.
    try {
      await page.goto(`${BASE_URL}/leave`);
      await page.waitForLoadState("networkidle").catch(() => null);
      // Look for an Approve button on a pending request row.
      const approveBtn = page.getByRole("button", { name: /^Approve$/ }).first();
      const hasPending = await approveBtn
        .waitFor({ state: "visible", timeout: 10_000 })
        .then(() => true)
        .catch(() => false);

      if (hasPending) {
        await approveBtn.scrollIntoViewIfNeeded();
        await capture(page, { filename: "leave-approval.png", fullPage: false });
      } else {
        log("Skipped: leave-approval.png - no pending leave requests found");
      }
    } catch (err) {
      log(`Skipped: leave-approval.png - ${(err as Error).message}`);
    }

    // g. payroll-dashboard.png
    try {
      await page.goto(`${BASE_URL}/payroll`);
      // Wait for the PayrollStats section or an empty-state message.
      await page
        .locator("h1, h2")
        .filter({ hasText: /Payroll/i })
        .first()
        .waitFor({ state: "visible", timeout: 20_000 });
      await page.waitForLoadState("networkidle").catch(() => null);
      await capture(page, { filename: "payroll-dashboard.png" });
    } catch (err) {
      log(`Skipped: payroll-dashboard.png - ${(err as Error).message}`);
    }

    // h. payroll-run.png — scroll CurrentRunCard into view and capture viewport.
    try {
      await page.goto(`${BASE_URL}/payroll`);
      await page.waitForLoadState("networkidle").catch(() => null);
      // The CurrentRunCard has a title "Current payroll run" or similar.
      const runCard = page
        .locator("div, section, article")
        .filter({ hasText: /current payroll run|start payroll run/i })
        .first();
      const hasRunCard = await runCard
        .waitFor({ state: "visible", timeout: 10_000 })
        .then(() => true)
        .catch(() => false);

      if (hasRunCard) {
        await runCard.scrollIntoViewIfNeeded();
        await capture(page, { filename: "payroll-run.png", fullPage: false });
      } else {
        log("Skipped: payroll-run.png - CurrentRunCard not visible on this page");
      }
    } catch (err) {
      log(`Skipped: payroll-run.png - ${(err as Error).message}`);
    }

    // i. payslip-view.png — navigate into a completed payroll run to see payslips.
    // The PayrollHistory section lists completed runs; click the first one.
    try {
      await page.goto(`${BASE_URL}/payroll`);
      await page.waitForLoadState("networkidle").catch(() => null);
      // Completed runs appear in the payroll history table; each row is clickable.
      // The PayrollHistory card has the title "Payroll history".
      const historyRows = page.locator(
        "table tbody tr"
      );
      const firstRow = historyRows.first();
      const hasHistory = await firstRow
        .waitFor({ state: "visible", timeout: 10_000 })
        .then(() => true)
        .catch(() => false);

      if (hasHistory) {
        await firstRow.click();
        // Navigate to /payroll/<id>
        await page.waitForURL(/\/payroll\/[\w-]+/, { timeout: 15_000 });
        await page.waitForLoadState("networkidle").catch(() => null);
        await capture(page, { filename: "payslip-view.png" });
      } else {
        log("Skipped: payslip-view.png - no completed payroll runs in history");
      }
    } catch (err) {
      log(`Skipped: payslip-view.png - ${(err as Error).message}`);
    }

    // j. settings-company.png — /settings loads with the Company tab active by default.
    try {
      await page.goto(`${BASE_URL}/settings`);
      // Wait for the company settings tab content (the "Company" tab is selected by default).
      await page
        .getByRole("tab", { name: "Company" })
        .waitFor({ state: "visible", timeout: 20_000 });
      await page.waitForLoadState("networkidle").catch(() => null);
      await capture(page, { filename: "settings-company.png" });
    } catch (err) {
      log(`Skipped: settings-company.png - ${(err as Error).message}`);
    }

    // k. reports.png
    try {
      await page.goto(`${BASE_URL}/reports`);
      await page
        .locator("h1, h2")
        .filter({ hasText: /Reports/i })
        .first()
        .waitFor({ state: "visible", timeout: 20_000 });
      await page.waitForLoadState("networkidle").catch(() => null);
      await capture(page, { filename: "reports.png" });
    } catch (err) {
      log(`Skipped: reports.png - ${(err as Error).message}`);
    }

    // l. compliance.png — public marketing page at /compliance (no auth required).
    try {
      await page.goto(`${BASE_URL}/compliance`);
      // Wait for heading content from the public compliance page.
      await page
        .locator("h1, h2")
        .first()
        .waitFor({ state: "visible", timeout: 20_000 });
      await capture(page, { filename: "compliance.png" });
    } catch (err) {
      log(`Skipped: compliance.png - ${(err as Error).message}`);
    }
  } finally {
    await context.close();
    await browser.close();
  }

  log("");
  log("Done. Screenshots saved to docs/screenshots/");
}

run().catch((err) => {
  process.stderr.write(`Fatal error: ${(err as Error).message}\n`);
  process.exit(1);
});
