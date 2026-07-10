/**
 * Playwright screenshot capture script for NovaHR customer-facing PDF guides.
 * Targets the live production site at https://novahr-five.vercel.app.
 *
 * Usage:
 *   npx tsx scripts/capture-live-screenshots.ts
 *   npm run screenshots:live
 *
 * Output: docs/screenshots/ as PNG files.
 *
 * Login: tries the persona picker first (Lerato Dlamini button), then falls
 * back to filling the email/password form directly.
 */

import { chromium } from "playwright";
import * as fs from "node:fs";
import * as path from "node:path";

const BASE_URL = "https://novahr-five.vercel.app";
const OUTPUT_DIR = path.resolve(__dirname, "../docs/screenshots");

const PERSONA = {
  name: "Lerato Dlamini",
  email: "lerato.dlamini@novatech.co.za",
  password: "hr123",
};

function log(message: string) {
  process.stdout.write(message + "\n");
}

async function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

async function signIn(page: import("playwright").Page): Promise<"persona-picker" | "email-password"> {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });

  // Strategy 1: persona picker button
  try {
    const personaButton = page.locator("button").filter({ hasText: PERSONA.name });
    await personaButton.waitFor({ state: "visible", timeout: 8_000 });
    await personaButton.click();

    // The picker pre-fills credentials; submit the form.
    await page.locator("button[type=submit]").click();
    await page.waitForURL(/\/dashboard/, { timeout: 30_000 });

    // Dismiss loading overlay if present.
    await page
      .getByText("Loading NovaHR")
      .waitFor({ state: "hidden", timeout: 60_000 })
      .catch(() => null);

    return "persona-picker";
  } catch {
    // Strategy 2: direct email/password form
    log("Persona picker not found or timed out, falling back to email/password form");

    await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
    await page.locator("#email").fill(PERSONA.email);
    await page.locator("#password").fill(PERSONA.password);
    await page.locator("button[type=submit]").click();
    await page.waitForURL(/\/dashboard/, { timeout: 30_000 });

    await page
      .getByText("Loading NovaHR")
      .waitFor({ state: "hidden", timeout: 60_000 })
      .catch(() => null);

    return "email-password";
  }
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
  log(`Captured: docs/screenshots/${filename}`);
}

