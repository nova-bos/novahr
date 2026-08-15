# NovaHR Independent Audit and Action Items

Date: 2026-08-06
Scope: fresh, independent review of the code and the launch UAT, not based on the existing `HR_FEATURE_COMPLETENESS_AUDIT.md` or `PRE_LAUNCH_AUDIT_V4.md`.
Method: read the payroll engine, tenant isolation, auth guards, encryption layer and the launch UAT; ran the test suite, the tenant isolation checker, the type checker and the linter.

## Headline

The build is in good shape and the engineering discipline is real, not cosmetic. 438 unit tests pass, the type checker is clean, and the tenant isolation checker passes. The core tax engine is careful and well sourced. The findings below are mostly correctness edges (age rebate timing, unpaid leave proration for non-monthly staff, mid-month proration, negative net) rather than structural problems. None of them block a limited beta, but 1 and 2 should be fixed before anyone runs weekly or older employees through real payroll.

## What is good

1. Verification signals are green.
   - `npx vitest run`: 55 files, 438 tests pass in about 3s.
   - `npx tsc --noEmit`: clean.
   - `node scripts/check-tenant-isolation.mjs`: all scoped prisma calls include a tenantId.

2. The tax engine is careful and sourced.
   - `src/lib/payroll/calculator.ts` cites the 2026/27 Budget and SARS, and asserts the R99,000 under-65 threshold as a tripwire test. Brackets, rebates, MATC and the s11F pension caps are all present and use decimal.js with ROUND_HALF_UP, so no float drift.
   - Annual-payment (bonus, 13th cheque, back pay) is taxed with the correct SARS non-recurring delta method, not naive annualisation.
   - There is a golden-master reconciliation test against a real payslip.

3. Tenant isolation is defence in depth by convention.
   - The DB role carries BYPASSRLS, and this is documented honestly in `src/lib/db-context.ts`: the real protection is an explicit `where: { tenantId }` on every query, enforced by a CI checker (`scripts/check-tenant-isolation.mjs`).
   - Auth guards in `src/lib/auth/require.ts` are clean: `requireUser`, `requireRole`, `requireTenant`, `requireEmployeeScope` and `requireActiveSubscription`. tenantId is always taken from the session, never trusted from the client.

4. PII encryption is transparent and robust.
   - `src/lib/prisma.ts` encrypts idNumber, taxNumber, bankAccountNumber and passportNumber on write and deep-decrypts across nested includes, so ciphertext never leaks into bank files or SARS submissions. Decryption is plaintext-tolerant, so it is safe to deploy before backfill.

5. Subscription gating is fail-closed.
   - `requireActiveSubscription` handles trial, active, canceled, expired and past_due with a bounded 3-day grace window, and fails closed on a null period end.

## What is bad or needs attention

Severity key: P1 launch blocker for the affected feature, P2 fix soon, P3 polish.

### 1. (P1) Age for tax rebates is computed as at today, not the pay period
`getAgeInYears` in `calculator.ts` uses `new Date()`. Rebates should be based on age in the tax year being processed (SARS uses age as at the last day of the year of assessment). Two consequences:
- An employee who is 64 today but was 65 during an older period gets the wrong rebate on a re-run.
- Re-generating a historical payslip after a birthday silently changes PAYE, which breaks idempotency and reconciliation.
The codebase already knows the right pattern: `eti.ts` measures age at the last day of the month being processed. Fix: pass the period (or period-end date) into the calculator and compute age against it. UAT cases 18.1, 18.3, 22.2 target this directly.

