# NovaHR Screenshot Assets

These PNGs are used in customer-facing user guides (quick-start, onboarding,
payroll-setup, and how-to guides) when those documents are converted to PDF via
Cowork.

## Prerequisites

1. The dev server must be running locally before you capture screenshots.

   ```bash
   npm run dev
   ```

2. The local database must be seeded with the demo tenant and personas.
   If you have not done this yet, run the seed script first:

   ```bash
   npx prisma db seed
   ```

## Capturing screenshots

In a separate terminal, while the dev server is running:

```bash
npm run screenshots
```

Or directly with tsx:

```bash
npx tsx scripts/capture-screenshots.ts
```

To watch the browser while it runs (useful for debugging):

```bash
npm run screenshots -- --headed
```

Output goes to `docs/screenshots/` as PNG files. Existing files are
overwritten on each run.

## Persona used

All authenticated screens are captured as **Lerato Dlamini** (HR Admin at
NovaTech Solutions). This persona has access to every section of the app:
employees, leave, payroll, reports, and settings. Credentials are defined in
`src/lib/auth/demo-users.ts`.

## Screenshots captured

| File | Route | Notes |
|---|---|---|
| `dashboard.png` | `/dashboard` | HR dashboard with stat cards |
| `employees-list.png` | `/employees` | Employee directory table |
| `add-employee.png` | `/employees/new` | Step 1 of the add-employee wizard |
| `employee-profile.png` | `/employees/<id>` | First employee in the list |
| `leave-requests.png` | `/leave` | Leave requests tab |
| `leave-approval.png` | `/leave` | Scrolled to a pending request row (skipped if none exist) |
| `payroll-dashboard.png` | `/payroll` | Payroll overview page |
| `payroll-run.png` | `/payroll` | CurrentRunCard scrolled into viewport (skipped if not visible) |
| `payslip-view.png` | `/payroll/<id>` | First completed payroll run detail (skipped if no history) |
| `settings-company.png` | `/settings` | Company tab (default) |
| `reports.png` | `/reports` | Payroll reports tab (default) |
| `compliance.png` | `/compliance` | Public compliance/POPIA page (no auth required) |

## Skipped screenshots

If a page is inaccessible or a required element is not present (for example,
no pending leave requests exist, or no payroll runs have been completed yet),
the script logs a `Skipped:` line and continues. Check the terminal output
after each run to see which files were written and which were skipped.

## Troubleshooting

- **"Skipped: dashboard.png - Navigation timeout"**: The dev server is not
  running. Start it with `npm run dev` and try again.
- **"Skipped: leave-approval.png - no pending leave requests found"**: The
  demo data has no pending requests. Approve or create one through the UI and
  re-run.
- **"Skipped: payslip-view.png - no completed payroll runs in history"**: Run
  a payroll cycle through the UI first, then re-run the script.
- **Login fails**: The demo personas are only seeded locally. This script
  targets `http://localhost:3000` by default. Set `SCREENSHOT_BASE_URL` to
  override the base URL.
