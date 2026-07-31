# NovaHR Master Launch Plan

Created 2026-07-30. This is the single execution plan for the 2-week pre-launch build. It absorbs and sequences three prior documents: `PRE_LAUNCH_ACTION_PLAN_V5.md` (billing/security/correctness), `HR_FEATURE_COMPLETENESS_AUDIT.md` (feature gaps), and the founder's new requirements (variable pay, richer employee records, multi-branch/multi-company, gold rebrand). Goal: make NovaHR the strongest SA payroll product, not just launchable.

**Status: PLAN ONLY. Do not implement until the founder says "go".** On "go", implement phases in order with specialised agents, auto-deploy per UAT convention, then run a final multi-agent audit scored out of 10.

**Excluded from work and from the final score:** Netcash/API key rotation, live/test billing credentials, demo contact/banking details.

---

## Non-negotiable engineering principles

These apply to every phase. The existing salaried-payroll path is validated (LifeCheq) and live; protect it.

1. **Additive, backward-compatible schema only.** New columns are nullable or have safe defaults. No column drops, renames, or type changes on existing fields. Every migration is forward-only and tested against a copy of production data.
2. **Do not alter existing behaviour unless required.** New features are opt-in. A tenant that ignores every new feature must behave exactly as today. Where behaviour could change, gate it behind a flag or a per-tenant setting that defaults to current behaviour.
3. **The golden PAYE test is sacred.** Phase 0 locks the validated 2026/27 numbers (LifeCheq case). No payroll change may break it. Tax constants in `calculator.ts` are correct: do not touch them.
4. **Industry-standard patterns.** Model every feature on how SimplePay, Sage VIP, and PaySpace do it (batch payslip inputs, pay components, branch payroll groups, etc.), not a bespoke invention.
5. **Isolation is preserved.** The branch layer is a sub-scope inside a tenant and never replaces `tenantId` filtering. The multi-company layer adds membership without weakening tenant isolation. The CI tenant-isolation guard must still pass.
6. **Tests + migration for every phase.** Each phase ships with unit/integration tests and a reversible-forward migration. Nothing merges red.
7. **CSV round-trip templates wherever data is imported.** Any bulk-data feature must follow one consistent "export-as-template" pattern so users never guess the format: a **Download template** button that exports the tenant's **current data already populated** in the exact columns the uploader expects (plus a header row with clear column names and a short instructions/notes row or accompanying key), the user edits or adds rows, and re-uploads the same file. Upload always runs **validate → preview diff (creates vs updates vs errors) → confirm → apply**, never a silent blind import. This applies to at least: bulk employee create/update, variable-pay/commission/hours batch input, and any future bulk surface. The downloaded file and the accepted upload file are the same shape.

---

## Phase 0 — Foundation and guardrails (fast, first)

Role: staff engineer.

1. **Golden-master PAYE test.** Encode the LifeCheq case in `calculator.test.ts` (basic R65,000 + taxable allowance R1,400 + taxable fringe R585, under 65 → PAYE R17,460.23, UIF R177.12, SDL R669.85, net R48,762.65, ±R0.05). Locks validated numbers before any refactor.
2. **Correct the stale reference doc** (`NovaHR_Calculation_Reference.docx`, `docs/payroll-compliance/*`) to the validated 2026/27 figures; point it at the golden test.
3. **Confirm single source of truth** for tax constants (no duplication in EMP201/EMP501/IRP5).
4. **Schema migration harness check.** Confirm a safe migration workflow against a prod-data clone (shadow DB) so the large additive migrations in later phases are low-risk.

Acceptance: golden test passes; no duplicated tax constants; migration dry-run clean.

---

## Phase 1 — Revenue critical (billing must charge) [from V5]

Role: staff engineer. True launch blockers.

1. **Cron never runs.** `api/cron/billing/route.ts` exports only `POST`; Vercel invokes crons via GET → 405. Rename to `GET`, keep the `Bearer CRON_SECRET` check.
2. **Paywall bypass.** Add `requireActiveSubscription(tenantId)` to the ~10 ungated mutating actions (updateEmployeeRecord, terminate, approve/reject payroll, createInvite, department/deduction/pay-profile/settings/compliance writes, employee-number config/renumber). Prefer a shared wrapper.
3. **Webhook drops renewals.** `webhooks/paystack/route.ts:47` requires `plan.plan_code`; branch on `metadata.type` and reconcile by `tenantId`.
4. **Charge ledger.** Add `BillingCharge` (tenantId, reference, amountKobo, status, paystackChargeId, period, `@@unique([tenantId, period])`); deterministic reference; write in the tenant-update transaction. Closes double-charge + audit-trail gap.
5. **Fail-closed past_due** with null period; **webhook hardening** (`timingSafeEqual`, event-id dedup).

