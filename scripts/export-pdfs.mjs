/**
 * Export NovaHR user manuals to PDF using Playwright.
 * Run: node scripts/export-pdfs.mjs
 */

import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MANUALS_DIR = path.resolve(__dirname, "../docs/manuals");

const MANUALS = [
  { html: "novahr-hr-admin-manual.html",  pdf: "NovaHR_HR_Admin_Manual.pdf" },
  { html: "novahr-employee-manual.html",  pdf: "NovaHR_Employee_Manual.pdf" },
  { html: "novahr-manager-manual.html",   pdf: "NovaHR_Manager_Manual.pdf" },
  { html: "novahr-exco-manual.html",      pdf: "NovaHR_Executive_Manual.pdf" },
];

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  for (const { html, pdf } of MANUALS) {
    const htmlPath = path.join(MANUALS_DIR, html);
    const pdfPath  = path.join(MANUALS_DIR, pdf);

    // Use file:// URL so relative image paths resolve correctly
    const fileUrl = `file://${htmlPath}`;
    console.log(`Rendering ${html} ...`);

    await page.goto(fileUrl, { waitUntil: "networkidle", timeout: 60000 });
    // Give fonts and images a moment to fully paint
    await page.waitForTimeout(1500);

    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,   // needed for coloured covers and background fills
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    console.log(`  -> ${pdf}`);
  }

  await browser.close();
  console.log("\nAll PDFs exported to docs/manuals/");
})();
