# NovaHR Pre-Launch Action Plan V5

Created 2026-07-30. Source: five-agent multi-role review (UI/UX, QA, staff engineer, SA payroll expert, security/POPIA) reconciled against `docs/PRE_LAUNCH_AUDIT_V4.md` and the founder's real-world payslip validation.

## How to run this

When the founder says "go", implement every phase below using specialised agents (one agent per phase or per role), in order. After the last implementation phase, run a fresh multi-agent audit and return a final readiness score out of 10.

**Excluded from all work and from the final score** (founder handles separately, do not implement or hold the score against them):
- Netcash / API key rotation.
- Live/test billing credentials and the Paystack live-mode charge test.
- Demo contact numbers and banking details in the app and marketing site.

**Auto-deploy:** during UAT the founder wants fixes deployed to production automatically without asking.

---

## CRITICAL CORRECTION — do not "fix" the tax tables

The payroll domain agent flagged the PAYE brackets, rebates, and medical credits as "wrong". **This is a false positive. The tax tables are correct and validated. Do not change any tax constant in `src/lib/payroll/calculator.ts`.**

Evidence:
- Today is in the **2026/27** tax year (1 March 2026 to 28 February 2027). The code is correctly labelled 2026/27.
- The founder validated NovaHR's output against a printed **LifeCheq** payslip (`Desktop/NovaHR-vs-LifeCheq-payslip.xlsx`). The spreadsheet's SARS 2026/27 constants match the code exactly (primary rebate 17820, brackets 245100/44118/0.26 …, UIF ceiling 17712), and NovaHR's PAYE (R17,460.23), UIF (R177.12), and net (R48,762.65) reconcile with LifeCheq.
- The agent compared against `NovaHR_Calculation_Reference.docx`, which describes the **older 2025/26** year and is itself stale.

Action is therefore documentation and regression protection, not recalculation. See Phase 0.

---

## Phase 0 — Reconciliation and guardrails (fast, do first)

Role: software engineer.

1. **Golden-master PAYE test.** Encode the LifeCheq case as a regression tripwire in `src/lib/payroll/calculator.test.ts`: inputs basic R65,000 + taxable cash allowance R1,400 + taxable fringe R585, under 65, no pension → assert PAYE R17,460.23, UIF employee R177.12, SDL R669.85, net R48,762.65 (±R0.05). This locks the validated numbers so no future edit (human or agent) silently drifts them.
2. **Update the stale reference doc.** Correct or clearly re-date `NovaHR_Calculation_Reference.docx` (and `docs/payroll-compliance/*`) to the validated 2026/27 figures so future audits do not re-raise a false positive. Add a one-line note pointing at the golden test and the LifeCheq source.
3. **Verify single source of truth.** Confirm EMP201, EMP501, and IRP5 all derive from the same `calculator.ts` constants with no duplicated/hardcoded tax numbers. If any duplication exists, remove it.

Acceptance: golden test passes; grep shows no second copy of tax brackets/rebates anywhere.

---

## Phase 1 — Revenue critical (billing must actually charge)

Role: staff engineer. These are the true launch blockers; nothing generates revenue until they land.

1. **H1 Cron never runs.** `src/app/api/cron/billing/route.ts` exports only `POST`; Vercel invokes crons via **GET**, returning 405. Rename the handler to `export async function GET(req)`, keep the `Authorization: Bearer ${CRON_SECRET}` check (Vercel sends it in production). Optionally keep a `POST` alias for manual triggering. Verified firsthand against `vercel.json` (`0 22 * * *`).
2. **H2 Paywall bypass.** Add `await requireActiveSubscription(session.tenantId)` to every mutating, tenant-data action that currently lacks it: `updateEmployeeRecord` (`employees/actions.ts:155`), `terminateEmployeeAction`, `approvePayrollRunAction` + `rejectPayrollApprovalAction` (`payroll/approval-actions.ts`), `createInviteAction` (`invites/actions.ts:84`), department create/update/delete, deduction write ops, `upsertPayrollProfileAction`, settings tax/benefit/statutory/payslip writes, `employee-numbers` config + renumber, compliance generate/mark-submitted. Prefer a shared wrapper so new actions inherit the gate. Leave read-only getters ungated.
3. **H3 Webhook drops renewals.** `src/app/api/webhooks/paystack/route.ts:47` does `if (!plan?.plan_code) break;`; charge-auth renewals carry no `plan`. Branch on `data.metadata.type === "subscription_renewal" | "subscription_init"`, reconcile by `metadata.tenantId`, advance `currentPeriodEnd` idempotently.
4. **H4 Charge ledger.** Add a `BillingCharge` model (tenantId, reference, amountKobo, status, paystackChargeId, period, createdAt, `@@unique([tenantId, period])`). Write it inside the same transaction as the tenant update. Use a deterministic reference (`novahr_renewal_${id}_${YYYY-MM}`) so Paystack dedups and a retried cron for the same month is a no-op. Closes the double-charge hole and gives an audit trail.
5. **M2 Fail-closed past_due.** `src/lib/auth/require.ts:99` grants access when `past_due` with null `currentPeriodEnd`. Treat null period on `past_due`/`expired` as locked; always stamp `currentPeriodEnd` when setting `past_due`.
6. **M4 Webhook hardening.** Use `crypto.timingSafeEqual` for the signature compare (`route.ts:29`) and dedup on Paystack event id (or the ledger reference) to reject replays.