### 2. (P1 for weekly/biweekly) Unpaid leave proration always divides by 21 days regardless of frequency
In `calculator.ts` the unpaid deduction is `basicSalary * unpaidLeaveDays / workingDaysInMonth`, with `workingDaysInMonth` defaulting to 21. But `src/lib/payroll/actions.ts` (line ~259) passes `unpaidLeaveDays` and never passes `workingDaysInMonth`, so it is always 21. For a weekly employee, `basicSalary` is one week of pay, so dividing by 21 makes one unpaid day about a third of the true daily rate. Monthly staff are roughly fine; weekly and biweekly are materially wrong. Fix: derive the divisor from the frequency (about 5 days for weekly, about 10 for biweekly) or compute actual working days in the period, and pass it through. UAT case 20.1 targets this.

### 3. (P2) No first-month proration for mid-month hires
Payroll eligibility is `status !== terminated && startDate <= payDate` (`actions.ts` ~155). An employee who starts on the 15th is paid a full month. If a full first month is intended policy, that is fine, but it should be a deliberate, documented choice, not an accident. UAT case 20.2 targets this.

### 4. (P2) No guard against negative net pay
`netPay = grossPay - totalDeductions` with no floor. A post-tax deduction (or garnishee) larger than net produces a negative payslip and potentially a negative EFT line. Add a validation that blocks or flags a negative net before finalisation. UAT case 21.5 targets this.

### 5. (P2) Tenant isolation checker has two known blind spots
`scripts/check-tenant-isolation.mjs` is good but:
- It excludes `findUnique`/`findUniqueOrThrow` (assumes global PKs). Several `tx.employee.findUniqueOrThrow({ where: { id } })` calls inside `runAsTenant` rely entirely on the preceding `requireEmployeeScope` guard for tenant safety, because BYPASSRLS means the query itself is not scoped. This is currently correct, but one missing guard on a future call becomes a cross-tenant read with no CI signal.
- It only checks that `tenantId` appears somewhere in the argument block, not that it is in the `where`. An `update`/`delete` with tenantId in `data` but an unscoped `where` would pass the check yet be unsafe.
Neither is an active vulnerability found in this pass, but both are worth hardening: prefer `findFirst({ where: { id, tenantId } })` over `findUnique({ where: { id } })`, and tighten the checker to inspect the `where` clause for mutating ops.

### 6. (P3) `workingDaysInMonth` is a hardcoded 21
Even for monthly staff, real months vary (roughly 20 to 23 working days). Unpaid-leave proration and any day-rate maths inherit this approximation. Consider computing actual business days in the period (the leave module already has `workingDaysBetween`).

### 7. (P3) Operational items still open (from memory and configs)
- Netcash keys should be rotated before real customer payroll (noted previously).
- MFA enforcement is a Supabase setting, not enforced in-app.
- Weekly auto-scheduler for runs is not yet automated.
These are infra/ops, not code defects, but they belong on the launch runbook.

## UAT review: does the launch UAT cover all bases?

The existing `docs/launch-uat.html` was already strong: 3 companies, 18 phases, roughly 96 cases, an interactive checklist with bug logging and sign-off, and it does include security, RBAC, POPIA, UI-quality and a basic regression sweep. It was, however, almost entirely happy-path on the numbers: no employee exercised the age rebates, the top bracket, the sub-threshold zero-PAYE case, the UIF ceiling boundary, weekly unpaid leave, or negative net. There were no destructive or concurrency cases and no idempotency regression.

