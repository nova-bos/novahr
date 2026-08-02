# NovaHR — Complete Capabilities

Current as of 2026-08-02. This is the definitive list of everything NovaHR can do in its present state. Live at https://novahr-five.vercel.app.

For a narrative introduction see `APP_OVERVIEW.md` (older); for gap/score status see `HR_FEATURE_COMPLETENESS_AUDIT.md` (9.7/10, 438 unit tests).

**Stack:** Next.js 15.5 (App Router, React 19, TypeScript), Supabase (Postgres + Auth), Prisma 7 (`@prisma/adapter-pg`), Tailwind v4 + shadcn/ui, Resend (email), `@react-pdf/renderer` (PDFs), `write-excel-file` (XLSX), Sentry, Recharts, Vitest. Multi-tenant, hosted on Vercel.

---

## Accounts, roles & access
- Self-service company signup (creates the tenant, first HR admin, and an initial scheduled pay run); free trial with plan/billing via Paystack.
- Four roles: **HR administrator** (full), **Manager** (own record + direct reports), **Employee** (self-service), **Executive** (read-only oversight). Navigation and data adapt per role.
- Invite users by email (single or bulk from the employee list); one-time tokenised invite links with email delivery and a copyable fallback link; revoke/resend.
- Role change and access removal per user.
- **Two-factor authentication (TOTP)** enrolment: scan a QR / enter a secret with an authenticator app, verify, and turn off (Supabase Auth MFA).
- Password reset by email; account/profile editing (name, title, avatar colour); close-account flow.
- **Multi-company:** a user can belong to several workspaces and switch between them from the topbar switcher; inviting an existing account grants it access to your workspace; removing/role-changing a user is membership-aware (only deletes the account on their last workspace).
- Branch-scoped admins (an HR user limited to a single branch).
- App-layer tenant isolation on every scoped query; DB-backed distributed rate limiting.

## Employee management
- Full employee records: personal details, contact, next-of-kin (separate from emergency contact), residential address, tax number.
- **Identity:** SA ID or passport. Date of birth and gender **auto-derived from the SA ID** but **editable** (gender via dropdown incl. "other"); passport path captures nationality + DOB.
- Comprehensive SA-context dropdowns: gender, marital status (incl. customary marriage, civil union), qualifications (full NQF ladder: matric → doctorate), employment types (full-time, part-time, fixed-term, temporary, casual, learnership, internship).
- Structured qualifications (type, institution, year, expiry), skills, languages, and tenant-defined **custom fields**.
- Employment-equity demographics (race, gender, occupational level, foreign national, disability).
- **Probation tracking:** default 3-month probation on hire, editable end date, and "confirm or extend" reminders.
- **Employment history timeline:** promotions (job-title changes) and transfers (department/branch) auto-captured on edit; salary-change history.
- **Performance reviews:** cycle, 1–5 rating, strengths / areas to improve / goals; managers review only their direct reports; the employee can acknowledge.
- **Disciplinary records** (warnings, counselling, hearings) with issue/expiry dates.
- **Documents vault:** upload per employee (private, signed-URL access), categories, expiry dates, and **version history** (re-uploading the same name supersedes and keeps prior versions).
- **Recurring pay components** per employee (e.g. a permanent commission/allowance) that HR applies to any run.
- Cost-centre assignment; job-title suggestions from the position catalogue.
- Guided **onboarding wizard** (personal → role → compensation → review) with per-step validation; onboarding checklist and buddy.
- Bulk employee **import** (CSV) and bulk **export** (CSV/Excel; salary gated to HR/exco).
- Termination flow (termination + final-pay dates, reason, leave encashment on exit) and generated **letters** (offer, confirmation, warning, termination).
- Org directory with search + filters (department, branch, status); clickable **organisation chart** built from reporting lines.

## Leave management
- Statutory SA leave framework (BCEA): annual, sick (30/36-month cycle), family responsibility, maternity, parental, adoption, commissioning, plus study and unpaid.
- **Configurable per company:** entitlement days per type, annual-leave accrual vs upfront, carryover + cap, sick-note threshold.
- **Configurable employer-paid family leave:** maternity/parental/adoption/commissioning default to *unpaid by employer* (BCEA — claim from UIF), each toggleable to paid as a company benefit; policy cards reflect the company's actual config.
- Leave requests with a day-picker (half-days, non-contiguous dates), business-day/public-holiday awareness, and balance/negative-balance checks.
- Multi-reviewer approval routing; manager approve/reject (never own); cancellation.
- Leave calendar, balances table, and per-employee leave history.
- Custom public holidays; birthday calendar.
- **Leave encashment** mid-employment (pay out unused annual leave to the open run; balance reduced).

