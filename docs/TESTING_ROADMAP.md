# NovaHR Testing Roadmap

A complete plan for verifying that NovaHR works as it should, from unit tests through
manual acceptance to production monitoring. Use this before every release; use the full
pass before onboarding a new paying customer.

Status legend: [x] automated and passing today, [ ] manual or still to automate.

---

## 1. Automated coverage today

`npm test` runs 24 Vitest files / 233 tests. What they cover:

| Area | Files | What is verified |
| --- | --- | --- |
| Payroll calculator | `src/lib/payroll/calculator.test.ts` | 2026/27 PAYE brackets, rebates, UIF cap, SDL, pension s11F cap, travel allowance inclusion, unpaid leave pro rata |
| Payroll actions | `src/lib/payroll/actions.test.ts` | run completion, payslip creation, next-run scheduling, terminated-employee exclusion |
| Leave actions | `src/lib/leave/actions.test.ts` | request creation wording, working-day validation, approval/rejection, balance upsert, decision notes |
| Working days | `src/lib/leave/business-days.test.ts` | weekends, SA public holidays incl. Sunday observance, range counting |
| Leave config | `src/lib/config/leave.test.ts` | all 9 types defined, BCEA minimums met, UIF-funded types unpaid |
| Workspace scoping | `src/lib/workspace/actions.test.ts` | HR full access; employee/manager sanitization of salaries, banking, IDs; payslip and leave filtering |
| Employees | `src/lib/employees/actions.test.ts`, `factory.test.ts` | creation, employee numbers, default balances, onboarding toggling |
| Tenant/settings | `src/lib/tenant/actions.test.ts` | profile and payroll settings updates |
| Notifications | `src/lib/notifications/actions.test.ts` | read/all-read |
| Mappers/fixtures | `src/lib/workspace/mappers.test.ts` | DB row to app type mapping, DOB from SA ID number |
| Marketing | `src/lib/marketing/pricing.test.ts` | tier pricing and suggestion logic |
| Misc | `format`, `schemas/sa`, `store/app-provider`, demo suites | formatting, SA ID validation, reducer behavior |

CI (`.github/workflows/ci.yml`) runs lint, `tsc --noEmit`, and the full suite on every
push and PR.

## 2. Automated tests to add next (priority order)

1. [ ] **Authorization unit tests for `require.ts`**: role rejection paths (employee calling
   HR-only actions throws; manager deciding own leave throws; tenant mismatch throws).
   Today these paths are enforced but only exercised manually.
2. [ ] **Invite flow tests**: token hashing, expiry, revocation, duplicate email rejection,
   accepted-invite user creation (mock Supabase admin client).
3. [ ] **MATC in payroll runs**: a payroll action test asserting an employee with medical aid
   and N dependants gets the s6A credit applied to PAYE.
4. [ ] **Trial gating**: `isTrialExpired`/`daysLeftInTrial` edge cases (already covered) plus
   a component test that TrialGate locks when expired.
5. [ ] **Departments actions**: duplicate-name rejection, delete-with-reassignment.
6. [ ] **E2E smoke suite (Playwright)**: the five golden journeys below, run against a
   staging deployment on every release. This is the single highest-value addition.

## 3. Golden journeys (manual today, Playwright targets)

Run these end-to-end on staging before any release. Each is a sellable-demo path.

### Journey A: New customer signup
- [ ] Sign up at `/signup` with a fresh email; land on empty dashboard with Getting Started card
- [ ] Trial banner logic: `trialEndsAt` set 14 days out (verify in DB)
- [ ] Create 2 departments in Settings > Departments
- [ ] Add an employee via the onboarding wizard (all 4 steps, review, save)
- [ ] Employee appears in directory with correct employee number prefix

### Journey B: Team invitations
- [ ] Invite a manager from Settings > Users; email received (or copy link when Resend not set)
- [ ] Accept invite: set password, land on dashboard in manager role
- [ ] Manager sees only their team; salaries of non-reports are hidden
- [ ] Revoke a pending invite; the link stops working
- [ ] Expired invite link (or reused link) shows the friendly error page

