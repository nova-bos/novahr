import { chromium } from "playwright";

const BASE = "https://novahr-five.vercel.app";
const OUT = new URL("./shots-dark/", import.meta.url).pathname;

const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
await ctx.addInitScript(() => localStorage.setItem("theme", "dark"));
const page = await ctx.newPage();
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.fill("#email", "lerato.dlamini@novatech.co.za");
await page.fill("#password", "hr123");
await page.keyboard.press("Enter");
await page.waitForURL("**/dashboard**", { timeout: 30000 });
await page.goto(`${BASE}/leave`, { waitUntil: "networkidle" });
await page.getByText("Balances", { exact: true }).first().click();
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}hr-leave-balances.png` });
console.log("captured hr-leave-balances");
await browser.close();
