import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE = "https://novahr-five.vercel.app";
const OUT = new URL("./shots-dark/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: "chrome" });

async function capture(email, password, pages) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  await ctx.addInitScript(() => localStorage.setItem("theme", "dark"));
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard**", { timeout: 30000 });
  for (const { path, name, settle } of pages) {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(settle ?? 2500);
    await page.screenshot({ path: `${OUT}${name}.png` });
    console.log("captured", name);
  }
  await ctx.close();
}

await capture("aisha.patel@novatech.co.za", "employee123", [
  { path: "/payroll", name: "employee-payslips" },
]);

await browser.close();
console.log("done");