Acceptance: cron fires and charges; renewal webhook with no plan updates DB; repeat cron for same month is a no-op; past_due without period locks.

---

## Phase 2 — Security and statutory correctness [from V5]

Roles: security engineer + payroll expert.

1. **Encrypt PII at rest** (`idNumber`, `taxNumber`, `bankAccountNumber`, consider salary) using the existing AES-256-GCM helper as a field-crypto module; decrypt only where needed; migrate existing rows.
2. **Reconcile legal copy** (`privacy`, `paia-manual`): encryption claim becomes true after (1); for MFA either enable Supabase MFA for HR/exco or remove the claim.
3. **ETI correctness:** add 160-hour gross-up/apportionment and raise the wage floor to the National Minimum Wage; wire the `employment_type_excluded` reason.
4. **Shared rate limiting** (Upstash/Postgres) for login/signup.
5. **Per-employee ETI supporting schedule** export for EMP201 audits.

Acceptance: ID/bank ciphertext in DB, cleartext still renders on payslip/export; legal pages match reality; ETI test covers sub-160-hour case.

---

## Phase 3 — Employee record depth (new requirements)

Role: software engineer + product. **All additive.** New fields nullable; existing employees keep working with them empty.

### 3a. Identity: SA ID / passport selector
- Schema (additive to `Employee`): `idType` enum (`sa_id` | `passport`, default `sa_id`), `passportNumber String?`, `nationality String?`, `dateOfBirth DateTime?`, `gender` enum (`male` | `female` | `other` default null), `maritalStatus` enum (`single` | `married` | `divorced` | `widowed` | `life_partner`)`?`.
- UX (onboarding `step-personal.tsx` + edit dialog): a segmented selector "SA ID number / Passport".
  - **SA ID selected:** show ID number field; auto-derive and display `dateOfBirth` and `gender` read-only from the ID (SA ID encodes both), still stored explicitly. Keep the existing Luhn + date + citizenship-digit validation (V5 M8).
  - **Passport selected:** hide ID field, reveal **date of birth** (date picker, required), **gender** (selector, required), **nationality** (required), passport number.
- `gender` is now a **first-class employee field** independent of employment equity. Prefill `equityGender` from it when EE data is captured, but they are separate concerns.
- Backward compat: existing SA-ID employees default `idType = sa_id`; a one-off backfill derives `dateOfBirth`/`gender` from stored ID numbers.

### 3b. Next of kin + emergency contact
- Schema: `nextOfKinName/Relationship/Phone/Address String?`; `emergencyContactSameAsNextOfKin Boolean @default(false)`. Keep existing `emergencyContact*` fields.
- UX: a "Next of kin" card, then a checkbox **"Next of kin is also the emergency contact"**. When checked, the emergency-contact fields auto-fill from next-of-kin values and hide; when unchecked, they reappear for separate entry. Persist the boolean so the edit view restores state.

### 3c. Qualifications (multi-add with + button)
- Schema: new `EmployeeQualification` model (id, tenantId, employeeId, type e.g. degree/diploma/certificate/licence, name, institution, yearCompleted Int?, expiresAt DateTime?, documentId String? linking an uploaded `EmployeeDocument`). Optional expiry drives reminders (Phase 6/HR).
- UX: a "Qualifications" section with a **+ Add qualification** button that appends a row (repeatable), each removable. Same repeatable-row pattern reused for **skills** (lightweight: `EmployeeSkill` or a `skills String[]`/JSON) and **languages**.

### 3d. Custom fields
- Schema (industry-standard definition + value): `TenantCustomFieldDefinition` (id, tenantId, label, fieldType text/number/date/select, options Json?, appliesTo `employee`, sortOrder, isActive) and `EmployeeCustomFieldValue` (id, tenantId, employeeId, definitionId, value String). Values keyed by definition so labels stay editable.
- UX: HR defines custom fields in Settings; they render as an "Additional information" card on the employee form and profile. Empty by default; zero impact on tenants who define none.

### 3e. Bulk employee upload as a round-trip template (upsert)
Builds on the existing `import-employees-dialog.tsx` and `lib/export/csv.ts`.
- **Download template** exports the **current workforce already populated** in the exact upload columns (employee number, names, ID/passport + type, DOB, gender, marital status, nationality, contact, next of kin, department, branch, job title, start date, salary/wage basis, allowances, banking, etc.), with clear header names and a notes/key row so no column is ambiguous. An empty tenant still downloads a header-only template with one example row.
- **Upsert keyed by employee number:** re-uploading an edited export **updates** existing employees and **creates** new ones; it never duplicates. Rows with no employee number are treated as new (a number is auto-allocated).
- Upload runs validate → **preview diff (creates vs updates vs errors, field-level)** → confirm → apply. Reuse the SA-ID/passport, bank, and phone validators from Phase 3a and the schemas.

