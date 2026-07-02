/**
 * Screenshot capture script for NovaHR user manuals.
 * Run: node scripts/capture-screenshots.mjs
 * Requires the dev server running at http://localhost:3000
 */

import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "../docs/screenshots");
const BASE = "http://localhost:3000";

const CREDS = {
  hr: { email: "lerato.dlamini@novatech.co.za", password: "hr123" },
  manager: { email: "thabo.nkosi@novatech.co.za", password: "manager123" },
  employee: { email: "aisha.patel@novatech.co.za", password: "employee123" },
  exco: { email: "michael.vandenberg@novagroup.co.za", password: "exco123" },
};

async function waitForApp(page) {
  // Wait for the AuthGuard loading spinner to disappear
  await page.waitForFunction(
    () => !document.body?.textContent?.includes("Loading NovaHR"),
    { timeout: 30000 }
  ).catch(() => {});
  await page.waitForTimeout(800);
}

async function navigate(page, url) {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  } catch {
    console.log(`  (slow nav to ${url}, continuing after extra wait)`);
    await page.waitForTimeout(3000);
  }
  await waitForApp(page);
}

async function shot(page, filename, options = {}) {
  const { clip, fullPage = false } = options;
  await page.waitForTimeout(400);
  const opts = { path: filename, fullPage };
  if (clip) opts.clip = clip;
  await page.screenshot(opts);
  console.log("  ->", path.basename(filename));
}

async function login(page, role) {
  // Retry up to 3 times - dev server HMR keeps networkidle from settling
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.goto(`${BASE}/login`, { waitUntil: "load", timeout: 60000 });
    await page.waitForTimeout(4000);

    // Already authed?
    if (page.url().includes("/dashboard")) {
      await page.waitForTimeout(1000);
      return;
    }

    const emailEl = await page.$('#email');
    if (emailEl) {
      console.log(`  [login] #email found on attempt ${attempt + 1}`);
      break;
    }
    console.log(`  [login] #email not found, retrying (attempt ${attempt + 1})...`);
  }

  // Triple-click to select all pre-filled text, then type our credentials
  await page.click('#email', { clickCount: 3, timeout: 10000 });
  await page.waitForTimeout(100);
  await page.keyboard.type(CREDS[role].email, { delay: 30 });

  await page.click('#password', { clickCount: 3, timeout: 10000 });
  await page.waitForTimeout(100);
  await page.keyboard.type(CREDS[role].password, { delay: 30 });

  await page.waitForTimeout(400);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 30000 });
  await page.waitForTimeout(2000);
  await waitForApp(page);
}

async function logout(page) {
  // Navigate away to clear session cleanly
  await page.goto(`${BASE}/login`);
  await page.waitForTimeout(500);
}

