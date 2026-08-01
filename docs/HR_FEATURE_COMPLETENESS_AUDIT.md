# NovaHR Feature Completeness Audit

Date: 2026-08-01 (updated after the code-completion push). Method: direct schema, route, component and lib inspection. Lens: can NovaHR replace SimplePay / Sage VIP / PaySpace for a South African SME. Every status is backed by code evidence.

This audit **supersedes** the earlier 8.5/10 and 8.7/10 revisions. It reflects `main` after ten feature batches (PRs #56–#64): editable gender + SA dropdowns, calendar date pickers, XLSX export, COIDA, IRP5 self-service, expiry dashboard, org chart, payroll lock, performance reviews, and employment history.

---

## Scores (updated)

| Dimension | Prior | Now | Basis for change |
|-----------|-------|-----|------------------|
| HR completeness | 84% | **90%** | + performance reviews, employment history timeline, org chart, expiry dashboard, bulk export, calendar UX |
| Payroll completeness | 80% | **84%** | + explicit run lock/unlock, IRP5 self-service |
| SA statutory compliance | 84% | **90%** | + COIDA Return of Earnings, IRP5/IT3(a) self-service |
| Commercial readiness | 80% | **88%** | + Excel export across reports, bulk employee export, polished date pickers |
| Enterprise readiness | 52% | **61%** | + payroll lock control, role-scoped self-service, org chart |
| **Overall readiness** | **8.7/10** | **9.1/10** | Broad HR + statutory closure; remaining ceiling is the large payroll/enterprise builds |

The remaining gap to 10/10 is now concentrated in a few **large or infrastructure** items (statutory EEA2/EEA4 PDF, multiple payroll groups, retroactive payroll, MFA, multi-company), not breadth.

---

## Closed this session (code + evidence)

| # | Gap | Evidence |
|---|-----|----------|
| 1 | COIDA Return of Earnings (W.As.8) | `coida.ts` + `coida-actions.ts`, Compliance "Annual (COIDA)" tab, unit tested |
| 3 | Excel (XLSX) export | `lib/export/xlsx.ts` (write-excel-file) + `ExportButton`; wired into payroll/leave/workforce/equity reports, payroll register |
| 7 | Performance reviews | `PerformanceReview` model + `lib/performance/actions.ts` + Performance profile tab; manager-scoped writes, employee acknowledge |
| 8 | Promotion/transfer history | `EmployeeHistoryEvent` model, auto-captured on edit, Employment history timeline on profile |
| 9 | Document/qualification expiry dashboard | `getExpiringDocumentsAction` + Reports "Expiries" tab (version history still open) |
| 13 | Organisation chart | Reports "Structure" tab (`org-chart.tsx`) from managerId |
| 17 | Explicit payroll lock/unlock | `PayrollRun.lockedAt/lockedBy`, lock/unlock actions, cancel refused while locked |
| 23 | Bulk employee export | Directory `ExportButton`; pay column gated to HR/exco |
| 24 | IRP5 self-download | `getMyIrp5CertificateAction` scoped via `requireEmployeeScope`, My Payslips |
| — | Editable gender + SA dropdowns | `config/employee-options.ts` |
| — | Calendar date pickers | `ui/date-picker.tsx` replaces all 14 native date inputs |
| 16, 19, 20 | Company banking, distributed rate limiting, branch clear-to-null | (closed in prior revision) |

---

## Remaining gaps

### Larger builds (dedicated effort recommended)
| # | Gap | Note |
|---|-----|------|
| 2 | Statutory EEA2/EEA4 **form** PDF | Data + tables + CSV/Excel exist; the official DoL form layout/PDF does not |
| 4 | Multiple payroll groups / frequencies | One run per period; needs a payroll-group concept across the run engine |
| 5 | Retroactive / back-dated payroll | No arrear/adjustment run; only reversal exists |
| 21 | Multi-company membership | No `TenantMembership`; deferred for auth complexity |

### Medium features (next tranche)
| # | Gap | Note |
|---|-----|------|
| 6 | Probation end-date + reminders | Needs `probationEndDate` threaded through employee CRUD + a reminder |
| 10 | Bank-detail change-request approval | Employees editing bank details should route through HR approval (fraud control) |
| 11 | Leave encashment (mid-employment) | Only termination encashment today |
| 12 | Recurring per-employee variable pay | `PayrollInput` has no recurring flag |
| 14 | Cost centres | No model; needed for some GL postings |
| 15 | Job position catalogue | `jobTitle` still free text |
| 22 | Branch-scope reports / leave / activity | Branch filter exists for payroll runs only |
| 9b | Document version history | Expiry dashboard done; per-document version history not |

### Manual / infrastructure (cannot be closed purely in code)
| # | Gap | Note |
|---|-----|------|
| 18 | MFA for HR / exco | Enable/enforce in Supabase Auth; app can surface the setting |
| — | Netcash key rotation, live billing credentials | Operational, user action |

---

## Verification standard
Every batch this session shipped with `tsc --noEmit` clean, `vitest` green (now 407 tests), `eslint` clean on touched files, additive-only migrations (`ADD VALUE/COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`), and a production deploy verified with an HTTP 200 health check.
