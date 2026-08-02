# NovaHR Feature Completeness Audit

Date: 2026-08-02. Method: direct schema, route, component and lib inspection. Lens: can NovaHR replace SimplePay / Sage VIP / PaySpace for a South African SME. Every status is backed by code evidence.

This audit supersedes the prior revisions (8.5 → 8.7 → 9.1). It reflects `main` after the code-completion push (PRs #56–#71): all CRITICAL/HIGH/MEDIUM code gaps closed except the four **large builds** and MFA.

---

## Scores (updated)

| Dimension | Prior | Now | Basis for change |
|-----------|-------|-----|------------------|
| HR completeness | 90% | **93%** | + probation tracking, job/cost catalogues, recurring pay, leave encashment, document versions |
| Payroll completeness | 84% | **88%** | + recurring variable pay, leave encashment, payroll lock |
| SA statutory compliance | 90% | **91%** | + configurable employer-paid family leave (BCEA/UIF correct default) |
| Commercial readiness | 88% | **90%** | + branch-scoped reports, catalogues, calendar/UX polish |
| Enterprise readiness | 61% | **66%** | + cost centres, branch-scoped reporting, payroll lock control |
| **Overall readiness** | **9.1/10** | **9.4/10** | All contained code gaps closed; remaining is the large/infra work |

The remaining 0.6 is concentrated in four **large builds** and one **infrastructure** item, not breadth.

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

## Remaining — large builds (next session)

| # | Gap | Note |
|---|-----|------|
| 2 | Statutory EEA2/EEA4 **form** PDF | Data + tables + CSV/Excel exist; the official DoL form layout/PDF does not |
| 4 | Multiple payroll groups / frequencies | One run per period; needs a payroll-group concept across the run engine |
| 5 | Retroactive / back-dated payroll | No arrear/adjustment run; only reversal exists |
| 21 | Multi-company membership | No `TenantMembership`; deferred for auth complexity |

## Remaining — infrastructure / manual

| # | Gap | Note |
|---|-----|------|
| 18 | MFA for HR / exco | Enable/enforce in Supabase Auth; app can surface the setting |
| — | Netcash key rotation, live billing credentials | Operational, user action |

---

## Verification standard
Every batch shipped with `tsc --noEmit` clean, `vitest` green (407 tests), `eslint` clean on touched files, additive-only migrations (`ADD VALUE/COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`), and a production deploy verified with an HTTP 200 health check.