### What I added
Two deliberately strange small companies and five new phases (now 25 phases, 141 cases, up from ~96):
- Company D, Sizwe Holdings: a one-person company (sole employee is also the only HR admin), founder aged 66. Tests the smallest possible tenant and the 65+ rebate with an exact expected PAYE of R6 251.00.
- Company E, Edge Case Traders: six boundary employees. Age 77 (tertiary rebate, PAYE R5 980.25), top bracket R2m (PAYE R58 595.75), sub-threshold R84k (PAYE R0.00), exactly on the UIF ceiling (UIF R177.12), a weekly employee for the unpaid-leave bug, and one employee rigged to force negative net.
- P18 Payroll tax boundaries: rebates by age, period-vs-today age, top bracket, zero PAYE, UIF ceiling, travel logbook 20 vs 80%, s11F cap, taxable fringe benefit, MATC by dependant count.
- P19 Weird company shapes: one-person tenant, solo approval chain, mixed pay bases, no-SA-ID foreign national, ETI age-out at 30, R0/R1 salaries.
- P20 Unpaid leave and calendar edges: weekly unpaid day (the /21 bug), mid-month hire proration, unpaid spanning weekend/holiday, leave across the tax-year boundary, carryover cap on rollover, negative balance on encashment, sick 3-year cycle and 4-month maternity.
- P21 Destructive, negative and integrity: delete a populated department/branch, terminate a manager with reports, duplicate ID/employee number on import, EFT export with missing bank details, negative net, concurrent edits to one run, demoting an approver mid-approval, long/unicode/RTL input.
- P22 Regression and idempotency: run the same period twice, historical payslip stability, edit-then-recompute immutability of completed runs, double-click recurring components, A/B/C unchanged by D/E, YTD excludes reversed runs.

All new SA ID numbers are Luhn-valid and date-correct. Expected PAYE and UIF figures are pre-computed so testers get pass/fail numbers, not vibes. The localStorage key was bumped to v4 so counts reflect the new totals.

## Consolidated action items

Code fixes (in priority order):
- [x] AI-1 (P1) DONE. Rebate age is now measured against the pay period, not `new Date()`. Added `asOfDate` to `PayrollOptions`; `buildPayslip` defaults it to the period end (last day of the "YYYY-MM" period). Projection callers that omit it still fall back to today. Regression tests lock the behaviour (May vs July run across a 65th birthday). (`calculator.ts`)
- [x] AI-2 (P1) DONE. Unpaid-leave proration is now frequency-correct: the calculator derives working days per period (weekly 5, fortnightly 10, monthly ~21.67) or uses an explicit `workingDaysInPeriod`. A weekly unpaid day is now R600 on a R3,000 week, not R142.86. Test added. (`calculator.ts`, `actions.ts`)
- [ ] AI-3 (P2) LEFT FOR YOU. First-month proration for mid-month hires is a business-policy decision (full month vs pro-rata), so it is intentionally not changed. Decide the policy, then implement. (`actions.ts`)
- [x] AI-4 (P2) DONE. `completePayrollRunRecord` now blocks the run if any payslip net pay is below zero after all deductions, naming the affected employees, before any payslip or EFT line is written. Test added. (`actions.ts`)
- [x] AI-5 (P2) DONE. The isolation checker now requires `tenantId` inside the WHERE clause for mutating ops (update/updateMany/delete/deleteMany), closing the "tenantId only in data" gap. Verified it flags a synthetic bad case. (`scripts/check-tenant-isolation.mjs`) Note: findUnique on scoped models is still not enforced (those rely on preceding guards); prefer `findFirst({ where: { id, tenantId } })` in new code.
- [x] AI-6 (P3) DONE. Monthly unpaid-leave proration now uses the actual business days in the period (via `workingDaysBetween`) passed from `actions.ts`, instead of a hardcoded 21. (`calculator.ts`, `actions.ts`)

Verification after these fixes: 443 unit tests pass (5 new), `tsc --noEmit` clean, isolation checker clean, eslint clean.

Operational (runbook, not code):
- [ ] AI-7 Rotate Netcash keys before real customer payroll.
- [ ] AI-8 Confirm MFA enforcement policy in Supabase.
- [ ] AI-9 Wire the weekly auto-scheduler or document the manual process.

UAT (done in this pass):
- [x] AI-10 Added Companies D and E with valid edge-case test data and expected figures.
- [x] AI-11 Added phases P18 to P22 (boundaries, weird shapes, unpaid/calendar, destructive/negative, regression/idempotency).
- [x] AI-12 Bumped the UAT localStorage key to v4.

Re-test after AI-1 and AI-2: cases 18.1, 18.3, 20.1, 22.2 should flip from fail to pass.
