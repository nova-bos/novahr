/**
 * Scenario C automation: role-based navigation and access control.
 *
 * For each demo persona this verifies two things the UAT checklist covers by
 * hand:
 *   1. The main sidebar shows exactly the nav items that role should see.
 *   2. Directly navigating to a route the role may not use redirects to the
 *      expected place (client-side `useRoleGuard`), rather than rendering it.
 *
 * The expectations are derived from the code that actually enforces them
 * (src/components/layout/nav-config.ts and the per-page useRoleGuard calls),
 * not from the prose checklist, which has drifted (e.g. "My Profile" moved to
 * the avatar menu, so employees now have three main-nav items, not four).
 *
 * Everything here is read-only: it signs in as seeded demo users and navigates.
 * It never mutates tenant data. Run against a production build for speed:
 *   next build && PORT=3100 next start   (in one shell)
 *   E2E_BASE_URL=http://localhost:3100 npx playwright test e2e/role-access.spec.ts
 */

import { test, expect, type Page } from "@playwright/test";
import { demoUsers } from "../src/lib/auth/demo-users";

const EMP_EMPLOYEE = "novatech-emp-003"; // Aisha Patel (employee persona)

// The main-nav hrefs each role should see, from getNavItems() in nav-config.ts.
const EXPECTED_NAV: Record<string, string[]> = {
  employee: ["/dashboard", "/payroll", "/leave"],
  manager: ["/dashboard", "/employees", "/payroll", "/leave"],
  hr: [
    "/dashboard",
    "/employees",
    "/payroll",
    "/leave",
    "/compliance",
    "/deductions",
    "/reports",
    "/billing",
    "/settings",
  ],
  exco: ["/dashboard", "/reports", "/compliance"],
};

// All main-nav hrefs, so we can assert the ones a role must NOT see are absent.
const ALL_NAV_HREFS = [
  "/dashboard",
  "/employees",
  "/payroll",
  "/leave",
  "/compliance",
  "/deductions",
  "/reports",
  "/billing",
  "/settings",
];

/**
 * For each persona, a map of route -> the path we expect to land on after a
 * direct visit. Equal path == access allowed; different path == redirected
 * (blocked). Chained redirects (e.g. /employees/new -> /employees -> own
 * profile for an employee) are encoded as the final landing path.
 */
const ACCESS: Record<string, Record<string, string>> = {
  employee: {
    "/dashboard": "/dashboard",
    "/account": "/account",
    "/payroll": "/payroll",
    "/leave": "/leave",
    "/employees": `/employees/${EMP_EMPLOYEE}`, // redirected to own profile
    "/settings": "/dashboard",
    "/compliance": "/dashboard",
    "/deductions": "/dashboard",
    "/reports": "/dashboard",
    "/billing": "/dashboard",
    "/tenants": "/dashboard",
    "/payroll/any-run-id": "/payroll", // hr-only detail page
  },
  manager: {
    "/dashboard": "/dashboard",
    "/account": "/account",
    "/payroll": "/payroll",
    "/leave": "/leave",
    "/employees": "/employees", // manager sees the team directory
    "/employees/new": "/employees", // hr-only, redirects back
    "/settings": "/dashboard",
    "/compliance": "/dashboard",
    "/deductions": "/dashboard",
    "/reports": "/dashboard",
    "/billing": "/dashboard",
    "/payroll/any-run-id": "/payroll",
  },
  hr: {
    "/dashboard": "/dashboard",
    "/account": "/account",
    "/employees": "/employees",
    "/employees/new": "/employees/new",
    "/payroll": "/payroll",
    "/leave": "/leave",
    "/compliance": "/compliance",
    "/deductions": "/deductions",
    "/reports": "/reports",
    "/billing": "/billing",
    "/settings": "/settings",
  },
  exco: {
    "/dashboard": "/dashboard",
    "/account": "/account",
    "/reports": "/reports",
    "/compliance": "/compliance",
    "/deductions": "/deductions",
    "/payroll": "/dashboard", // exco is not a payroll role
    "/leave": "/dashboard",
    "/settings": "/dashboard",
    "/billing": "/dashboard",
    "/employees": "/dashboard",
  },
};

async function loginAs(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator("button[type=submit]").click();
  await page.waitForURL("**/dashboard", { timeout: 30_000 });
  await expect(page.getByText("Loading NovaHR")).toHaveCount(0, { timeout: 60_000 });
}

/**
 * Navigate to a route and return the path where the browser ultimately lands.
 *
 * For redirect routes we fire goto() without awaiting. The client-side guard
 * fires via React's useEffect after hydration + auth load. We then use
 * page.waitForURL() which hooks into Playwright's internal URL-change events
 * rather than polling, giving a much more reliable signal and up to 30 s of
 * margin for Supabase auth to return the session.
 *
 * For allowed routes we await normally so the page is fully ready before we
 * return.
 */
async function navigateTo(
  page: Page,
  route: string,
  expected: string,
): Promise<string> {
  if (route !== expected) {
    page.goto(route, { timeout: 60_000 }).catch(() => {});
    await page
      .waitForURL((url) => url.pathname === expected, { timeout: 30_000 })
      .catch(() => {});
  } else {
    await page.goto(route, { waitUntil: "load", timeout: 60_000 });
    await expect(page.getByText("Loading NovaHR"))
      .toHaveCount(0, { timeout: 15_000 })
      .catch(() => {});
    await page.waitForTimeout(500);
  }

  return new URL(page.url()).pathname;
}

for (const persona of demoUsers) {
  const expectedNav = EXPECTED_NAV[persona.role];
  const access = ACCESS[persona.role];
  if (!expectedNav || !access) continue;

  test.describe(`role access: ${persona.role} (${persona.name})`, () => {
    test("main nav shows exactly the allowed items", async ({ page }) => {
      await loginAs(page, persona.email, persona.password);
      // Desktop viewport so the persistent sidebar (not the mobile bar) renders.
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto("/dashboard");
      await expect(page.getByText("Loading NovaHR")).toHaveCount(0, { timeout: 30_000 });

      const nav = page.locator('[data-sidebar="content"]');
      for (const href of expectedNav) {
        await expect(
          nav.locator(`a[href="${href}"]`),
          `${persona.role} should see nav ${href}`
        ).toHaveCount(1);
      }
      for (const href of ALL_NAV_HREFS.filter((h) => !expectedNav.includes(h))) {
        await expect(
          nav.locator(`a[href="${href}"]`),
          `${persona.role} should NOT see nav ${href}`
        ).toHaveCount(0);
      }
    });

    test("direct-URL access control redirects as expected", async ({ page }) => {
      await loginAs(page, persona.email, persona.password);

      const failures: string[] = [];
      for (const [route, expected] of Object.entries(access)) {
        const landed = await navigateTo(page, route, expected);
        if (landed !== expected) {
          failures.push(`${route} -> expected ${expected}, got ${landed}`);
        }
      }
      expect(failures, `Access-control mismatches for ${persona.role}:\n${failures.join("\n")}`).toHaveLength(0);
    });
  });
}
