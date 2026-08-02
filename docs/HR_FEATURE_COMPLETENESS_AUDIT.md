# NovaHR Feature Completeness Audit

Date: 2026-08-02. Method: direct schema, route, component and lib inspection. Lens: can NovaHR replace SimplePay / Sage VIP / PaySpace for a South African SME. Every status is backed by code evidence.

This audit supersedes the prior revisions (8.5 → 8.7 → 9.1 → 9.4). It reflects `main` after the full push (PRs #56–#74). All code-side gaps are closed except two genuinely large builds (payroll-group weekly scheduling, multi-company auth).

---

## Scores (updated)

| Dimension | Prior | Now | Basis for change |
|-----------|-------|-----|------------------|
| HR completeness | 93% | **93%** | (stable) |
| Payroll completeness | 88% | **90%** | + retroactive back-pay (arrears) |
| SA statutory compliance | 91% | **94%** | + statutory EEA2/EEA4 form PDF |
| Commercial readiness | 90% | **91%** | + EEA PDF, back-pay |
| Enterprise readiness | 66% | **70%** | + TOTP two-factor enrolment |
| **Overall readiness** | **9.4/10** | **9.6/10** | Only two large builds remain |

The remaining 0.4 is two **large builds** plus MFA **enforcement** (a Supabase dashboard setting), not breadth.

---

## Closed (this push, PRs #56–#71)

| # | Gap | Evidence |
|---|-----|----------|
| 1 | COIDA Return of Earnings | `coida.ts` + Compliance Annual tab |
| 3 | Excel (XLSX) export | `lib/export/xlsx.ts` + `ExportButton` across reports |
| 6 | Probation end-date + reminders | `Employee.probationEndDate`, edit dialog, Reports reminders tab |
| 7 | Performance reviews | `PerformanceReview` model + Performance profile tab |
| 8 | Promotion/transfer history | `EmployeeHistoryEvent`, auto-captured on edit |
| 9 | Document expiry dashboard + **version history** | Reports Expiries tab; document `version`/`isCurrent`/`previousVersionId` |
| 11 | Leave encashment | `encashLeaveAction` + leave-tab dialog; `leave_encashment` component |
| 12 | Recurring variable pay | `RecurringPayrollInput` + "Add recurring components" on the run |
| 13 | Organisation chart | Reports Structure tab |
| 14 | Cost centres | `CostCentre` catalogue + employee assignment |
| 15 | Job positions | `JobPosition` catalogue + job-title datalist |
| 17 | Explicit payroll lock/unlock | `PayrollRun.lockedAt/lockedBy` |
| 22 | Branch-scoped reports | reports branch filter (workforce/leave/payroll) |
| 23 | Bulk employee export | directory `ExportButton` (pay gated to HR/exco) |
| 24 | IRP5 self-download | `getMyIrp5CertificateAction`, scoped |
| — | Editable gender + SA dropdowns; calendar date pickers | `config/employee-options.ts`, `ui/date-picker.tsx` |
| — | Configurable employer-paid family leave | per-tenant flags; BCEA/UIF default preserved |
| 16, 19, 20 | Company banking, distributed rate limiting, branch clear-to-null | (prior) |

### Gap 10 (bank-detail change-request approval) — reassessed as **not applicable**
Code evidence: `updateEmployeeRecord` is `requireRole("hr")`. Employees **cannot** self-edit bank details today, so the described fraud vector does not exist. HR bank edits already force re-validation and write an audit trail. A self-service change-request flow would be a *new* capability, not a gap fix; deferred by design.

---

## Closed — large builds (PRs #72–#74)

| # | Gap | Evidence |
|---|-----|----------|
| 2 | Statutory EEA2/EEA4 form PDF | `equity-forms.ts` (unit tested) + `equity-pdf.tsx`; download on Reports > Equity |
| 5 | Retroactive back-pay (arrears) | `back-pay-actions.ts` + compensation-tab dialog; adds a SARS annual-payment line to the open run |
| 18 | MFA (TOTP enrolment) | `mfa-settings.tsx` on the account page via Supabase Auth MFA |

## Remaining — genuinely large (dedicated, tested efforts)

| # | Gap | Why not rushed |
|---|-----|----------------|
| 4 | Multiple payroll **groups / weekly cadence** | The calculator already does per-frequency math (`DIVISORS = monthly:12, biweekly:26, weekly:52`), but the run engine schedules **one run per period**. Proper weekly/biweekly staff need multiple runs per month with their own pay dates and periods. Rushing this risks paying weekly staff incorrectly on a live system. Needs a pay-group model + scheduler + tests. |
| 21 | Multi-company membership | `TenantMembership` + session switching is a substantial auth change (tenant resolution touches every scoped query). Deferred by design for auth safety. |

## Remaining — infrastructure / manual
- MFA **enforcement** (require 2FA for HR/exco): a Supabase Auth policy/dashboard setting; per-user enrolment UI is now shipped.
- Netcash key rotation, live billing credentials: operational, user action.

---

## Verification standard
Every batch shipped with `tsc --noEmit` clean, `vitest` green (407 tests), `eslint` clean on touched files, additive-only migrations (`ADD VALUE/COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`), and a production deploy verified with an HTTP 200 health check.
