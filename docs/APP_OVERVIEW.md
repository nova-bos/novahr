# NovaHR: Complete Application Overview

A self-contained description of what NovaHR is and everything it can do, current as of 2 July 2026. Written so that any person or AI assistant can get fully up to speed without access to the codebase.

## What NovaHR is

NovaHR is a multi-tenant HR and payroll SaaS built specifically for South African small and medium businesses. Each customer company (a "tenant") gets an isolated workspace where they manage employees, leave, payroll, and statutory compliance. It is live in production at https://novahr-five.vercel.app and is part of the Nova Business OS suite (alongside NovaPOS, NovaFinance, and NovaPilot).

**Tech stack:** Next.js 15 (App Router, React 19, TypeScript), Supabase (Postgres database + Auth), Prisma 7 ORM, Tailwind CSS v4 with shadcn/ui components, Resend for transactional email, @react-pdf/renderer for payslip PDFs, Recharts for charts, Vitest for testing (233 unit tests), hosted on Vercel with CI on GitHub Actions.

## User roles

Every login belongs to exactly one company and has one of four roles:

1. **HR Administrator (hr)**: full access. Manages employees, approves leave, runs payroll, configures settings, invites users, manages billing. The person who signs the company up becomes its first HR admin.
2. **Manager**: sees their own record plus their direct reports. Can submit leave for themselves and their team, and approve or reject their reports' leave requests (never their own). Cannot see salaries or banking details of anyone outside their team, and cannot access payroll, settings, or compliance.
3. **Employee**: self-service only. Sees their own profile, payslips, and leave; can request leave for themselves. Colleague data is limited to basic directory info (name, title, department); salaries, banking, and ID numbers of others are never sent to their browser.
4. **Executive (exco)**: read-only oversight. Dashboards, reports, compliance status, and company overview, but no editing rights.

Navigation adapts per role (for example an employee sees Dashboard, My Profile, My Payslips, Leave; HR sees nine sections including Compliance, Deductions, Reports, Billing, Settings).

## Feature domains

### 1. Company signup and onboarding
- Public marketing landing page with features, pricing tiers, contact section, and WhatsApp button.
- Self-service signup: company name + admin details creates the tenant, the HR admin account, and the first scheduled payroll run. New companies start a 14-day full-feature trial.
- A "Getting started" card guides new admins (add departments, add employees, run payroll).

### 2. Employee management
- Employee directory with search, filters, avatars, and status badges (active, on leave, probation, terminated).
- Four-step onboarding wizard: personal info, role and reporting line, compensation, review.
- Rich employee profiles: personal details, job info, compensation (annual gross, travel and housing allowances, pension %, medical aid), banking details, tax and SA ID numbers (date of birth is derived from the SA ID number), emergency contacts, leave balances, payslip history, and an onboarding checklist with progress tracking.
- Employee numbers are auto-generated server-side from the company name (for example "NT-0001").
- Profile photo upload to Supabase Storage.
- Salary history tracking table exists in the schema.