Acceptance: a passport-holder can be captured with DOB/gender/nationality; SA-ID capture auto-fills DOB/gender; next-of-kin checkbox mirrors and hides emergency contact; qualifications/skills add and remove multiple rows; a tenant-defined custom field appears and saves; downloading the employee template returns the current workforce in upload-ready format and re-uploading an edited copy updates them (no duplicates) with a create/update preview. Existing employees load unchanged.

---

## Phase 4 — Variable, wage-based and commission pay (new requirements + HR audit Critical #1)

Role: payroll expert + software engineer. The largest payroll addition. **The salaried-monthly path must remain byte-for-byte unchanged when no variable inputs exist.**

### 4a. Wage basis and rates
- Schema (`Employee` additive): `wageType` enum (`salaried` | `hourly` | `daily` | `weekly`, default `salaried`), `hourlyRate/dailyRate/weeklyRate Decimal?`, `ordinaryHoursPerMonth Decimal?` (default 173.33 when hourly). Salaried employees ignore these.

### 4b. Pay components and per-run inputs
- Schema: `PayrollInput` (id, tenantId, payrollRunId, employeeId, componentType enum, label, quantity Decimal?, rate Decimal?, amount Decimal, taxTreatment `regular` | `annual_payment`, notes). Component types (industry-standard set): overtime (1.5x), overtime_double (2.0x), sunday_time, public_holiday_time, night_shift, standby, commission, back_pay, bonus, thirteenth_cheque, allowance_custom, plus generic earning/deduction from the existing `EarningType`/`DeductionType` catalogue.
- The calculator gains an optional `inputs: PayrollInput[]` parameter. Regular components add to remuneration and are taxed via the normal annualisation; **bonus / 13th cheque / back-pay use the SARS annual-payment (non-recurring) tax method** (tax on annualised regular + component, minus tax on annualised regular), never ×12. This is the correct treatment and reuses the V5 Phase 3 bonus design (now folded in here).
- Overtime/Sunday/public-holiday/night-shift amounts derive from hours × the employee's rate × the statutory multiplier (BCEA: overtime 1.5x, Sunday 2x or 1.5x for regular Sunday workers, public holiday 2x).

### 4c. Capture methods (industry-standard, three ways)
1. **Per-employee, per-run entry grid.** On the open payroll run, an input grid: for each employee, add variable components (hours/amount) with a live gross/PAYE/net preview before finalising. Mirrors SimplePay "payslip inputs".
2. **Batch CSV upload for the current run (round-trip template).** Per the cross-cutting CSV principle: a **Download template** on the open run exports **every eligible employee already listed** (employee number and name pre-filled) with one column per variable component (overtime hours, commission amount, bonus, allowance, etc.), so the HR user just fills the amounts/hours for the month against real people and re-uploads. Upload runs validate (unknown/terminated employee, bad number) → **preview diff** → confirm → apply to the current run's inputs. This is the primary "update commission or hours for the month" path and needs no guesswork about columns.
3. **Recurring per-employee components** (e.g. a standing monthly commission or fixed allowance) stored on the employee/pay-profile and auto-applied each run until changed. Reuses the existing recurring-deduction pattern, extended to earnings.
- The downloaded run template and the accepted upload are the same shape; a short column key is included in the file.

### 4d. Outputs
- Variable components appear as their own payslip earning lines, flow into gross, UIF (capped), SDL, YTD (`ytd.ts`), and map to the correct IRP5 source codes (overtime 3607/commission 3606/bonus 3605/etc.).

Acceptance: an hourly employee with overtime pays correctly; a commission line (per-employee and via the populated round-trip CSV) lands on the right payslip and is taxed correctly; downloading the run template returns all eligible employees pre-listed and re-uploading applies the month's hours/commission; a 13th cheque is taxed as an annual payment not ×12; a salaried employee with no inputs produces an identical payslip to today (golden test still green). Hand-verify one worked example per component.

---

## Phase 5 — Multi-branch and multi-company (new requirements, highest risk)

Role: software architect + staff engineer. **Additive and isolated.** Split into two sub-phases so branches (lower risk, high value) can ship even if multi-company slips.

