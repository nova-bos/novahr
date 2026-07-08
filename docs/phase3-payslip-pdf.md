# Phase 3: Payslip PDF export

Phase complete. See docs/APP_OVERVIEW.md for the current state of payslip generation.

Payslips are now generated server-side using `@react-pdf/renderer` with four templates (classic, modern, corporate, branded). The original phase used a browser-print popup via `window.print()`; the production implementation uses a proper PDF renderer dynamically imported on the server to keep it off the main bundle. See `src/lib/payroll/pdf.tsx` for the implementation.