async function run() {
  await ensureOutputDir();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  let loginMethod: string;

  try {
    loginMethod = await signIn(page);
    log(`Login successful via: ${loginMethod}`);
  } catch (err) {
    log(`Login failed: ${(err as Error).message}`);
    log("Aborting all captures.");
    await context.close();
    await browser.close();
    process.exit(1);
  }

  // 1. dashboard.png
  try {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" });
    await page
      .locator("text=Team members")
      .waitFor({ state: "visible", timeout: 20_000 })
      .catch(() =>
        page.locator("main").waitFor({ state: "visible", timeout: 20_000 })
      );
    await capture(page, { filename: "dashboard.png" });
  } catch (err) {
    log(`Skipped: dashboard.png - ${(err as Error).message}`);
  }

  // 2. employees-list.png
  try {
    await page.goto(`${BASE_URL}/employees`, { waitUntil: "domcontentloaded" });
    await page
      .locator("th")
      .filter({ hasText: "Employee" })
      .first()
      .waitFor({ state: "visible", timeout: 20_000 });
    await capture(page, { filename: "employees-list.png" });
  } catch (err) {
    log(`Skipped: employees-list.png - ${(err as Error).message}`);
  }

  // 3. add-employee.png
  try {
    await page.goto(`${BASE_URL}/employees`, { waitUntil: "domcontentloaded" });
    const addBtn = page.getByRole("link", { name: /Add employee/i });
    await addBtn.waitFor({ state: "visible", timeout: 15_000 });
    await addBtn.click();
    await page.waitForURL(/\/employees\/new/, { timeout: 15_000 });
    await page.locator("#firstName").waitFor({ state: "visible", timeout: 15_000 });
    await capture(page, { filename: "add-employee.png" });
  } catch (err) {
    log(`Skipped: add-employee.png - ${(err as Error).message}`);
  }

  // 4. employee-profile.png
  try {
    await page.goto(`${BASE_URL}/employees`, { waitUntil: "domcontentloaded" });
    await page
      .locator("table tbody tr")
      .first()
      .waitFor({ state: "visible", timeout: 20_000 });
    await page.locator("table tbody tr").first().click();
    await page.waitForURL(/\/employees\/(?!new)[\w-]+/, { timeout: 15_000 });
    await page
      .locator("h1, h2")
      .first()
      .waitFor({ state: "visible", timeout: 15_000 });
    await capture(page, { filename: "employee-profile.png" });
  } catch (err) {
    log(`Skipped: employee-profile.png - ${(err as Error).message}`);
  }

  // 5. leave-requests.png
  try {
    await page.goto(`${BASE_URL}/leave`, { waitUntil: "domcontentloaded" });
    await page
      .locator("text=Requests")
      .first()
      .waitFor({ state: "visible", timeout: 20_000 });
    await page.waitForLoadState("networkidle").catch(() => null);
    await capture(page, { filename: "leave-requests.png" });
  } catch (err) {
    log(`Skipped: leave-requests.png - ${(err as Error).message}`);
  }

  // 6. leave-approval.png
  try {
    await page.goto(`${BASE_URL}/leave`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => null);
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

  // 7. payroll-dashboard.png
  try {
    await page.goto(`${BASE_URL}/payroll`, { waitUntil: "domcontentloaded" });
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

  // 8. payroll-run.png (viewport only, not full-page)
  try {
    await page.goto(`${BASE_URL}/payroll`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => null);
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

  // 9. payslip-view.png
  try {
    await page.goto(`${BASE_URL}/payroll`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => null);
    const historyRows = page.locator("table tbody tr");
    const firstRow = historyRows.first();
    const hasHistory = await firstRow
      .waitFor({ state: "visible", timeout: 10_000 })
      .then(() => true)
      .catch(() => false);

    if (hasHistory) {
      await firstRow.click();
      await page.waitForURL(/\/payroll\/[\w-]+/, { timeout: 15_000 });
      await page.waitForLoadState("networkidle").catch(() => null);
      await capture(page, { filename: "payslip-view.png" });
    } else {
      log("Skipped: payslip-view.png - no completed payroll runs in history");
    }
  } catch (err) {
    log(`Skipped: payslip-view.png - ${(err as Error).message}`);
  }

  // 10. settings-company.png
  try {
    await page.goto(`${BASE_URL}/settings`, { waitUntil: "domcontentloaded" });
    await page
      .getByRole("tab", { name: "Company" })
      .waitFor({ state: "visible", timeout: 20_000 });
    await page.waitForLoadState("networkidle").catch(() => null);
    await capture(page, { filename: "settings-company.png" });
  } catch (err) {
    log(`Skipped: settings-company.png - ${(err as Error).message}`);
  }

  // 11. reports.png
  try {
    await page.goto(`${BASE_URL}/reports`, { waitUntil: "domcontentloaded" });
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

  // 12. compliance.png (public page, no auth required)
  try {
    await page.goto(`${BASE_URL}/compliance`, { waitUntil: "domcontentloaded" });
    await page
      .locator("h1, h2")
      .first()
      .waitFor({ state: "visible", timeout: 20_000 });
    await capture(page, { filename: "compliance.png" });
  } catch (err) {
    log(`Skipped: compliance.png - ${(err as Error).message}`);
  }

  await context.close();
  await browser.close();

  log("");
  log("Done. Screenshots saved to docs/screenshots/");
}

run().catch((err) => {
  process.stderr.write(`Fatal error: ${(err as Error).message}\n`);
  process.exit(1);
});
