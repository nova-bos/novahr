/**
 * Responsive audit: visits every app route for each demo persona at three
 * viewport widths and fails on any horizontal overflow that is not inside an
 * intentional scroll container.
 *
 * Prerequisites:
 *  - The demo seed must be live (npm run seed or the existing demo tenant).
 *  - The dev server must be running (or Playwright will start one via webServer).
 *
 * Run with: npm run test:e2e -- --project=chromium e2e/responsive-audit.spec.ts
 */

import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { demoUsers } from "../src/lib/auth/demo-users";

const VIEWPORTS = [
  { label: "mobile",  width: 375,  height: 812  },
  { label: "tablet",  width: 768,  height: 1024 },
  { label: "desktop", width: 1280, height: 800  },
] as const;

// Known employee IDs from the demo seed (prisma/seed.ts).
const DEMO_EMP_HR  = "novatech-emp-001";
const DEMO_EMP_003 = "novatech-emp-003";

const ROUTES_BY_ROLE: Record<string, string[]> = {
  hr: [
    "/dashboard",
    "/employees",
    `/employees/${DEMO_EMP_003}`,
    "/employees/new",
    "/payroll",
    "/leave",
    "/compliance",
    "/deductions",
    "/reports",
    "/billing",
    "/settings",
    "/account",
  ],
  manager: [
    "/dashboard",
    "/employees",
    `/employees/${DEMO_EMP_003}`,
    "/payroll",
    "/leave",
    "/account",
  ],
  employee: [
    "/dashboard",
    "/payroll",
    "/leave",
    `/employees/${DEMO_EMP_003}`,
    "/account",
  ],
  exco: [
    "/dashboard",
    "/reports",
    "/compliance",
    "/account",
  ],
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
 * Returns overflow info for the current page, or null if there is no overflow.
 * Only reports elements whose computed overflowX is not auto/scroll (i.e. not
 * intentional scroll containers), and that extend beyond the viewport.
 */
async function detectOverflow(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const docW = document.documentElement.scrollWidth;
    if (docW <= vw + 1) return null;

    type Offender = { tag: string; id: string; cls: string; text: string; right: number };
    const offenders: Offender[] = [];

    document.querySelectorAll<HTMLElement>("*").forEach((el) => {
      const style = window.getComputedStyle(el);
      if (["auto", "scroll"].includes(style.overflowX)) return;
      const rect = el.getBoundingClientRect();
      if (rect.right > vw + 2 && rect.width > 0 && rect.height > 0) {
        offenders.push({
          tag: el.tagName,
          id: el.id ?? "",
          cls: Array.from(el.classList).slice(0, 4).join(" "),
          text: (el.textContent ?? "").trim().slice(0, 60).replace(/\s+/g, " "),
          right: Math.round(rect.right),
        });
      }
    });

    if (offenders.length === 0) return null;

    const lines = offenders.slice(0, 6).map(
      (o) =>
        `  <${o.tag.toLowerCase()}${o.id ? ` id="${o.id}"` : ""}${o.cls ? ` class="${o.cls}"` : ""}> right=${o.right}px text="${o.text}"`
    );
    return `page scrollWidth=${docW} > viewport=${vw}\n${lines.join("\n")}`;
  });
}

test.describe.configure({ mode: "serial" });

for (const persona of demoUsers) {
  const routes = ROUTES_BY_ROLE[persona.role] ?? [];
  if (routes.length === 0) continue;

  test.describe(`responsive audit: ${persona.role} (${persona.name})`, () => {
    let ctx: BrowserContext;
    let page: Page;

    test.beforeAll(async ({ browser }) => {
      ctx = await browser.newContext();
      page = await ctx.newPage();
      await loginAs(page, persona.email, persona.password);
    });

    test.afterAll(async () => {
      await ctx?.close();
    });

    for (const vp of VIEWPORTS) {
      test(`${vp.label} (${vp.width}px): no horizontal overflow`, async () => {
        await page.setViewportSize({ width: vp.width, height: vp.height });

        const findings: string[] = [];

        for (const route of routes) {
          await page.goto(route, { waitUntil: "load", timeout: 90_000 });

          // Wait for any loading skeleton to disappear.
          await page.waitForFunction(
            () => !document.body.textContent?.includes("Loading NovaHR"),
            { timeout: 20_000 }
          ).catch(() => {});

          // Give React a moment to finish layout after hydration.
          await page.waitForTimeout(400);

          const overflow = await detectOverflow(page);
          if (overflow) {
            findings.push(`[${route}] ${overflow}`);
          }
        }

        if (findings.length > 0) {
          expect.soft(
            findings,
            `Horizontal overflow detected at ${vp.width}px for ${persona.role}:`
          ).toHaveLength(0);
        }
      });
    }
  });
}
