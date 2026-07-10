/**
 * Playwright screenshot capture script for NovaHR guide PDFs.
 * Captures annotated screenshots with red highlight boxes and numbered
 * callout badges drawn on live UI elements.
 *
 * Usage:
 *   npx tsx scripts/capture-guide-screenshots.ts
 *
 * Output: docs/screenshots/guides/ as PNG files.
 *
 * Login: same pattern as capture-live-screenshots.ts (persona picker then
 * email/password fallback). Session is reused across all captures.
 */

import { chromium } from "playwright";
import * as fs from "node:fs";
import * as path from "node:path";

const BASE_URL = "https://novahr-five.vercel.app";
const OUTPUT_DIR = path.resolve(__dirname, "../docs/screenshots/guides");

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

async function signIn(page: import("playwright").Page): Promise<void> {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });

  // Strategy 1: persona picker button
  try {
    const personaButton = page.locator("button").filter({ hasText: PERSONA.name });
    await personaButton.waitFor({ state: "visible", timeout: 8_000 });
    await personaButton.click();
    await page.locator("button[type=submit]").click();
    await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
    await page
      .getByText("Loading NovaHR")
      .waitFor({ state: "hidden", timeout: 60_000 })
      .catch(() => null);
    log("Login successful via: persona-picker");
    return;
  } catch {
    log("Persona picker not found, falling back to email/password form");
  }

  // Strategy 2: direct email/password form
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.locator("#email").fill(PERSONA.email);
  await page.locator("#password").fill(PERSONA.password);
  await page.locator("button[type=submit]").click();
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
  await page
    .getByText("Loading NovaHR")
    .waitFor({ state: "hidden", timeout: 60_000 })
    .catch(() => null);
  log("Login successful via: email-password");
}

async function injectHighlightHelper(page: import("playwright").Page): Promise<void> {
  await page.evaluate(() => {
    (window as any)._highlight = (selector: string, label: string) => {
      const el = document.querySelector(selector);
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      const box = document.createElement("div");
      box.style.cssText = `position:fixed;top:${rect.top - 3}px;left:${rect.left - 3}px;width:${rect.width + 6}px;height:${rect.height + 6}px;border:2.5px solid #EF4444;border-radius:6px;z-index:2147483647;pointer-events:none;box-shadow:0 0 0 1px rgba(239,68,68,0.25)`;
      document.body.appendChild(box);
      if (label) {
        const badge = document.createElement("div");
        badge.textContent = label;
        badge.style.cssText = `position:fixed;top:${rect.top - 22}px;left:${rect.left}px;background:#EF4444;color:white;padding:2px 7px;border-radius:4px;font-size:11px;font-weight:700;font-family:-apple-system,sans-serif;z-index:2147483647;pointer-events:none`;
        document.body.appendChild(badge);
      }
      return true;
    };
  });
}

async function tryHighlight(
  page: import("playwright").Page,
  selectors: string[],
  label: string
): Promise<boolean> {
  for (const selector of selectors) {
    try {
      const found = await page.evaluate(
        ({ sel, lbl }) => {
          return typeof (window as any)._highlight === "function"
            ? (window as any)._highlight(sel, lbl)
            : false;
        },
        { sel: selector, lbl: label }
      );
      if (found) return true;
    } catch {
      // selector may not match - continue
    }
  }
  return false;
}

async function navigateAndWait(
  page: import("playwright").Page,
  url: string
): Promise<void> {
  await page.goto(`${BASE_URL}${url}`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => null);
}

type CaptureOpts = {
  filename: string;
  fullPage?: boolean;
};

async function capture(
  page: import("playwright").Page,
  opts: CaptureOpts
): Promise<void> {
  const { filename, fullPage = true } = opts;
  const outputPath = path.join(OUTPUT_DIR, filename);
  await page.screenshot({ path: outputPath, fullPage });
  log(`  Captured: docs/screenshots/guides/${filename}`);
}