### 5a. Branches (within one legal entity) — lower risk
Requirement: handle different branches of the same company, run payroll per branch, different admins per branch.
- Schema: new `Branch` (id, tenantId, name, code, address, city, isDefault Boolean, createdAt). `Employee.branchId String?`. `PayrollRun.branchId String?` (null = whole company). `User.branchScopeId String?` (null = all branches; set = branch-limited admin). All nullable/additive.
- Migration/backfill: create one `Branch` per existing tenant marked `isDefault`, assign all existing employees to it, leave existing runs `branchId = null` (whole company) so nothing changes.
- Behaviour: payroll-run creation can target a branch (filter eligible employees by `branchId`); a branch-scoped admin (`branchScopeId` set) only sees and runs payroll for their branch. HR/exco with null scope see all branches (current behaviour). Reports and directory gain an optional branch filter.
- Backward compat: single-branch tenants see only "Head office" and behave exactly as today; the branch selector is hidden when a tenant has one branch.

### 5b. Multi-company / subsidiaries (separate legal entities under one admin) — higher risk
Requirement: subsidiaries and different companies under the same admin, switch between them.
- Schema: new `Organisation` (id, name, ownerUserId, createdAt); `Tenant.organisationId String?`. New `Membership` (id, userId, tenantId, role, branchScopeId String?, isDefault Boolean) so one user can access multiple tenants.
- **Backward-compatible auth migration:** keep `User.tenantId` as the home tenant; seed exactly one `Membership` per existing user from their current `tenantId`+`role`. Introduce an "active tenant" resolved from the session/cookie among the user's memberships, defaulting to home. `requireTenant`/`requireUser` read the active tenant and validate membership. Single-company users have one membership and see zero change.
- **Workspace switcher** returns for users with more than one membership (there was one previously, replaced by a static badge; reinstate it, gated to multi-membership users only). Creating a subsidiary creates a new `Tenant` under the same `Organisation` and a `Membership` for the owner.
- Guardrails: the CI tenant-isolation guard must still pass; every query stays `tenantId`-scoped to the active tenant; switching tenants re-scopes fully (no cross-tenant bleed). Extensive tests: a two-tenant user cannot read tenant B's data while active in tenant A.
- **De-scope switch:** if the timeline is tight, 5b can defer to V1.1; 5a alone already delivers "different branches with different admins and per-branch payroll" within a legal entity. Flag this decision to the founder before starting 5b.

Acceptance: payroll runs per branch; a branch admin is correctly limited; a multi-company owner switches tenants with full re-scoping and no data bleed; single-company/single-branch tenants are visually and functionally unchanged.

---

## Phase 6 — HR admin outputs and completeness (HR audit High/Medium)

Role: HR expert + engineer.

1. **Payroll register** (all employees, one run, earnings/deductions/net) and **general-ledger / journal export** (CSV mapped to account codes) so payroll can be posted to accounting.
2. **Contract and letter generation** from templates using employee data: employment contract, termination letter, warning letter.
3. **Disciplinary / warning records** module (structured: type, date, expiry, linked document) and **probation tracking** with end-date reminders.
4. **Certificate/qualification expiry reminders** (the `expiresAt` fields from Phase 3c and documents drive a reminders surface).
5. **Off-cycle and retroactive payroll runs** (bonus/correction runs, back-dated increases).
6. **COIDA Return of Earnings** annual earnings report.
7. **Excel (xlsx) export** across reports + dedicated employee export; PDF export of key reports.
8. **Announcements / company policies** in self-service; **profile/bank-detail change-request** approval workflow (MSS "approve employee changes").
9. **Termination date** on the employee (additive field) surfaced in termination flow.
10. **Leave encashment** and the sick-leave first-6-months BCEA rule (also V5).
11. **Birthdays on the company calendar (nice-to-have).** A tenant setting `showBirthdaysOnCalendar Boolean @default(false)` (off by default). When enabled, each active employee's birthday (day + month derived from the Phase 3a `dateOfBirth`) renders as a recurring annual marker on the company/team calendar alongside leave and public holidays. Show day and month only, not the year or age, to avoid exposing age. Depends on Phase 3a DOB being captured; employees without a DOB are simply skipped. Additive and opt-in, so no change for tenants who leave it off.

Acceptance: a bookkeeper can export a GL journal; HR can generate a contract and a termination letter; a disciplinary record persists; an off-cycle bonus run works; reports export to Excel; enabling the birthday setting shows employee birthdays (day/month only) on the calendar and disabling it hides them.

---

## Phase 7 — Reliability and UX polish [from V5]

Role: engineer + UI/UX.

