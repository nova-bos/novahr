# NovaHR Testing Roadmap

A complete plan for verifying that NovaHR works as it should, from unit tests through manual acceptance to production monitoring. Use this before every release; use the full pass before onboarding a new paying customer.

Status legend: [x] automated and passing today, [ ] manual or still to automate.

---

## 1. Automated coverage today

`npm test` runs 27 Vitest files / 254 tests. What they cover:

| Area | Files | What is verified |
| --- | --- | --- |
| Payroll calculator | `src/lib/payroll/calculator.test.ts` | 2026/27 PAYE brackets, rebates, UIF cap, SDL, pension s11F cap, travel allowance inclusion, unpaid leave pro rata, R99,000 threshold tripwire |
| Payroll actions | `src/lib/payroll/actions.test.ts` | Run completion, payslip creation, next-run scheduling, terminated-employee exclusion, tenant-scoped where clauses |
| Leave actions | `src/lib/leave/actions.test.ts` | Request creation wording, working-day validation, approval/rejection, balance upsert, decision notes |
| Working days | `src/lib/leave/business-days.test.ts` | Weekends, SA public holidays incl. Sunday observance, range counting |
| Leave config | `src/lib/config/leave.test.ts` | All 9 types defined, BCEA minimums met, UIF-funded types unpaid |
| Workspace scoping | `src/lib/workspace/actions.test.ts` | HR full access; employee/manager sanitization of salaries, banking, IDs; payslip and leave filtering |
| Employees | `src/lib/employees/actions.test.ts`, `factory.test.ts` | Creation, employee numbers, default balances, onboarding toggling |
| Tenant/settings | `src/lib/tenant/actions.test.ts` | Profile and payroll settings updates |
| Notifications | `src/lib/notifications/actions.test.ts` | Read/all-read |
| Mappers/fixtures | `src/lib/workspace/mappers.test.ts` | DB row to app type mapping, DOB from SA ID number |
| Marketing | `src/lib/marketing/pricing.test.ts` | Tier pricing and suggestion logic |
| Rate limiting | `src/lib/security/rate-limit.test.ts` | Sliding window, per-IP and per-tenant limits, bounded memory, cleanup |
| Bank export idempotency | `src/lib/bank-exports/actions.test.ts` | Ledger state machine (pending claim, duplicate refusal, stale release, cancellation, token persistence) |
| Misc | `format`, `schemas/sa`, `store/app-provider`, demo suites | Formatting, SA ID validation, reducer behaviour |

CI (`.github/workflows/ci.yml`) runs lint, `tsc --noEmit`, and the full suite on every push and PR.

## 2. Automated tests to add next (priority order)

1. [ ] **Cross-tenant isolation tests (high priority):** For every server action that accepts an id, assert that a session from tenant A cannot read or mutate a row belonging to tenant B. Tenant isolation is currently enforced by application-code predicates without an automated invariant suite.
2. [ ] **Authorization matrix tests:** Assert that each role is rejected on actions it should not reach (employee calling an HR-only action throws; manager deciding own leave throws; tenant mismatch throws).
3. [ ] **Invite flow tests:** Token hashing, expiry, revocation, duplicate email rejection, accepted-invite user creation (mock Supabase admin client).
4. [ ] **MATC in payroll runs:** A payroll action test asserting an employee with medical aid and N dependants gets the s6A credit applied to PAYE.
5. [ ] **Trial gating:** `isTrialExpired`/`daysLeftInTrial` edge cases plus a component test that TrialGate locks when expired.
6. [ ] **Departments actions:** Duplicate-name rejection, delete-with-reassignment.
7. [x] **E2E smoke suite (Playwright):** DONE (2026-07-10). `e2e/golden-journeys.spec.ts` automates the five journeys below as one serial chain. Run with `npm run test:e2e` against a local dev server. The suite signs up a disposable tenant through the real UI, runs every journey inside it, and global teardown cascade-deletes the tenant and its auth users, so it is safe against the shared Supabase database. Caveats: the email-confirmation signup path is provisioned via the admin API because Supabase's built-in mailer allows only a few emails per hour (revisit once custom SMTP is configured); each run sends one confirmation email to a `mtshwenewesley+e2e-*@gmail.com` address (filter on `+e2e-` to archive). Playwright artifacts are written to /tmp/novahr-e2e, NEVER into the repo: in-repo writes trigger the Next dev watcher and Fast-Refresh-reload the pages mid-test.

## 3. Golden journeys (automated in e2e/golden-journeys.spec.ts)

Automated coverage of each checklist item is noted inline; unchecked items remain manual. Run these on staging before any release. Each is a sellable-demo path.

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
- [ ] Workspace payload for employee role contains no colleague salary/bank/ID data (inspect network response)
- [ ] Tenant A user passing tenant B's id to a compliance action is rejected
- [ ] Invite token guessing: random token shows invalid-invite page

## 4. Per-page manual checklist

For each role (HR, manager, employee, exco) visit every page and confirm: no console errors, loading states render, empty states render, mobile layout at 375px works, dark mode legible.

- [ ] Landing page, pricing, terms, privacy (logged out)
- [ ] Login, signup, forgot/reset password, accept-invite
- [ ] Dashboard (all four role variants)
- [ ] Employees list, profile (all tabs), new-employee wizard
- [ ] Leave (requests, balances, policies, public holidays, calendar tabs)
- [ ] Payroll list and run detail, payslip dialog and PDF
- [ ] Reports (workforce, leave, payroll)
- [ ] Compliance, Deductions (plan-gated: verify lock on `hr` plan)
- [ ] Tenants, Billing, Settings (all seven tabs)

## 5. Data and migration verification

- [ ] Apply new migrations against a copy of production data; confirm they complete cleanly
- [ ] Seed script still idempotent on a fresh database (`npx prisma db seed` twice)
- [ ] RLS spot check in Supabase SQL editor: `set_config('app.tenant_id', '<tenantA>', true)` then `SELECT count(*) FROM "Employee"` returns only tenant A rows

## 6. Non-functional checks

- [ ] First load JS stays near current baseline (dashboard ~405 kB); investigate any jump > 10%
- [ ] Email deliverability: leave request, decision, payslip, invite all arrive (not spam) from the verified Resend domain
- [ ] Vercel logs clean after a full journey pass (no unhandled errors)
- [ ] Security headers present in production responses (`curl -I`): HSTS, CSP, X-Frame-Options, X-Content-Type-Options

## 7. Release gate

A release ships when:
1. CI green (lint, types, 254+ tests).
2. Journeys A-E pass on staging.
3. Migration verification (section 5) done for any release containing a migration.
4. No open severity-1 bug.

## 8. Statutory data review calendar

Payroll data is legislation-bound; schedule these checks:

| When | What |
| --- | --- |
| Every March (post-Budget) | PAYE brackets, rebates, MATC, s11F cap in `calculator.ts`; update constants and tax-year label |
| When gazetted | UIF earnings ceiling (currently R17,712/month) |
| Every December | Next year's public holidays in `business-days.ts` (watch for once-off holidays) |
| October 2028 deadline | Parliament's BCEA amendment after Van Wyk; update leave types and descriptions |
