# NovaHR: Complete Application Overview

> **Note:** This narrative overview is from July 2026 and predates the 2026-08 completion initiative. For the definitive, up-to-date list of everything the app can do, see **`CAPABILITIES.md`**.

A self-contained description of what NovaHR is and everything it can do, current as of July 2026. Written so that any person or AI assistant can get fully up to speed without access to the codebase.

---

## Overview

NovaHR is a multi-tenant HR and payroll SaaS built specifically for South African small and medium businesses. Each customer company (a "tenant") gets an isolated workspace where they manage employees, leave, payroll, and statutory compliance. It is live in production at https://novahr-five.vercel.app and is part of the Nova Business OS suite (alongside NovaPOS, NovaFinance, and NovaPilot).

**Tech stack:** Next.js 15.5 (App Router, React 19, TypeScript), Supabase (Postgres + Auth), Prisma 7 ORM with `@prisma/adapter-pg`, Tailwind CSS v4 with shadcn/ui components, Resend for transactional email, `@react-pdf/renderer` for payslip PDFs, Sentry (`@sentry/nextjs` v10) for error monitoring, Recharts for charts, Vitest for testing (254 tests across 27 files), hosted on Vercel.

---

## Roles and Permissions

Every login belongs to exactly one company and has one of four roles:

1. **HR Administrator (hr):** Full access. Manages employees, approves leave, runs payroll, configures settings, invites users, and manages billing. The person who signs the company up becomes its first HR admin.
2. **Manager:** Sees their own record plus their direct reports. Can submit leave for themselves, and approve or reject their reports' leave requests (never their own). Cannot see salaries or banking details of people outside their team, and cannot access payroll, settings, or compliance.
3. **Employee:** Self-service only. Sees their own profile, payslips, and leave balances; can request leave for themselves. Colleague data is limited to basic directory info (name, title, department); salaries, banking, and ID numbers of others are never sent to their browser.
4. **Executive (exco):** Read-only oversight. Dashboards, reports, compliance status, and company overview, but no editing rights.

Navigation adapts per role: an employee sees Dashboard, My Profile, My Payslips, and Leave; HR sees nine sections including Compliance, Deductions, Reports, Billing, and Settings.

---

## Feature Modules

### Company signup and onboarding

A public marketing landing page with feature overview, pricing tiers, and contact section. Self-service signup creates the tenant, the HR admin account, and the first scheduled payroll run in a single step so the payroll page is never empty. New companies start a 14-day full-feature trial. A "Getting started" card guides new HR admins through adding departments, adding employees, and running their first payroll.

### Employee management

The employee directory supports search, filters, and status badges (active, on leave, probation, terminated). A four-step onboarding wizard collects personal info, role and reporting line, compensation, and a review step, with SA-aware validation on ID number (Luhn check), phone, bank account, and branch code. Employee numbers are auto-generated server-side from a configurable per-company format.

Rich employee profiles include: personal details, job info, compensation (annual gross, travel and housing allowances, pension percentage, medical aid), bank details with fraud-aware audit trail on changes, tax and SA ID numbers (date of birth is derived from the SA ID number), emergency contacts, equity data (race and gender for EEA2/EEA4 reporting), onboarding checklist with progress tracking, leave balances, payslip history, and salary history.

Document vault: per-employee file storage with signed URLs for secure access. Profile photo upload to Supabase Storage.

### Leave management

All nine South African leave types with legally correct BCEA entitlements, including the Van Wyk interim order of October 2025:

| Type | Default entitlement | Employer-paid |
| --- | --- | --- |
| Annual | 18 working days/year | Yes |
| Sick | 30 working days per 36-month cycle | Yes |
| Family responsibility | 3 days/year | Yes |
| Maternity | 4 months (~88 working days) | No (UIF) |
| Parental | 10 consecutive days | No (UIF) |
| Adoption | 10 weeks (~50 days, child under 2) | No (UIF) |
| Commissioning parental (surrogacy) | 10 weeks (~50 days) | No (UIF) |
| Study | 5 days/year | Yes |
| Unpaid | 5 days/year discretionary | No |