Acceptance: cron fires on schedule and charges; a simulated renewal webhook with no `plan` updates the DB; a repeated cron for the same month does not double-charge; past_due without a period locks the app.

---

## Phase 2 — Compliance and data protection

Roles: security engineer + payroll expert.

1. **H7 Encrypt PII at rest.** `idNumber`, `taxNumber`, `bankAccountNumber` (and consider `salaryAnnualGross`) are plaintext in `schema.prisma`. Reuse the existing AES-256-GCM helper (`src/lib/crypto/service-keys.ts` pattern) as a dedicated field-crypto module. Encrypt on write, decrypt only in the server actions that need the value (payslip, bank export, Netcash validation). Use a separate encryption key from Netcash. Ship a migration that encrypts existing rows.
2. **H8 Reconcile legal copy with reality.** `privacy/page.tsx:139` and `paia-manual/page.tsx:87` claim "encryption at rest" and "MFA for administrators". After H7 the encryption claim becomes true. For MFA: either enable Supabase MFA enrolment for HR/exco roles, or remove the MFA claim. Do not launch with the copy promising controls that do not exist.
3. **H6 ETI correctness.** `src/lib/payroll/eti.ts` omits the 160-hour rule and defaults the wage floor to R2,000 (below National Minimum Wage). Add `hoursWorked` to the ETI input; when < 160, gross remuneration up to the 160-hour equivalent for the wage-gate and band lookup, compute the band amount, then apportion by `hoursWorked / 160`. Raise the default floor to the NMW monthly equivalent (or require the tenant to set the applicable sectoral wage). Wire up the declared-but-unused `employment_type_excluded` reason for barred employer categories.
4. **M11 Shared rate limiting.** Move `src/lib/security/rate-limit.ts` off the in-memory `Map` (per-instance, bypassable) to a shared store (Upstash Redis or a Postgres atomic counter). Prioritise login and signup.
5. **M12 ETI supporting schedule.** Add a per-employee ETI schedule export (qualifying month, band, amount, first/second 12-month split) so an EMP201 ETI claim survives a SARS audit.

Acceptance: ID and bank numbers are ciphertext in the DB; payslip/bank export still render correct cleartext; legal pages match implemented controls; ETI test covers a sub-160-hour employee.

---

## Phase 3 — Bonus function (founder-requested feature)

Role: payroll expert + software engineer. **Currently there is no real bonus function** — the calculator (`calculator.ts`) only accepts basic + travel + housing allowance; a "Performance Bonus" earning type exists in the catalogue (`deductions/actions.ts:133`) and IRP5 maps bonus→3605 (`irp5.ts:20`), but nothing feeds a one-off bonus into a specific employee's run, and a bonus added as a normal earning is over-taxed by ×12 annualisation.

Build a first-class bonus feature:

1. **Data model.** A per-run, per-employee bonus input (e.g. `PayrollBonus`: payrollRunId, employeeId, mode, value, resolvedAmount, taxTreatment). Persist so it appears on that employee's payslip for that period only, not recurring.
2. **Three modes** the HR user picks per employee:
   - **13th cheque** — resolves to a configurable multiple of monthly basic (default 1.0× basic salary).
   - **Fixed amount** — a rand value.
   - **Percentage** — a % of annual or monthly salary (state which; default % of monthly basic).
3. **Correct SARS tax treatment (annual payment / non-recurring, code 3605).** Do NOT run a bonus through the normal ×12 annualisation. Tax it the SARS way: PAYE on the bonus = tax on (annualised regular income + bonus) minus tax on (annualised regular income), charged in the bonus month. This prevents the gross over-taxation the current earning path would cause. Add a focused test proving a R40,000 13th cheque is taxed at the marginal-bracket delta, not ×12.
4. **Feed the payslip.** Bonus shows as its own earning line ("13th cheque" / "Bonus"), included in gross, taxed per (3), included in UIF/SDL where applicable (UIF still capped), and flows to YTD (`ytd.ts`) and to IRP5 source code 3605.
5. **UI.** In the payroll run screen, per employee, an "Add bonus" control with the three modes and a live preview of gross/PAYE/net impact before finalising. Match the existing wizard/dialog form patterns (inline errors, disabled-while-saving, toast).