### 3. Leave management (full SA statutory framework)
All nine South African leave types with legally correct entitlements (BCEA sections 20 to 27 plus the Constitutional Court's Van Wyk interim order of October 2025):

| Type | Default entitlement | Employer-paid |
| --- | --- | --- |
| Annual | 18 working days/year (above the BCEA minimum of 15) | Yes |
| Sick | 30 working days per 36-month cycle | Yes |
| Family responsibility | 3 days/year | Yes |
| Maternity | 4 months (~88 working days) | No (UIF benefits) |
| Parental | 10 consecutive days | No (UIF) |
| Adoption | 10 weeks (~50 days, child under 2) | No (UIF) |
| Commissioning parental (surrogacy) | 10 weeks (~50 days) | No (UIF) |
| Study | 5 days/year (company policy) | Yes |
| Unpaid | 5 days/year discretionary | No |

- Leave is counted in **working days**: weekends and South African public holidays are excluded automatically. The 2026-2028 holiday calendar is built in, including the rule that a holiday falling on a Sunday is observed the following Monday.
- A **Public Holidays tab** displays the full SA holiday calendar per year, with a note on double pay for working a public holiday (BCEA s18).
- Request flow: employee picks type (grouped: Standard / Family and parental / Other), dates, reason, and can attach a supporting document (JPEG/PNG/PDF up to 10 MB, for example a medical certificate). The UI shows the live balance impact; the server independently recomputes the working-day count and rejects ranges with zero working days.
- Approvals: HR can decide any request; managers only their direct reports' and never their own. Approval decrements the balance; both directions email the employee. HR/managers get an email when a request comes in.
- Balances tab shows per-employee running balances (annual, sick, family, study, unpaid) with progress bars; Policies tab documents each leave type with its statutory basis.

### 4. Payroll (SARS 2026/27 compliant)
- Monthly (also biweekly/weekly capable) payroll runs. HR starts and completes a run; the next month's run is scheduled automatically.
- The calculator implements the 2026/27 tax year (1 March 2026 to 28 February 2027), verified against the official SARS tables:
  - All seven PAYE brackets (18% to 45%).
  - Rebates: primary R17,820, secondary (65+) R9,765, tertiary (75+) R3,249, driven by age derived from the SA ID number.
  - Medical aid tax credits (s6A): R376 main member, R376 first dependant, R254 each additional, using dependant counts from the employee's payroll profile.
  - Retirement contribution deduction (s11F): lesser of 27.5% of remuneration or R430,000/year.
  - Travel allowance taxed at 80% inclusion (20% with logbook).
  - UIF: 1% employee + 1% employer, capped at R177.12/month each (R17,712 ceiling).
  - SDL: 1% employer levy, applied only when annual payroll reaches R500,000.
  - Unpaid leave days reduce pay pro rata.
- Payslips: itemised earnings and deductions, generated per employee per run, viewable in-app, downloadable as branded PDF, and emailed to employees when the run completes.
- Bank payments: export a standard EFT CSV, generate a Netcash NIF salary batch file, or submit the batch directly to Netcash via their BatchFileUpload API (per-tenant service key stored in settings).

### 5. Compliance
- PAYE, UIF, and SDL return records generated per period from completed payroll runs, with statutory due dates.
- Track status per return: pending, submitted (with reference number), accepted, rejected.
- Year summary totals (toward EMP201/EMP501 preparation). Read access for exco, write for HR.

### 6. Earnings and deduction types
- Configurable catalogue per company: earning types (basic, overtime, bonus, commission, travel/housing allowance) with taxable flags, and deduction types (PAYE, UIF, medical aid, retirement, garnishee, loans) with statutory/employer flags. Statutory types cannot be deleted. Sensible defaults are seeded automatically.

### 7. Reports
- Workforce: headcount trends, employment-type mix, department breakdown.
- Leave: approved days by type, usage charts.
- Payroll: cost trends, composition (net vs PAYE vs UIF), year-to-date analytics.

### 8. Dashboards (role-specific)
- HR: stat cards, payroll trend chart, department breakdown, activity feed, upcoming payroll, pending leave approvals, quick actions.
- Manager: team overview and pending team leave requests with inline approve/reject.
- Employee: personal profile summary, own leave balances, payslip shortcuts.
- Exco: group-level KPIs and reports shortcuts.
- Global: notifications menu (read/unread), activity feed, command menu (Cmd+K), light/dark theme.

### 9. Team and workspace administration (Settings)
- **Company**: legal name, registration and VAT numbers, industry, address, primary contact.
- **Users**: list of workspace logins with roles; invite users by email. Invites use single-use tokens (only a SHA-256 hash is stored) that expire in 7 days and can be revoked; the invitee sets a password on an accept-invite page and is signed in immediately. If email isn't configured, HR gets a copyable invite link instead.
- **Departments**: create, rename, delete departments (employees in a deleted department move to "Unassigned"); shows live headcounts.
- **Payroll**: pay frequency and pay day, company bank, SDL/UIF toggles and rates, UIF ceiling, PAYE/UIF/SDL statutory reference numbers, payslip branding (company name, logo, accent colour), Netcash service key.
- **Leave policies**: read-only view of the statutory policy set with BCEA context.
- **Notifications** and **Appearance** preferences.

### 10. Billing and plans
- 14-day trial set at signup. In the final week a countdown banner appears; when the trial expires the app locks (data preserved) behind an upgrade screen. The Billing page shows three tiers (Starter R499/month up to 10 employees, Growth R999 up to 30, Scale R2,499 unlimited) with a contact-sales flow; payment is currently manual (invoice + EFT, plan flipped by the operator). Plan gating: the "hr" plan excludes payroll features; "hr_payroll" and trial include everything.

### 11. Legal and public pages
- Terms of Service and Privacy Policy (written for South Africa's POPIA), linked from signup. Marketing pages include pricing and contact.

## Security model (defence in depth)
1. **Middleware**: every request to an app route is checked server-side against the Supabase session cookie; unauthenticated requests are redirected to login before any page code runs.
2. **Server actions**: every data operation authenticates the session and authorizes by role server-side (requireUser / requireRole / requireTenant / requireEmployeeScope). The client can never choose which tenant it acts on.
3. **Role-scoped payloads**: the workspace data sent to the browser is sanitized per role, so sensitive fields (salaries, banking, ID numbers) of other people never reach a non-privileged user's device.
4. **Postgres row-level security**: every tenant table has a FORCE RLS policy keyed on a per-transaction tenant variable, so even a bug in application code cannot cross tenants. Supabase's REST API is blocked for anonymous/authenticated roles.
5. Invite tokens stored only as hashes; user-provided strings HTML-escaped in emails; security headers (CSP, nosniff, frame options, referrer policy) on all responses; secrets in server-only environment variables.

## Email notifications (via Resend, when configured)
- New leave request (to HR and managers), leave decision (to the employee), payslip published (to each employee), and workspace invitations. All emails are branded HTML; sending failures never break the underlying action, and the whole email layer silently disables if no API key is set.

## Testing and quality
- 233 unit tests across 24 files: payroll calculator against SARS figures, working-day/holiday logic, leave rules, role-based data sanitization, employee creation, settings, pricing, formatting, SA ID validation.
- CI runs lint, type-check, and tests on every push/PR. A testing roadmap document defines five end-to-end "golden journeys" (signup, invitations, leave lifecycle, payroll run, security probes), release gates, and a statutory review calendar (tax tables every March budget, public holidays every December, BCEA parental-leave amendment expected by October 2028).

## Current limitations (known and documented)
- No payment gateway yet: subscriptions are billed manually and plans are changed by the operator in the database.
- Transactional email is off until a Resend API key and verified sending domain are configured (invites work via copy-link fallback).
- Leave supporting documents are stored in a public storage bucket with unguessable URLs; a move to a private bucket with signed URLs is planned.
- Leave policy amounts are statutory defaults, not yet customizable per company.
- No termination workflow UI, payroll approval enforcement, or per-user notification targeting yet.
- One shared Supabase database currently serves both development and production.