### Journey C: Leave lifecycle
- [ ] Employee submits annual leave over a weekend and public holiday; day count excludes them
- [ ] Weekend-only range is rejected with a clear message
- [ ] Maternity/parental/adoption types selectable with correct descriptions
- [ ] HR approves; balance decrements; employee gets email; activity feed updates
- [ ] Manager cannot approve their own request
- [ ] Public holidays tab lists the correct calendar for the year

### Journey D: Payroll run
- [ ] HR starts and completes the scheduled run
- [ ] Payslip PAYE matches SARS 2026/27 tables (spot-check one salary against TaxTim)
- [ ] Medical aid employee gets MATC credit (compare with/without dependants)
- [ ] UIF capped at R177.12 for high earners; SDL only when payroll >= R500k
- [ ] Payslip PDF renders with company branding; employee receives email
- [ ] Bank export CSV and Netcash NIF download with correct net pay totals
- [ ] Next month's run is auto-scheduled; compliance records generated (PAYE/UIF/SDL)

### Journey E: Security probes (attempt-to-break)
- [ ] Signed-out fetch of `/dashboard` redirects to login (curl, no cookie)
- [ ] Employee-role session calling an HR server action gets "Not authorized" (devtools)
- [ ] Workspace payload for employee role contains no colleague salary/bank/ID data
  (inspect network response)
- [ ] Tenant A user passing tenant B's id to a compliance action is rejected
- [ ] Invite token guessing: random token shows invalid-invite page

## 4. Per-page manual checklist

For each role (HR, manager, employee, exco) visit every page and confirm: no console
errors, loading states render, empty states render, mobile layout at 375px works, dark
mode legible.

- [ ] Landing page, pricing, terms, privacy (logged out)
- [ ] Login, signup, forgot/reset password, accept-invite
- [ ] Dashboard (all four role variants)
- [ ] Employees list, profile (all tabs), new-employee wizard
- [ ] Leave (requests, balances, policies, public holidays tabs)
- [ ] Payroll list and run detail, payslip dialog and PDF
- [ ] Reports (workforce, leave, payroll)
- [ ] Compliance, Deductions (plan-gated: verify lock on `hr` plan)
- [ ] Tenants, Billing, Settings (all seven tabs)

## 5. Data and migration verification

- [ ] `npx prisma migrate deploy` on a copy of production data completes cleanly
- [ ] Backfill migration created balance rows for all pre-existing employees (9 types each)
- [ ] Legacy sick balances raised to 30; `used` values preserved
- [ ] Seed script still idempotent on a fresh database (`npx prisma db seed` twice)
- [ ] RLS spot check in Supabase SQL editor: `set_config('app.tenant_id', '<tenantA>', true)`
  then `SELECT count(*) FROM "Employee"` returns only tenant A rows

## 6. Non-functional checks

- [ ] Lighthouse on landing page and dashboard: performance > 85, accessibility > 95
- [ ] First load JS stays near current baseline (dashboard ~405 kB); investigate any jump > 10%
- [ ] Email deliverability: leave request, decision, payslip, invite all arrive (not spam)
  from the verified Resend domain
- [ ] Vercel logs clean after a full journey pass (no unhandled errors)
- [ ] Security headers present in production responses (`curl -I`)

## 7. Release gate

A release ships when:
1. CI green (lint, types, 233+ tests).
2. Journeys A-E pass on staging.
3. Migration verification (section 5) done for any release containing a migration.
4. No open severity-1 bug.

## 8. Statutory data review calendar

Payroll data is legislation-bound; schedule these checks:

| When | What |
| --- | --- |
| Every March (post-Budget) | PAYE brackets, rebates, MATC, s11F cap in `calculator.ts`; update `TAX_BRACKETS_*` and tax-year label |
| When gazetted | UIF earnings ceiling (currently R17,712/month) |
| Every December | Next year's public holidays in `business-days.ts` (watch for once-off holidays) |
| October 2028 deadline | Parliament's BCEA amendment after Van Wyk; update leave types and descriptions |