1. **Reliable emails:** replace fire-and-forget `void` sends with `await`/`waitUntil` (~10 sites) so payslip/leave/billing emails actually send on Vercel.
2. **Unique constraints:** `@@unique([tenantId, employeeNumber])`, `@@unique([tenantId, email])` on invites.
3. **Invite fixes:** orphaned-auth-user recovery (H9), expired-invite dead-end (M7), inline copy-link in the onboarding wizard (M6).
4. **Payroll UX:** disable finalise on zero eligible employees (M5).
5. **Marketing UX:** mobile nav menu (H10), pricing table overflow (H11).
6. **Consistency:** Netcash spelling, sentence-case headings, `Checkbox` primitive, empty states, `OptionalTag`, remove billing debug logs.

Acceptance: emails verified in a deployed test; duplicate employee number/invite rejected; marketing usable on a phone; no dead-ends.

---

## Phase 8 — Gold accent rebrand (new requirement)

Role: UI/UX designer + front-end. **Gold is added, not a replacement. Indigo/blue stays the primary brand and primary action colour; gold is layered on as an accent on appropriate components and outlines only.** This forms a hybrid indigo (primary) + gold (accent) scheme, aligning with the existing "hybrid indigo + gold accent" brand direction noted for launch assets.

1. **Design tokens** (`globals.css`): add a new refined gold token (light + dark, OKLCH, a muted metallic gold rather than bright yellow) with a readable `--gold-foreground`, mapped through the Tailwind `@theme` layer as a **new** token. **Do not change `--primary`** (indigo stays). Leave the existing `--accent` behaviour intact unless a specific component reads better with gold.
2. **App application (additive only):** use gold selectively on appropriate components and outlines, active/selected borders, focus/hover outlines, highlight rules, small badges/chips, and secondary decorative accents. **Primary buttons and main CTAs stay indigo.** Do not recolour existing indigo primary actions. Verify dark mode and WCAG contrast for every gold usage.
3. **Marketing application (additive only):** layer gold as an accent on outlines, dividers, highlight text, badges, and secondary flourishes across `marketing/*`. The hero primary CTA and core brand elements remain indigo; gold supports, it does not take over.
4. **Brand assets:** keep indigo as the default `payslipAccentColor` (gold is an accent, not the payslip primary); update any marketing collateral in `marketing/` to layer the gold accent consistently.
5. **Consistency pass:** ensure gold is applied consistently on the chosen accent surfaces and that no indigo primary action was accidentally recoloured.

Acceptance: landing page and app show indigo primary with a tasteful gold accent on outlines/components in light and dark; contrast passes; no existing indigo primary action was replaced by gold.

---

## Phase 9 — Final audit

Re-run the five-agent review (UI/UX, QA, staff engineer, SA payroll expert, security/POPIA) plus a feature-completeness re-score against `HR_FEATURE_COMPLETENESS_AUDIT.md`. Confirm every phase RESOLVED with evidence, golden PAYE test green, variable pay + multi-branch working, and the salaried path unchanged. Return a single readiness score out of 10 and updated completeness percentages, **excluding** API rotation, live billing, and demo contacts. Target: 10/10 and a credible "top SA payroll app" positioning.

---

## Sequencing and risk summary

- **Order:** 0 → 1 → 2 → 3 → 4 → 5a → (5b or defer) → 6 → 7 → 8 → 9. Phases 1–2 protect revenue and data; 3–4 deliver the record + pay depth; 5 delivers branches/companies; 6 fills HR outputs; 7–8 polish and rebrand; 9 verifies.
- **Highest risk:** Phase 5b (multi-company auth change) and Phase 4 (payroll engine extension). Both are isolated, feature-flagged/additive, and backed by tests; the salaried path and single-company/single-branch behaviour must be provably unchanged (golden test + regression suite).
- **Decision gates for the founder:** (a) confirm proceeding with multi-company 5b now vs deferring to V1.1 (branches 5a ship regardless). Gold is confirmed additive (indigo stays primary), so no rebrand decision is outstanding.
- **Parallelism when "go":** 1, 2, 3, 8 can run largely in parallel across agents; 4 depends on 3a wage fields; 5 depends on 0's migration harness; 6 depends on 4 (register/GL) and 3 (expiry data); 9 is last.

## Do not rebuild (already strong)
Salaried payroll engine (LifeCheq-validated), 4 payslip templates, leave breadth, statutory outputs (EMP201/EMP501/IRP5/UIF/ETI), employee documents, onboarding wizard, bulk import, RBAC + audit logging, UI/UX quality, tenant-isolation CI guard, error boundaries. Everything above extends this foundation; it does not replace it.