// ──────────────────────────────────────────────────────────────────────────────
// Signup / public pages
// ──────────────────────────────────────────────────────────────────────────────
async function capturePublic(page) {
  console.log("\n[Public pages]");

  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto(BASE);
  await shot(page, `${OUT}/signup/01-landing.png`);

  await page.goto(`${BASE}/login`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
  await shot(page, `${OUT}/signup/02-login.png`);

  await page.goto(`${BASE}/signup`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
  await shot(page, `${OUT}/signup/03-signup.png`);

  await page.goto(`${BASE}/terms`);
  await page.waitForLoadState("networkidle");
  await shot(page, `${OUT}/signup/04-terms.png`);

  await page.goto(`${BASE}/privacy`);
  await page.waitForLoadState("networkidle");
  await shot(page, `${OUT}/signup/05-privacy.png`);
}

// ──────────────────────────────────────────────────────────────────────────────
// HR Admin
// ──────────────────────────────────────────────────────────────────────────────
async function tryClick(page, selector) {
  const el = await page.$(selector);
  if (el) { await el.click(); await page.waitForTimeout(700); }
  return !!el;
}

async function captureHR(page) {
  console.log("\n[HR Admin]");
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, "hr");
  await shot(page, `${OUT}/hr/01-dashboard.png`);

  await navigate(page, `${BASE}/employees`);
  await shot(page, `${OUT}/hr/02-employees-list.png`);

  // Add employee dialog - step through wizard
  const addBtn = await page.$('button:has-text("Add employee"), button:has-text("New employee")');
  if (addBtn) {
    await addBtn.click();
    await page.waitForTimeout(800);
    await shot(page, `${OUT}/hr/03-add-employee-step1.png`);
    try {
      const firstInput = await page.$('input[placeholder*="First"], input[name="firstName"]');
      if (firstInput) {
        await firstInput.fill("Jane");
        const lastInput = await page.$('input[placeholder*="Last"], input[name="lastName"]');
        if (lastInput) await lastInput.fill("Smith");
        const nextBtn = await page.$('button:has-text("Next"), button:has-text("Continue")');
        if (nextBtn) {
          await nextBtn.click();
          await page.waitForTimeout(700);
          await shot(page, `${OUT}/hr/04-add-employee-step2.png`);
          const nextBtn2 = await page.$('button:has-text("Next"), button:has-text("Continue")');
          if (nextBtn2) {
            await nextBtn2.click();
            await page.waitForTimeout(700);
            await shot(page, `${OUT}/hr/05-add-employee-step3.png`);
          }
        }
      }
    } catch (e) { console.log("  (wizard skip:", e.message, ")"); }
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  }

  // Employee profile
  const firstEmp = await page.$('tbody tr, a[href*="/employees/"]');
  if (firstEmp) {
    await firstEmp.click();
    await page.waitForTimeout(1200);
    await shot(page, `${OUT}/hr/06-employee-profile.png`);
    await page.goBack();
    await waitForApp(page);
  }

  // Leave
  await navigate(page, `${BASE}/leave`);
  await shot(page, `${OUT}/hr/07-leave-list.png`);
  if (await tryClick(page, '[role="tab"]:has-text("Balances")')) await shot(page, `${OUT}/hr/08-leave-balances.png`);
  if (await tryClick(page, '[role="tab"]:has-text("Public holidays")')) await shot(page, `${OUT}/hr/09-public-holidays.png`);

  // New leave dialog
  await navigate(page, `${BASE}/leave`);
  const newLeaveBtn = await page.$('button:has-text("Request leave"), button:has-text("New request")');
  if (newLeaveBtn) {
    await newLeaveBtn.click();
    await page.waitForTimeout(800);
    await shot(page, `${OUT}/hr/10-new-leave-dialog.png`);
    await page.keyboard.press("Escape");
  }

  await navigate(page, `${BASE}/payroll`);
  await shot(page, `${OUT}/hr/11-payroll.png`);

  await navigate(page, `${BASE}/compliance`);
  await shot(page, `${OUT}/hr/12-compliance.png`);

  await navigate(page, `${BASE}/reports`);
  await shot(page, `${OUT}/hr/13-reports.png`);

  await navigate(page, `${BASE}/deductions`);
  await shot(page, `${OUT}/hr/14-deductions.png`);

  // Settings tabs
  await navigate(page, `${BASE}/settings`);
  await shot(page, `${OUT}/hr/15-settings-company.png`);

  if (await tryClick(page, '[role="tab"]:has-text("Users")')) {
    await shot(page, `${OUT}/hr/16-settings-users.png`);
    const inviteBtn = await page.$('button:has-text("Invite")');
    if (inviteBtn) {
      await inviteBtn.click();
      await page.waitForTimeout(800);
      await shot(page, `${OUT}/hr/17-invite-user.png`);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
    }
  }

  if (await tryClick(page, '[role="tab"]:has-text("Departments")')) await shot(page, `${OUT}/hr/18-settings-departments.png`);
  if (await tryClick(page, '[role="tab"]:has-text("Payroll")')) await shot(page, `${OUT}/hr/19-settings-payroll.png`);

  await navigate(page, `${BASE}/billing`);
  await shot(page, `${OUT}/hr/20-billing.png`);

  await logout(page);
}

// ──────────────────────────────────────────────────────────────────────────────
// Employee
// ──────────────────────────────────────────────────────────────────────────────
async function captureEmployee(page) {
  console.log("\n[Employee]");
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, "employee");
  await shot(page, `${OUT}/employee/01-dashboard.png`);

  await navigate(page, `${BASE}/leave`);
  await shot(page, `${OUT}/employee/02-leave.png`);
  if (await tryClick(page, '[role="tab"]:has-text("Balances")')) await shot(page, `${OUT}/employee/03-leave-balances.png`);

  // New leave request
  await navigate(page, `${BASE}/leave`);
  const newLeaveBtn = await page.$('button:has-text("Request leave"), button:has-text("New request")');
  if (newLeaveBtn) {
    await newLeaveBtn.click();
    await page.waitForTimeout(800);
    await shot(page, `${OUT}/employee/04-request-leave.png`);
    await page.keyboard.press("Escape");
  }

  await navigate(page, `${BASE}/employees`);
  await shot(page, `${OUT}/employee/05-directory.png`);

  // Own profile
  const selfRow = await page.$('a[href*="novatech-emp-003"], tr:has-text("Aisha Patel"), tr:has-text("Patel")');
  if (selfRow) {
    await selfRow.click();
    await page.waitForTimeout(1200);
    await shot(page, `${OUT}/employee/06-my-profile.png`);
  }

  await navigate(page, `${BASE}/payroll`);
  await shot(page, `${OUT}/employee/07-payslips.png`);

  await logout(page);
}

// ──────────────────────────────────────────────────────────────────────────────
// Manager
// ──────────────────────────────────────────────────────────────────────────────
async function captureManager(page) {
  console.log("\n[Manager]");
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, "manager");
  await shot(page, `${OUT}/manager/01-dashboard.png`);

  await navigate(page, `${BASE}/leave`);
  await shot(page, `${OUT}/manager/02-team-leave.png`);

  await navigate(page, `${BASE}/employees`);
  await shot(page, `${OUT}/manager/03-team-directory.png`);

  await navigate(page, `${BASE}/reports`);
  await shot(page, `${OUT}/manager/04-reports.png`);

  await logout(page);
}

// ──────────────────────────────────────────────────────────────────────────────
// Exco
// ──────────────────────────────────────────────────────────────────────────────
async function captureExco(page) {
  console.log("\n[Exco]");
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, "exco");
  await shot(page, `${OUT}/exco/01-dashboard.png`);

  await navigate(page, `${BASE}/reports`);
  await shot(page, `${OUT}/exco/02-reports.png`);

  await navigate(page, `${BASE}/leave`);
  await shot(page, `${OUT}/exco/03-leave-overview.png`);

  await navigate(page, `${BASE}/compliance`);
  await shot(page, `${OUT}/exco/04-compliance.png`);

  await logout(page);
}

// ──────────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────────
(async () => {
  const browser = await chromium.launch({
    channel: "chrome",
    headless: false,
    args: ["--no-sandbox", "--window-size=1440,900"],
  });

  async function newPage() {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    return ctx.newPage();
  }

  try {
    await capturePublic(await newPage());
    await captureHR(await newPage());
    await captureEmployee(await newPage());
    await captureManager(await newPage());
    await captureExco(await newPage());
  } finally {
    await browser.close();
  }

  console.log("\nAll screenshots captured.");
})();