async function run() {
  await ensureOutputDir();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  try {
    await signIn(page);
  } catch (err) {
    log(`Login failed: ${(err as Error).message}`);
    await context.close();
    await browser.close();
    process.exit(1);
  }

  // -----------------------------------------------------------------------
  // QUICK START GUIDE
  // -----------------------------------------------------------------------

  log("\n[Quick Start Guide]");

  // qs-dashboard.png
  try {
    await navigateAndWait(page, "/dashboard");
    await page.locator("h1, main").first().waitFor({ state: "visible", timeout: 15_000 });
    await injectHighlightHelper(page);
    const found = await tryHighlight(
      page,
      [
        ".getting-started-card",
        "[data-testid='getting-started']",
        "button:has-text('Add employee')",
        "button:has-text('Add Employee')",
      ],
      "Start here"
    );
    if (!found) {
      // fallback: first stat card
      await tryHighlight(
        page,
        ["[class*='stat'], [class*='card'], [class*='Card']"],
        "Start here"
      );
    }
    await capture(page, { filename: "qs-dashboard.png" });
  } catch (err) {
    log(`  Skipped: qs-dashboard.png - ${(err as Error).message}`);
  }

  // qs-add-employee.png
  try {
    await navigateAndWait(page, "/employees/new");
    // fallback: if redirect happened, try clicking Add Employee link
    if (!page.url().includes("/employees/new")) {
      const addLink = page.getByRole("link", { name: /Add employee/i });
      await addLink.waitFor({ state: "visible", timeout: 10_000 });
      await addLink.click();
      await page.waitForURL(/\/employees\/new/, { timeout: 15_000 });
      await page.waitForLoadState("networkidle").catch(() => null);
    }
    await page.locator("form, input").first().waitFor({ state: "visible", timeout: 15_000 });
    await injectHighlightHelper(page);
    await tryHighlight(
      page,
      ["input[name='firstName']", "input[id='firstName']"],
      "1"
    );
    await tryHighlight(
      page,
      ["input[name='lastName']", "input[id='lastName']"],
      "2"
    );
    await tryHighlight(
      page,
      ["input[name='salary']", "input[id='salary']", "input[type='number']"],
      "3"
    );
    await capture(page, { filename: "qs-add-employee.png" });
  } catch (err) {
    log(`  Skipped: qs-add-employee.png - ${(err as Error).message}`);
  }

  // qs-leave-requests.png
  try {
    await navigateAndWait(page, "/leave");
    await page.locator("h1, main").first().waitFor({ state: "visible", timeout: 15_000 });
    await injectHighlightHelper(page);
    await tryHighlight(
      page,
      [
        "button:has-text('New')",
        "button:has-text('Request')",
        "a:has-text('Request')",
        "button:has-text('New Leave')",
        "a:has-text('New')",
      ],
      "Submit leave here"
    );
    await capture(page, { filename: "qs-leave-requests.png" });
  } catch (err) {
    log(`  Skipped: qs-leave-requests.png - ${(err as Error).message}`);
  }

  // qs-payroll-run.png (viewport only)
  try {
    await navigateAndWait(page, "/payroll");
    await page.locator("h1, main").first().waitFor({ state: "visible", timeout: 15_000 });
    await injectHighlightHelper(page);
    await tryHighlight(
      page,
      [
        "button:has-text('Start payroll')",
        "button:has-text('Start Payroll')",
        "button:has-text('New Run')",
        "button:has-text('Run Payroll')",
      ],
      "1 Click to start"
    );
    await capture(page, { filename: "qs-payroll-run.png", fullPage: false });
  } catch (err) {
    log(`  Skipped: qs-payroll-run.png - ${(err as Error).message}`);
  }

  // -----------------------------------------------------------------------
  // ONBOARDING GUIDE
  // -----------------------------------------------------------------------

  log("\n[Onboarding Guide]");

  // ob-dashboard.png
  try {
    await navigateAndWait(page, "/dashboard");
    await page.locator("h1, main").first().waitFor({ state: "visible", timeout: 15_000 });
    await injectHighlightHelper(page);
    await tryHighlight(
      page,
      [
        "h1",
        "[class*='welcome']",
        "[class*='Welcome']",
        "[class*='getting-started']",
        "[class*='GettingStarted']",
      ],
      "Your dashboard"
    );
    await capture(page, { filename: "ob-dashboard.png" });
  } catch (err) {
    log(`  Skipped: ob-dashboard.png - ${(err as Error).message}`);
  }

  // ob-settings.png
  try {
    await navigateAndWait(page, "/settings");
    await page.locator("h1, main, form").first().waitFor({ state: "visible", timeout: 15_000 });
    await injectHighlightHelper(page);
    await tryHighlight(
      page,
      [
        "input[name='name']",
        "input[id='name']",
        "input[placeholder*='company']",
        "input[placeholder*='Company']",
      ],
      "1 Company name"
    );
    await tryHighlight(
      page,
      [
        "input[name='registrationNumber']",
        "input[id='registrationNumber']",
        "input[name='registration']",
      ],
      "2 Registration"
    );
    await capture(page, { filename: "ob-settings.png" });
  } catch (err) {
    log(`  Skipped: ob-settings.png - ${(err as Error).message}`);
  }

  // ob-employees.png
  try {
    await navigateAndWait(page, "/employees");
    await page.locator("h1, main").first().waitFor({ state: "visible", timeout: 15_000 });
    await injectHighlightHelper(page);
    await tryHighlight(
      page,
      [
        "button:has-text('Add')",
        "a:has-text('Add')",
        "button:has-text('Add Employee')",
        "a:has-text('Add Employee')",
      ],
      "Add your first employee"
    );
    await capture(page, { filename: "ob-employees.png" });
  } catch (err) {
    log(`  Skipped: ob-employees.png - ${(err as Error).message}`);
  }

  // -----------------------------------------------------------------------
  // PAYROLL SETUP GUIDE
  // -----------------------------------------------------------------------

  log("\n[Payroll Setup Guide]");

  // ps-payroll-settings.png
  try {
    await navigateAndWait(page, "/settings");
    await page.locator("h1, main").first().waitFor({ state: "visible", timeout: 15_000 });
    // Try to click Payroll tab if present
    try {
      const payrollTab = page.getByRole("tab", { name: /payroll/i });
      const hasTab = await payrollTab
        .waitFor({ state: "visible", timeout: 5_000 })
        .then(() => true)
        .catch(() => false);
      if (hasTab) await payrollTab.click();
    } catch {
      // Stay on settings page
    }
    await page.waitForLoadState("networkidle").catch(() => null);
    await injectHighlightHelper(page);
    await tryHighlight(
      page,
      [
        "select[name='payFrequency']",
        "[id*='payFrequency']",
        "[id*='pay-frequency']",
        "button:has-text('monthly')",
        "button:has-text('Monthly')",
        "button:has-text('weekly')",
        "button:has-text('Weekly')",
      ],
      "1 Pay frequency"
    );
    await tryHighlight(
      page,
      [
        "input[name='payDay']",
        "input[id='payDay']",
        "[id*='payDay']",
        "[id*='pay-day']",
        "input[name='pay_day']",
      ],
      "2 Pay day"
    );
    await capture(page, { filename: "ps-payroll-settings.png" });
  } catch (err) {
    log(`  Skipped: ps-payroll-settings.png - ${(err as Error).message}`);
  }

  // ps-employee-payroll.png: click first employee then find salary field
  try {
    await navigateAndWait(page, "/employees");
    await page
      .locator("table tbody tr, [class*='employee-row'], [class*='EmployeeRow']")
      .first()
      .waitFor({ state: "visible", timeout: 15_000 });
    await page.locator("table tbody tr").first().click();
    await page.waitForURL(/\/employees\/(?!new)[\w-]+/, { timeout: 15_000 });
    await page.waitForLoadState("networkidle").catch(() => null);
    // Look for payroll/salary tab
    try {
      const salaryTab = page.getByRole("tab", { name: /salary|payroll|pay/i });
      const hasTab = await salaryTab
        .waitFor({ state: "visible", timeout: 5_000 })
        .then(() => true)
        .catch(() => false);
      if (hasTab) await salaryTab.click();
    } catch {
      // Stay on profile page
    }
    await page.waitForLoadState("networkidle").catch(() => null);
    await injectHighlightHelper(page);
    await tryHighlight(
      page,
      ["input[name='salary']", "input[id='salary']", "input[name='basicSalary']", "input[id='basicSalary']"],
      "Gross salary"
    );
    await capture(page, { filename: "ps-employee-payroll.png" });
  } catch (err) {
    log(`  Skipped: ps-employee-payroll.png - ${(err as Error).message}`);
  }

  // ps-run-payroll.png (viewport only)
  try {
    await navigateAndWait(page, "/payroll");
    await page.locator("h1, main").first().waitFor({ state: "visible", timeout: 15_000 });
    await injectHighlightHelper(page);
    await tryHighlight(
      page,
      [
        "button:has-text('Start payroll')",
        "button:has-text('Start Payroll')",
        "button:has-text('New Run')",
        "button:has-text('Run Payroll')",
      ],
      "Start run here"
    );
    await capture(page, { filename: "ps-run-payroll.png", fullPage: false });
  } catch (err) {
    log(`  Skipped: ps-run-payroll.png - ${(err as Error).message}`);
  }

  // -----------------------------------------------------------------------
  // HOW-TO GUIDES
  // -----------------------------------------------------------------------

  log("\n[How-To Guides]");

  // ht-add-employee.png: annotate up to 4 required fields with numbers 1-4
  try {
    await navigateAndWait(page, "/employees/new");
    if (!page.url().includes("/employees/new")) {
      const addLink = page.getByRole("link", { name: /Add employee/i });
      await addLink.waitFor({ state: "visible", timeout: 10_000 });
      await addLink.click();
      await page.waitForURL(/\/employees\/new/, { timeout: 15_000 });
      await page.waitForLoadState("networkidle").catch(() => null);
    }
    await page.locator("form, input").first().waitFor({ state: "visible", timeout: 15_000 });
    await injectHighlightHelper(page);
    // Annotate up to 4 required fields with numbers 1-4
    const count = await page.evaluate(() => {
      const highlight = (window as any)._highlight;
      const fields = Array.from(
        document.querySelectorAll("input[required], select[required], textarea[required]")
      ).slice(0, 4);
      let annotated = 0;
      fields.forEach((el, i) => {
        const rect = (el as HTMLElement).getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        const label = String(i + 1);
        const box = document.createElement("div");
        box.style.cssText = `position:fixed;top:${rect.top - 3}px;left:${rect.left - 3}px;width:${rect.width + 6}px;height:${rect.height + 6}px;border:2.5px solid #EF4444;border-radius:6px;z-index:2147483647;pointer-events:none;box-shadow:0 0 0 1px rgba(239,68,68,0.25)`;
        document.body.appendChild(box);
        const badge = document.createElement("div");
        badge.textContent = label;
        badge.style.cssText = `position:fixed;top:${rect.top - 22}px;left:${rect.left}px;background:#EF4444;color:white;padding:2px 7px;border-radius:4px;font-size:11px;font-weight:700;font-family:-apple-system,sans-serif;z-index:2147483647;pointer-events:none`;
        document.body.appendChild(badge);
        annotated++;
      });
      return annotated;
    });
    if (count === 0) {
      // Fallback: highlight first name and last name manually
      await tryHighlight(page, ["input[name='firstName']", "input[id='firstName']", "input"], "1");
    }
    await capture(page, { filename: "ht-add-employee.png" });
  } catch (err) {
    log(`  Skipped: ht-add-employee.png - ${(err as Error).message}`);
  }

  // ht-approve-leave.png: find pending row, scroll to it (viewport only)
  try {
    await navigateAndWait(page, "/leave");
    await page.locator("h1, main").first().waitFor({ state: "visible", timeout: 15_000 });
    // Use Playwright's :has-text() which is a Playwright-specific pseudo-class
    const pendingEl = page.locator("td, span, [class*='pending'], [class*='Pending']")
      .filter({ hasText: /pending/i })
      .first();
    const hasPending = await pendingEl
      .waitFor({ state: "visible", timeout: 10_000 })
      .then(() => true)
      .catch(() => false);
    if (hasPending) {
      await pendingEl.scrollIntoViewIfNeeded();
    }
    await injectHighlightHelper(page);
    if (hasPending) {
      // Use evaluate with DOM traversal (no :has-text in native querySelector)
      await page.evaluate(() => {
        // Find element whose textContent matches "pending" (case-insensitive)
        function findPending(root: Document): Element | null {
          const candidates = Array.from(
            root.querySelectorAll("td, span, [class*='pending']")
          );
          return (
            candidates.find((el) =>
              /pending/i.test((el as HTMLElement).innerText || el.textContent || "")
            ) || null
          );
        }
        const el = findPending(document);
        if (!el) return;
        const row = el.closest("tr") || el;
        const rect = (row as HTMLElement).getBoundingClientRect();
        if (rect.width === 0) return;
        const box = document.createElement("div");
        box.style.cssText = `position:fixed;top:${rect.top - 3}px;left:${rect.left - 3}px;width:${rect.width + 6}px;height:${rect.height + 6}px;border:2.5px solid #EF4444;border-radius:6px;z-index:2147483647;pointer-events:none;box-shadow:0 0 0 1px rgba(239,68,68,0.25)`;
        document.body.appendChild(box);
        const badge = document.createElement("div");
        badge.textContent = "Click to review";
        badge.style.cssText = `position:fixed;top:${rect.top - 22}px;left:${rect.left}px;background:#EF4444;color:white;padding:2px 7px;border-radius:4px;font-size:11px;font-weight:700;font-family:-apple-system,sans-serif;z-index:2147483647;pointer-events:none`;
        document.body.appendChild(badge);
      });
    }
    await capture(page, { filename: "ht-approve-leave.png", fullPage: false });
  } catch (err) {
    log(`  Skipped: ht-approve-leave.png - ${(err as Error).message}`);
  }

  // ht-run-payroll.png (viewport only)
  try {
    await navigateAndWait(page, "/payroll");
    await page.locator("h1, main").first().waitFor({ state: "visible", timeout: 15_000 });
    await injectHighlightHelper(page);
    await tryHighlight(
      page,
      [
        "button:has-text('Start payroll')",
        "button:has-text('Start Payroll')",
        "button:has-text('New Run')",
        "button:has-text('Run Payroll')",
      ],
      "Click here"
    );
    await capture(page, { filename: "ht-run-payroll.png", fullPage: false });
  } catch (err) {
    log(`  Skipped: ht-run-payroll.png - ${(err as Error).message}`);
  }

  // ht-export-payslip.png: navigate to a completed payroll run and find export
  try {
    await navigateAndWait(page, "/payroll");
    await page.waitForLoadState("networkidle").catch(() => null);
    const historyRow = page.locator("table tbody tr").first();
    const hasHistory = await historyRow
      .waitFor({ state: "visible", timeout: 10_000 })
      .then(() => true)
      .catch(() => false);
    if (hasHistory) {
      await historyRow.click();
      await page.waitForURL(/\/payroll\/[\w-]+/, { timeout: 15_000 });
      await page.waitForLoadState("networkidle").catch(() => null);
    }
    await injectHighlightHelper(page);
    await tryHighlight(
      page,
      [
        "button:has-text('Download')",
        "button:has-text('Export')",
        "a:has-text('Download')",
        "a:has-text('Export')",
        "button:has-text('PDF')",
        "[aria-label*='download']",
        "[aria-label*='export']",
      ],
      "Download PDF"
    );
    await capture(page, { filename: "ht-export-payslip.png" });
  } catch (err) {
    log(`  Skipped: ht-export-payslip.png - ${(err as Error).message}`);
  }

  // ht-invite-user.png: /settings, find Users tab or invite section
  try {
    await navigateAndWait(page, "/settings");
    await page.locator("h1, main").first().waitFor({ state: "visible", timeout: 15_000 });
    // Try to click Users tab
    try {
      const usersTab = page.getByRole("tab", { name: /users|team|members/i });
      const hasTab = await usersTab
        .waitFor({ state: "visible", timeout: 5_000 })
        .then(() => true)
        .catch(() => false);
      if (hasTab) {
        await usersTab.click();
        await page.waitForLoadState("networkidle").catch(() => null);
      }
    } catch {
      // Stay on settings page
    }
    await injectHighlightHelper(page);
    await tryHighlight(
      page,
      [
        "input[placeholder*='email']",
        "input[placeholder*='Email']",
        "button:has-text('Invite')",
        "a:has-text('Invite')",
        "button:has-text('Add user')",
        "button:has-text('Add User')",
      ],
      "Invite team member"
    );
    await capture(page, { filename: "ht-invite-user.png" });
  } catch (err) {
    log(`  Skipped: ht-invite-user.png - ${(err as Error).message}`);
  }

  // ht-reports.png: /reports, highlight filter and export
  try {
    await navigateAndWait(page, "/reports");
    await page.locator("h1, main").first().waitFor({ state: "visible", timeout: 15_000 });
    await injectHighlightHelper(page);
    // Highlight first chart or filter
    const foundFilter = await tryHighlight(
      page,
      [
        "select",
        "input[type='date']",
        "[class*='filter']",
        "[class*='Filter']",
        "button:has-text('Period')",
        "button:has-text('Month')",
        "button:has-text('Year')",
      ],
      "1 Select period"
    );
    if (!foundFilter) {
      await tryHighlight(
        page,
        ["[class*='chart']", "[class*='Chart']", "canvas", "svg"],
        "1 Select period"
      );
    }
    await tryHighlight(
      page,
      [
        "button:has-text('Export')",
        "a:has-text('Export')",
        "button:has-text('Download')",
        "a:has-text('Download')",
      ],
      "2 Export"
    );
    await capture(page, { filename: "ht-reports.png" });
  } catch (err) {
    log(`  Skipped: ht-reports.png - ${(err as Error).message}`);
  }

  // -----------------------------------------------------------------------
  // FAQ (no annotation)
  // -----------------------------------------------------------------------

  log("\n[FAQ]");

  // faq-dashboard.png
  try {
    await navigateAndWait(page, "/dashboard");
    await page.locator("h1, main").first().waitFor({ state: "visible", timeout: 15_000 });
    await capture(page, { filename: "faq-dashboard.png" });
  } catch (err) {
    log(`  Skipped: faq-dashboard.png - ${(err as Error).message}`);
  }

  // faq-leave.png
  try {
    await navigateAndWait(page, "/leave");
    await page.locator("h1, main").first().waitFor({ state: "visible", timeout: 15_000 });
    await capture(page, { filename: "faq-leave.png" });
  } catch (err) {
    log(`  Skipped: faq-leave.png - ${(err as Error).message}`);
  }

  // -----------------------------------------------------------------------
  // SARS CALENDAR (no annotation)
  // -----------------------------------------------------------------------

  log("\n[SARS Calendar]");

  // sars-payroll.png
  try {
    await navigateAndWait(page, "/payroll");
    await page.locator("h1, main").first().waitFor({ state: "visible", timeout: 15_000 });
    await capture(page, { filename: "sars-payroll.png" });
  } catch (err) {
    log(`  Skipped: sars-payroll.png - ${(err as Error).message}`);
  }

  // -----------------------------------------------------------------------
  // SALES DECK (no annotation)
  // -----------------------------------------------------------------------

  log("\n[Sales Deck]");

  // sd-dashboard.png
  try {
    await navigateAndWait(page, "/dashboard");
    await page.locator("h1, main").first().waitFor({ state: "visible", timeout: 15_000 });
    await capture(page, { filename: "sd-dashboard.png" });
  } catch (err) {
    log(`  Skipped: sd-dashboard.png - ${(err as Error).message}`);
  }

  // sd-payroll.png
  try {
    await navigateAndWait(page, "/payroll");
    await page.locator("h1, main").first().waitFor({ state: "visible", timeout: 15_000 });
    await capture(page, { filename: "sd-payroll.png" });
  } catch (err) {
    log(`  Skipped: sd-payroll.png - ${(err as Error).message}`);
  }

  // sd-employees.png
  try {
    await navigateAndWait(page, "/employees");
    await page.locator("h1, main").first().waitFor({ state: "visible", timeout: 15_000 });
    await capture(page, { filename: "sd-employees.png" });
  } catch (err) {
    log(`  Skipped: sd-employees.png - ${(err as Error).message}`);
  }

  // sd-reports.png
  try {
    await navigateAndWait(page, "/reports");
    await page.locator("h1, main").first().waitFor({ state: "visible", timeout: 15_000 });
    await capture(page, { filename: "sd-reports.png" });
  } catch (err) {
    log(`  Skipped: sd-reports.png - ${(err as Error).message}`);
  }

  await context.close();
  await browser.close();

  log("\nDone. Screenshots saved to docs/screenshots/guides/");
}

run().catch((err) => {
  process.stderr.write(`Fatal error: ${(err as Error).message}\n`);
  process.exit(1);
});