Leave is counted in working days: weekends and SA public holidays are excluded automatically. The 2026-2028 holiday calendar is built in, including the rule that a holiday falling on a Sunday is observed the following Monday.

The request flow lets employees pick leave type, dates, reason, and optionally attach a supporting document (JPEG, PNG, or PDF up to 10 MB, for example a medical certificate). The UI shows the live balance impact; the server independently recomputes the working-day count and rejects ranges with zero working days.

A leave calendar gives HR a visual overview of who is off and when. The balances tab shows per-employee running balances (annual, sick, family, study, unpaid) with progress bars. The policies tab documents each leave type with its statutory basis.

Approvals: HR can decide any request. Managers can decide their direct reports' requests but never their own. Approval decrements the balance and emails the employee. HR and managers receive an email when a request comes in.

### Payroll

Monthly payroll runs (biweekly and weekly capable). HR starts a run and then finalises it; the next month's run is scheduled automatically.

The calculator implements the 2026/27 tax year (1 March 2026 to 28 February 2027), verified against the gazetted SARS Budget 2026 tables:

- All seven PAYE brackets (18% to 45%) with progressive calculation
- Rebates: primary R17,820, secondary (65+) R9,765, tertiary (75+) R3,249, derived from the SA ID number
- Medical aid tax credits (s6A): R376 main member, R376 first dependant, R254 each additional
- Retirement contribution deduction (s11F): lesser of 27.5% of remuneration or R430,000/year
- Travel allowance: 80% taxable inclusion (20% with logbook)
- UIF: 1% employee + 1% employer, capped at R177.12/month (R17,712 ceiling)
- SDL: 1% employer levy applied only when annual payroll reaches R500,000
- Unpaid leave days reduce pay pro rata

Per-tenant PayrollSettings (UIF ceiling, SDL rate, SDL toggle) feed directly into calculations, so what HR configures is what the calculator uses.

Payslips: itemised earnings and deductions, generated per employee per run, viewable in-app, downloadable as a branded PDF in one of four templates (classic, modern, corporate, branded), and emailed to employees when the run completes. An optional maker-checker approval step holds payslip emails until the designated approver signs off.

Bank payments: export a standard EFT CSV, generate a Netcash NIF salary batch file, or submit the batch directly to Netcash via their NIWS API (per-tenant service key encrypted with AES-256-GCM). The submission path is idempotent: a pre-submit ledger row prevents double payment on duplicate requests or retries.

Loans and garnishees: post-tax deductions with a 25% of gross garnishee cap enforced in the payroll engine.

ETI (Employment Tax Incentive): full 24-month ledger per employee with monthly carry-forward tracking.

### SA Compliance

Compliance records are generated automatically from completed payroll runs:

- **EMP201:** PAYE, UIF, and SDL return records per period with statutory due dates. Track submission status (pending, submitted with reference number, accepted, rejected).
- **IRP5/IT3(a) and EMP501:** Reconciliation records and year-to-date totals generated per run.
- **Employment Equity Report (EEA2/EEA4):** Driven by per-employee race, gender, and occupational level data.
- **UIF declaration:** Monthly UIF contribution records per employee.

Year-summary totals are available for EMP201 and EMP501 preparation. HR has write access; exco has read access.

### POPIA compliance

Data export: generates a JSON export of all personal information held for a named employee. PII erasure: removes personal data fields from an employee's record and writes an audit trail entry so the deletion is provable. Both actions are available to HR only.

### Earnings and deduction types

Configurable per-company catalogue: earning types (basic, overtime, bonus, commission, travel allowance, housing allowance) with taxable flags; deduction types (PAYE, UIF, medical aid, retirement, garnishee, loans) with statutory and employer flags. Statutory types cannot be deleted. Sensible defaults are seeded automatically at tenant creation.

### Reports

