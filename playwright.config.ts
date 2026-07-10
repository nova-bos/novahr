import { defineConfig, devices } from "@playwright/test";

/**
 * E2E golden-journey smoke suite (docs/TESTING_ROADMAP.md section 3).
 *
 * SAFETY: the local dev server talks to the SAME Supabase project as
 * production. The suite therefore never touches existing tenants: it signs up
 * one disposable tenant through the real /signup flow, runs every journey
 * inside it, and global teardown cascade-deletes the tenant and its auth
 * users. Do not point E2E_BASE_URL at the production deployment.
 *
 * Run with: npm run test:e2e   (expects `npm run dev` already listening,
 * otherwise Playwright starts one itself via webServer below).
 */
export default defineConfig({
  testDir: "./e2e",
  // Journeys share one tenant and build on each other: strictly serial.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  // Dev-mode Next.js compiles every route on first visit; journeys that walk
  // many pages need generous budgets.
  timeout: 300_000,
  expect: { timeout: 15_000 },
  // Artifacts live OUTSIDE the repo: writing them into the project tree
  // makes the Next.js dev watcher recompile and Fast-Refresh-reload the very
  // pages under test.
  reporter: [["list"], ["html", { open: "never", outputFolder: "/tmp/novahr-e2e/report" }]],
  outputDir: "/tmp/novahr-e2e/artifacts",
  globalTeardown: "./e2e/helpers/global-teardown.ts",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/api/health",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
