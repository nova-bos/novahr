# Phase 3 — Payslip PDF export (browser print)

## What was built

- **`src/lib/payroll/print.ts`** — two exported functions:
  - `buildPayslipHtml(employee, payslip)` — pure function that returns a complete standalone HTML document string (no external dependencies) formatted for browser print/PDF.
  - `printPayslip(employee, payslip)` — opens a popup window, writes the HTML, and calls `window.print()`.
- **`src/components/payroll/payslip-dialog.tsx`** — updated with a "Download payslip" button in `DialogFooter` that calls `printPayslip`.
- **`src/lib/payroll/print.test.ts`** — 11 Vitest unit tests covering `buildPayslipHtml`.

## Architecture

### `buildPayslipHtml` — pure and testable

`buildPayslipHtml` is a plain function: it takes data, returns a string. No browser APIs, no side effects. This makes it fully testable in Vitest's node environment without any DOM setup.

The HTML output:

- Is a complete `<!DOCTYPE html>` document with all styles inlined in a `<style>` tag. No Tailwind, no external stylesheets — the popup window has no access to the app's stylesheet bundle.
- Uses `system-ui` sans-serif at 12 px body / 14 px headings.
- Colour palette: `#1a1a1a` text, `#f5f5f5` table headers, `rgba(37,99,235,0.08)` net pay box background, `#16a34a` net pay amount.
- Layout: company header ("NovaHR"), employee name + job title + department block, pay period + pay date, Earnings table (basic salary + line items + gross pay), Deductions table (line items + total), Net pay highlighted box, footer with generation date.
- Includes `@media print { body { margin: 0; } }` for clean print output.

### `printPayslip` — browser-only side effect

`printPayslip` is the browser boundary. It calls `window.open`, writes the HTML, and triggers `window.print()`. The `onafterprint` handler closes the popup automatically once the user dismisses the print dialog.

### Why a popup window instead of `@media print` on the main page

Using `@media print` on the main app page would force the entire app UI into print mode — hiding navigation, dialogs, and other elements. A popup window is isolated: it shows only the payslip, and closing it has no impact on the main app state. This also means the payslip can be printed or saved to PDF without any interference from the app's own print styles.

## Employee and HR views both get the button

The `PayslipDialog` component is shared across both views:

- **HR view** (`src/components/payroll/payroll-run-detail.tsx`) — HR opens a payslip by clicking a row in the payroll run's payslip table. This renders `PayslipDialog` with the selected employee and payslip.
- **Employee view** (`src/components/payroll/my-payslips.tsx`) — the employee clicks "View" on a row in their payslip history. This renders the same `PayslipDialog` with the current employee.

Because the "Download payslip" button lives inside `PayslipDialog`, both views get it automatically with no further changes.

## Manual testing in the browser

1. Sign in as an HR user and navigate to **Payroll** > open a completed run > click any employee row. The payslip dialog opens. Click **Download payslip** — a popup window should appear showing the formatted payslip, followed by the browser's print dialog.
2. Sign in as an employee user and navigate to **Payroll** > click **View** on any payslip row. Same result.
3. Save as PDF from the print dialog to verify the output looks correct with no Tailwind or app styles bleed.

## Gotchas

- **Popup blockers**: `window.open` will return `null` if the browser blocks the popup. The current implementation silently no-ops in that case (the `if (!win) return;` guard). For a production-grade UX improvement, the caller could check for `null` and show a toast — e.g. "Popups are blocked. Please allow popups for this site and try again."
- **`printPayslip` is browser-only** — do not call it from Server Components or Server Actions. It is imported only by `"use client"` components, so this is not an issue in the current codebase.
- **Intl formatting is locale-sensitive** — `buildPayslipHtml` uses the same `formatCurrency` / `formatDate` / `formatMonthYear` helpers as the rest of the app (locale `en-ZA`, currency `ZAR`). The output will say "R 27 750,00" not "$27,750.00". This is correct for the South African payroll context.