- Workforce: headcount trends, employment-type mix, department breakdown
- Leave: approved days by type, usage charts
- Payroll: cost trends, composition (net vs PAYE vs UIF), year-to-date analytics

### Role-specific dashboards

- **HR:** stat cards, payroll trend chart, department breakdown, activity feed, upcoming payroll, pending leave approvals, quick actions
- **Manager:** team overview and pending team leave requests with inline approve/reject
- **Employee:** personal profile summary, own leave balances, payslip shortcuts, getting started card for new accounts
- **Executive:** group-level KPIs and report shortcuts

Global features available to all roles: notifications menu (read/unread), activity feed, command menu (Cmd+K), light/dark theme toggle.

### Team and workspace administration

**Company:** legal name, registration and VAT numbers, industry, address, primary contact.

**Users:** list of workspace logins with roles. Invite users by email; invites use single-use tokens (only a SHA-256 hash is stored) that expire in 7 days and can be revoked. The invitee sets a password on the accept-invite page and is signed in immediately. If email is not configured, HR gets a copyable invite link.

**Departments:** create, rename, and delete departments (employees in a deleted department move to "Unassigned"). Shows live headcounts.

**Payroll:** pay frequency and pay day, company bank, SDL/UIF toggles and rates, UIF ceiling, PAYE/UIF/SDL statutory reference numbers, payslip branding (company name, logo, accent colour), Netcash service key.

**Leave policies:** read-only view of the statutory policy set with BCEA context.

### Billing and plans

A 14-day trial is set at signup. In the final week a countdown banner appears; when the trial expires the app locks (data preserved) behind an upgrade screen. The Billing page shows three tiers (Starter R499/month up to 10 employees, Growth R999 up to 30, Scale R2,499 unlimited) with a contact-sales flow. Payment is currently manual (invoice + EFT; plan changed by the operator). Plan gating: the `hr` plan excludes payroll features; `hr_payroll` and trial include everything.

---

## Compliance Coverage

| Statutory obligation | Status |
| --- | --- |
| PAYE (SARS 2026/27 brackets, rebates, medical credits, s11F) | Complete |
| UIF (1% employee + employer, R17,712 ceiling) | Complete |
| SDL (1% employer, R500,000 threshold) | Complete |
| ETI (Employment Tax Incentive, 24-month ledger) | Complete |
| EMP201 returns | Complete |
| IRP5/IT3(a) certificates | Complete |
| EMP501 annual reconciliation | Complete |
| Employment Equity (EEA2/EEA4) | Complete |
| UIF declaration | Complete |
| BCEA leave (all 9 types, working-day counting) | Complete |
| POPIA data export and erasure | Complete |

---

## Security Architecture

Defence in depth across five layers:

1. **Middleware:** Every request to an app route is checked server-side against the Supabase session cookie. Unauthenticated requests are redirected to login before any page code runs.
2. **Server actions:** Every data operation authenticates the session and authorises by role server-side (`requireUser`, `requireRole`, `requireTenant`, `requireEmployeeScope`). The client can never choose which tenant it acts on.
3. **Application-layer tenant isolation:** Every database query on tenant-scoped tables includes an explicit `tenantId` predicate. This is the primary enforcement layer. Postgres RLS policies are also present on all tenant tables as dormant defence-in-depth (the current Supabase connection role carries BYPASSRLS, so RLS does not enforce at runtime, but the policies are ready if the connection role changes).
4. **Role-scoped payloads:** The workspace data sent to the browser is sanitised per role, so sensitive fields (salaries, banking, ID numbers) of other employees never reach a non-privileged user's device.
5. **Transport and header security:** HSTS (2 years, includeSubDomains), CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy` on all responses. Secrets kept in server-only environment variables. Invite tokens stored only as SHA-256 hashes. Netcash service keys encrypted at rest with AES-256-GCM.

Rate limiting is applied on invite acceptance, invite creation per tenant, Netcash key testing, and the public contact form. Login and signup rely on Supabase and Vercel platform defaults.

Sentry (`@sentry/nextjs` v10) provides error monitoring and alerting in production.
