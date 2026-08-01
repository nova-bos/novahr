# NovaHR Feature Completeness Audit

Date: 2026-08-01. Method: direct schema, route, component and lib inspection (no assumptions). Lens: can NovaHR replace SimplePay / Sage VIP / PaySpace for a South African SME. Every status below is backed by code evidence.

This audit **supersedes** the previous post-Phase-9 audit (8.5/10). It reflects the current state of `main` after the SA-context dropdown / editable-gender work (PR #56) and all operations-layer additions (disciplinary records, announcements, ETI, configurable leave policies, custom holidays, company banking, distributed rate limiting).

---

## Scores (updated)

| Dimension | Previous | Now | Basis for change |
|-----------|----------|-----|------------------|
| HR completeness | 79% | **84%** | + disciplinary records, announcements, employee documents, configurable leave policies, custom holidays, editable demographics, comprehensive SA dropdowns |
| Payroll completeness | 78% | **80%** | + ETI (Employment Tax Incentive) claims; core engine unchanged |
| SA statutory compliance | 82% | **84%** | + ETI, EEA2/EEA4 data tables, BCEA-aligned employment types |
| Commercial readiness | 76% | **80%** | + company banking details, richer feature surface, professional dropdown catalogues |
| Enterprise readiness | 43% | **52%** | + DB-backed distributed rate limiting, company banking, branch clear-to-null, disciplinary audit trail |
| **Overall readiness** | **8.5/10** | **8.7/10** | Real operational breadth added; the 5 CRITICAL gaps still cap the ceiling |

The overall bump is modest on purpose: the gains since the last audit are in operational breadth (things HR touches daily), not in the critical statutory/enterprise gaps. Until COIDA, XLSX export and the statutory EEA2/EEA4 form land, "sellable to a general SME audience" stays constrained.

---

## What was closed since the previous audit

| # | Gap | Status | Evidence |
|---|-----|--------|----------|
| 16 | Company banking details | Resolved | `Tenant.bankAccountNumber`, `bankBranchCode`, `bankAccountType` (schema.prisma:340-342) |
| 19 | Distributed rate limiting | Resolved | `RateLimit` model (key/count/windowStart) replaces the in-memory Map (schema.prisma:1041) |
| 20 | Edit dialog cannot clear branch to null | Resolved | "Head office / whole company" option sets `branchId` to empty (edit-employee-dialog.tsx:431-440) |
| — | Gender read-only when derived from ID | Resolved (this session) | Now auto-fills but editable via dropdown in onboarding + edit; `config/employee-options.ts` |
| — | Thin dropdowns for SA context | Resolved (this session) | Qualifications (full NQF ladder), marital status (customary marriage, civil union), employment type (temporary, casual, learnership, internship) |

### New capabilities added since the last audit (beyond the original 24-item list)
- **ETI (Employment Tax Incentive)** claims: `EtiClaim` model + `src/lib/payroll/eti.ts`. Significant SA payroll/statutory feature.
- **Disciplinary / counselling records**: `DisciplinaryRecord` model + `src/lib/disciplinary/actions.ts`.
- **Company announcements**: `Announcement` model + `/announcements` route.
- **Configurable leave policies**: `TenantLeavePolicy` model.
- **Multi-reviewer leave approval**: `LeaveReviewer` model.
- **Custom public holidays**: `CustomHoliday` model.
- **Employee documents** with expiry (`EmployeeDocument.expiresAt`) and **auto employee numbering** (`EmployeeNumberConfig`).

---

## CRITICAL gaps (block selling to a general SME audience)

| # | Gap | Status | Evidence / note |
|---|-----|--------|-----------------|
| 1 | COIDA Return of Earnings (W.As.8) | Still missing | No `coida*` field, model, query or export anywhere |
| 2 | Statutory EEA2 / EEA4 form | Partial (improved) | `employment-equity.ts` now builds EEA2 headcount + EEA4 remuneration **data**; `equity-report.tsx` renders tables with **CSV** download. Still not the official DoL EEA2/EEA4 **form layout / PDF** |
| 3 | Excel (XLSX) export | Still missing | No `xlsx`/`exceljs` package; all exports go through `src/lib/export/csv.ts` (CSV only) |
| 4 | Multiple payroll groups / frequencies | Still missing | No `PayrollGroup`; one run per period. Weekly + monthly staff cannot both be run |
| 5 | Retroactive / back-dated payroll adjustments | Still missing | Only `run-reversal.ts` (undo approval); no retro/arrear adjustment run |

---

## HIGH gaps (before marketing hard)

| # | Gap | Status | Evidence / note |
|---|-----|--------|-----------------|
| 6 | Probation end-date + reminders | Still missing | `status = probation` enum only; no `probationEndDate`, no alert, no confirm/extend action |
| 7 | Performance reviews | Still missing | No `PerformanceReview` model |
| 8 | Promotion / transfer history timeline | Still missing | Only `EmployeeSalaryHistory` (pay changes) + free-text activity log; no structured `EmployeeHistoryEvent` |
| 9 | Document version history + expiry dashboard | Partial | `EmployeeDocument.expiresAt` + qualification-alerts exist; no **company-wide expiry dashboard** and no **version history** |
| 10 | Bank-detail / profile change-request approval | Still missing | Employees still edit bank details directly; no `ChangeRequest` model / approval flow (fraud-risk gap) |
| 11 | Leave encashment (mid-employment) | Still missing | Encashment exists only inside the termination calculation (schema.prisma:406 comment) |
| 12 | Recurring per-employee variable pay | Still missing | `PayrollInput` has no `recurring` flag; variables re-entered every run |

---

## MEDIUM gaps (Version 2)

| # | Gap | Status | Evidence / note |
|---|-----|--------|-----------------|
| 13 | Organisation chart view | Still missing | `managerId` hierarchy exists; no chart UI; no react-flow/D3 |
| 14 | Cost centres | Still missing | No model |
| 15 | Job position catalogue | Still missing | `jobTitle` still free text |
| 16 | Company banking details | Resolved | See above |
| 17 | Explicit payroll lock / unlock | Still missing | `completed` status is a soft lock; minor corrections still need full reversal |
| 18 | MFA for HR / exco | Still missing | Auth still password-only; no TOTP/factor enrolment |
| 19 | Distributed rate limiting | Resolved | See above |

---

## Known code gaps / technical debt

| # | Gap | Status | Evidence / note |
|---|-----|--------|-----------------|
| 20 | Clear employee branch to null | Resolved | See above |
| 21 | Multi-company membership | Still deferred | No `TenantMembership`; one user = one tenant |
| 22 | Branch-scope reports / leave / activity / notifications | Still missing | Branch filter exists for payroll runs only; reports and leave components carry no `branchId` filter |
| 23 | Bulk employee export | Still missing | `employee-directory.tsx` has no export action; only some report CSVs |
| 24 | IRP5 self-download for employee role | Still HR-gated | `getEmployeeCertificatesAction` calls `requireTenant(tenantId, "hr")` (irp5-actions.ts:72); employees cannot self-serve IRP5 |

---

## Excluded from scoring (user action required)
- Netcash key rotation (live + test keys in Vercel env vars).
- Live billing credentials / demo contacts / real banking details.

---

## Recommended next tranche (highest commercial impact first)
1. **XLSX export** (gap 3): single package (`exceljs`), wire into the existing CSV export points. Low effort, high buyer expectation.
2. **COIDA Return of Earnings** (gap 1): statutory, blocks a whole buyer segment.
3. **Bank-detail change-request approval** (gap 10): fraud-risk; small model + approval UI.
4. **Probation end-date + reminders** (gap 6): one nullable field + a dashboard alert; cheap and expected.
5. **Statutory EEA2/EEA4 form output** (gap 2): the data already exists; this is a PDF/layout task.