## Payroll
- SA PAYE engine: per-period pay by **frequency** (monthly / fortnightly / weekly — `annualGross ÷ divisor`), annualised PAYE with rebates and age thresholds, medical-aid s6A credit, pension/RA under the s11F cap, UIF (with ceiling) and SDL (with the R500k threshold).
- Travel and housing allowances (with logbook inclusion), employer benefits (taxable fringe benefits), medical-aid dependants.
- **Variable pay** per run: overtime (1.5×/2×), Sunday & public-holiday time, night-shift & standby allowances, commission, custom allowances, bonus / 13th cheque / back pay (SARS annual-payment method), and custom deductions. CSV template + import.
- **Recurring components** applied to a run in one click; **retroactive back-pay (arrears)** helper (monthly shortfall × months → back-pay line).
- **Leave encashment** and **unpaid-leave** deductions reflected in pay.
- **Pay groups:** scope a run to a **branch** and/or a **pay frequency**, so weekly and monthly staff run separately.
- Off-cycle runs (bonus/correction) that finalise independently.
- Run lifecycle: schedule → start → approval (optional approver + email) → complete → publish payslips; **explicit lock/unlock** on completed runs; cancel/reverse (blocked when locked or already sent to the bank).
- **Payslip PDFs** (single and bulk ZIP), a payslip studio (branding/logo/layout), and employee self-service payslip download.
- Employee deductions (loans, garnishees) with recovery tracking; recurring deductions.
- **Bank export** for EFT and **Netcash** integration (validation, NIF file, batch submission).
- GL journal export and a payroll register (CSV/Excel).

## SA statutory compliance
- **EMP201** monthly declaration (PAYE/UIF/SDL/ETI) with panel + export.
- **EMP501** year-end reconciliation (declared vs certified) and **IRP5 / IT3(a)** certificates: bulk PDF/ZIP for HR, and **employee self-service** download of their own certificate (access-scoped).
- **ETI** (Employment Tax Incentive) calculation and claim schedule.
- **UIF** declaration export.
- **COIDA Return of Earnings (W.As.8):** per-employee actual vs assessable (capped) earnings, totals, average employed; CSV/Excel export.
- **Employment Equity:** EEA2 workforce profile and EEA4 income differentials as on-screen tables **and a statutory-style PDF** (occupational level × population group × gender + disability); data-completeness prompts.
- **POPIA** support (data-subject handling helpers, legal pages).
- Compliance records, statuses, and a status overview.
- Configurable statutory references (PAYE/UIF/SDL numbers), tax tables, and rates (validated — not to be edited casually).
- *Note:* COIDA and EEA outputs carry a "verify against the current DoL/Compensation Fund form before filing" disclaimer.

## Reports & analytics
- **Payroll** report (YTD gross/net/PAYE/UIF, run history, composition chart).
- **Workforce** report (headcount, department cost, budget utilisation, headcount & employment-mix charts).
- **Leave** report (utilisation by type).
- **Equity** report (EEA2/EEA4 tables + PDF export).
- **Reminders** tab: documents & qualifications expiring within 90 days **plus probation reviews due**.
- **Structure** tab: organisation chart.
- A **branch filter** scopes the workforce/leave/payroll reports.
- Every report exports to **CSV and Excel (.xlsx)**.
- Role dashboards (HR, manager, employee, exco) with stats, upcoming payroll, activity feed, announcements.

## Settings & administration
- Company profile (legal details, registration, VAT/PAYE/UIF/SDL, banking details).
- Employee-number configuration (prefix/sequence); custom-field definitions.
- Departments, **branches**, **job-position catalogue** (with grades), **cost-centre catalogue**.
- Payroll configuration (frequency, pay day, references, defaults), tax/UIF/SDL rates, benefits offered, Netcash keys.
- Leave policies (days, accrual, carryover, sick-note, family-leave paid toggles).
- Payslip studio (branding/logo/alignment), notification preferences, appearance (theme), user management, audit log.
- Company announcements (published to self-service).
- Billing & plans (Paystack): plan selection, trial, subscription management.

## Platform, security & UX
- Consistent **calendar date pickers** app-wide (month/year dropdowns for far-past dates like DOB, future-blocking where appropriate), modelled on the leave picker.
- Reusable CSV/Excel export control; PDF generation client-side.
- Command menu, support hub, notifications menu.
- Sentry error monitoring; additive/idempotent database migrations.
- 438 unit tests (payroll engine, ETI, GL, register, leave accrual, business days, SA-ID parsing, equity forms, COIDA, tenant isolation, multi-company, pay-frequency eligibility, and more).

---

## Not yet in this state (operational / infrastructure / advanced)
- **MFA enforcement** (requiring 2FA for HR/exco) — a Supabase Auth console setting; per-user enrolment is shipped.
- **Weekly payroll auto-scheduler** — frequency pay-groups are supported; HR creates each weekly run (auto-cadence is a future enhancement).
- **Netcash key rotation / live billing credentials** — operational actions.
- **SSO, public API, granular permission matrix** — advanced-enterprise scope beyond the current feature set.