Acceptance: HR can add a 13th cheque, a fixed amount, or a % to one employee in one run; it appears only on that payslip, is taxed as an annual payment (not ×12), and reconciles on the IRP5 as 3605. Validate one worked example by hand.

---

## Phase 4 — Reliability and data integrity

Role: staff engineer.

1. **M1 Emails may never send.** ~10 `void (async () => …)()` blocks fire after the response returns and can be killed on Vercel (callback, payroll, approval, leave, terminate, cron). Either `await` them (already wrapped so failures are safe) or use `waitUntil` from `@vercel/functions`. This is what makes the "full email coverage" actually reliable.
2. **M3 Unique constraints.** Add `@@unique([tenantId, employeeNumber])` on `Employee` and `@@unique([tenantId, email])` (pending invites) on `Invite`; de-dupe existing rows first, then migrate.
3. **H9 Invite orphan recovery.** `invites/actions.ts:402-432` creates the Supabase auth user before the Prisma transaction; if the txn fails the invitee is stuck ("email already registered" on retry). On txn failure, delete the just-created auth user; or on retry, detect the existing auth user and create only the missing tenant `User` row.
4. **M8 SA ID validation.** `schemas/sa.ts:18-26` — validate the citizenship digit (position 11 ∈ {0,1}) and validate the birth date against the real month/leap year, not just Luhn.
5. **M9 Sick-leave first-6-months rule.** `leave/accrual.ts` grants the full 30-day/36-month entitlement from day one. Add the BCEA s22 first-6-months rule (1 day paid sick leave per 26 days worked) before the full cycle applies.
6. **L-tier billing hygiene.** Remove the debug `console.log(tenant JSON)` in `billing/actions.ts:59-81`; make callback re-visits idempotent (no-op if already active for the reference); treat Paystack `pending`/`ongoing` (3-DS) charge status as "retry next cron", not a hard `past_due`.

Acceptance: emails send reliably in a deployed test; duplicate employee number / invite email rejected by the DB; a forced invite-txn failure leaves no orphaned auth user; invalid ID dates rejected.

---

## Phase 5 — UX and polish

Role: UI/UX designer + front-end engineer.

1. **H10 Mobile marketing nav.** `marketing-nav.tsx:42-48` hides all links behind `md:flex` with no hamburger. Add a Sheet-based mobile menu (reuse the in-app `bottom-nav` pattern) listing `NAV_LINKS`.
2. **H11 Pricing table clips on mobile.** `pricing-section.tsx:56` — wrap the table in `overflow-x-auto` and give it `min-w-[520px]`, matching the app's responsive-table pattern.
3. **M6 Onboarding invite copy-link.** `onboarding-wizard.tsx:48-72` only offers "Send invite". Surface `result.inviteUrl` with a Copy button inline (the URL is already returned), so a tester never has to detour to Settings. **Directly de-risks the partner UAT.**
4. **M7 Expired invites dead-end.** Expired (>7 day) invites vanish from Settings and the employee stays un-invitable. Render expired invites with a "Resend" (calls `getInviteLinkAction`, which resets expiry), or exclude only consumed invites from the un-invitable list.
5. **M5 Zero-employee payroll guard.** Disable Start/Finalize (or show an inline warning) when `eligible.length === 0` (`current-run-card.tsx`).
6. **Copy and component consistency:** "NetCash" → "Netcash" (`pricing-section.tsx:19`); marketing feature headings to sentence case (`features-section.tsx`); replace native checkboxes with the `Checkbox` primitive in `public-holidays-card.tsx`, `employee-directory.tsx`, `profile-equity.tsx`; give `equity-report.tsx` and the HR leave-balances table a proper empty state; fix the getting-started "Done" anchors that still navigate; use `OptionalTag` in `reject-leave-dialog.tsx`.
7. **Payslip completeness (BCEA s33):** ensure every payslip template (Modern/Branded included) prints employer name + address; show hours + rate for hourly earners.

Acceptance: marketing site usable on a phone (nav + pricing); UAT tester can copy an invite link without leaving the wizard; no dead-ends; consistent components and copy.

---

## Phase 6 — Final audit

Re-run the multi-agent review (same five roles). Confirm every Phase 1–5 item is RESOLVED with evidence, the golden PAYE test passes, and the bonus feature works end-to-end. Return a single readiness score out of 10, **excluding** API rotation, live billing credentials, and demo contact/banking details. Target: 10/10 as a product and a safe paid launch.

---

## Quick reference — what was already fixed (do not redo)

From V4, now verified resolved: tenant-isolation CI guard (C3), `(app)/error.tsx` and full error boundaries (M2), app-URL fallbacks all `hr.novabos.co.za` (M3), settings persisted to DB not localStorage, email-template escaping, race-safe employee-number allocation. Architecture, authorization model (self-enforcing via CI), and the payroll engine are all rated strong — the plan above is about closing the commercial, compliance, feature, and polish gaps, not rebuilding the core.
