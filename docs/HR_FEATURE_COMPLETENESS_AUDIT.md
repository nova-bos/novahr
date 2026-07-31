# NovaHR Feature Completeness Audit and Gap-Closure Plan

Date: 2026-07-30. Method: direct schema, route, component and lib inspection (no assumptions). Lens: can NovaHR replace SimplePay / Sage VIP / PaySpace / PaySpace for a South African SME. Every status below is backed by code evidence.

Scope note: this audit is about **feature completeness for a commercial SA HR & payroll product**. It is separate from `PRE_LAUNCH_ACTION_PLAN_V5.md` (billing, security, correctness). Both must be worked to reach a sellable product.

---

## Scores (evidence-based)

| Dimension | Score | One-line basis |
|-----------|-------|----------------|
| HR completeness | 62% | Strong records/leave/documents/onboarding; missing org structure, structured qualifications, disciplinary, performance, contract generation |
| Payroll completeness | 55% | Excellent salaried-monthly engine; missing wage earners (hourly/daily), overtime, commission, bonus, shift pay, off-cycle, GL export |
| SA statutory compliance | 70% | EMP201/EMP501/IRP5/IT3(a)/UIF/ETI/EE data present; missing COIDA Return of Earnings, formal EEA2/EEA4, generated contracts |
| Commercial readiness | 60% | Multi-tenant, billing, ESS/MSS, legal pages present; wage-earner gap and missing basics will cause churn/support load |
| Enterprise readiness | 35% | No SSO, MFA, org chart, custom fields, cost centres, public API, permission matrix |

---

## Verdict on "are the basics covered"

**Partly.** For a company that pays **salaried monthly staff** with standard allowances, NovaHR is close to complete and genuinely strong. But three categories of gap will break trust and generate support tickets the moment a real HR user touches them:

1. **Wage earners and variable pay are not supported.** The payroll engine only handles a fixed monthly salary plus travel and housing allowance. There is no hourly/daily/weekly rate, no overtime, no commission, no bonus/13th cheque, no shift/Sunday/public-holiday pay, no back pay. Any customer with a single wage earner or a single overtime line cannot run correct payroll. This is the biggest single gap.
2. **Standard employee-record fields are missing.** No date of birth (derived from ID only), no gender field independent of employment-equity, no marital status, no nationality/passport, no next of kin separate from emergency contact, no structured qualifications/skills, no custom fields. HR users expect these and will ask where they are.
3. **Expected HR admin outputs are missing.** No employment contract generation, no warning/disciplinary records, no termination letter, no payroll register or general-ledger export, no COIDA Return of Earnings. These are routine expectations for an HR/payroll product.

None of these block the current UAT (salaried demo employees), but they must be closed before charging a general SME audience, or support load and churn will be high.

---

## 1. Company management

| Feature | Status | Evidence / note |
|--------|--------|-----------------|
| Company name, legal name, initials, industry | Present | `Tenant` model |
| Registration, VAT, PAYE, UIF, SDL numbers | Present | `Tenant` + `PayrollSettings` reference numbers |
| Trading name (distinct) | Partial | Only `name` + `legalName`; no explicit trading name |
| COIDA information | **Missing** | No field anywhere |
| Banking details | Partial | `bankName` only; no account number/branch for the company |
| Contact information | Partial | `primaryContact` only; no structured phone/email set |
| Company logo | Present | Payslip logo in `PayrollSettings` |
| Financial year | Present | `taxYearStart`/`taxYearEnd` |
| Payroll frequency, currency, pay day | Present | `Tenant` |
| Public holiday calendar | Present | `CustomHoliday` + config |
| Branches | **Missing** | Single `address`/`city` on tenant |
| Departments | Present | `Department` model (head, budget, colour) |
| Divisions / Teams | **Missing** | No models |
| Cost centres | **Missing** | No model |
| Job positions (catalogue) | **Missing** | `jobTitle` is free text on employee |
| Reporting structure | Partial | `managerId` on employee, no enforced hierarchy |
| Managers | Present | `managerId` + manager role |
| Organisation chart | **Missing** | No chart view |

## 2. Employee management

| Feature | Status | Evidence / note |
|--------|--------|-----------------|
| Full name, preferred name | Present | `Employee` |
| ID number, tax number | Present | encrypted-at-rest gap tracked in V5 plan |
| Passport, nationality | **Missing** | Only `foreignNational` boolean |
| Date of birth | Partial | Derived from ID; no explicit field (breaks for passport holders) |
| Gender | Partial | Only `equityGender` (tied to employment equity) |
| Marital status | **Missing** | No field |
| Residential address | Present | `address` |
| Postal address (separate) | **Missing** | Single address only |
| Email, phone | Present | `Employee` |
| Emergency contact | Present | name/relationship/phone |
| Next of kin (distinct) | **Missing** | Only emergency contact |
| Employee number | Present | `EmployeeNumberConfig` auto-allocation |
| Employment type/status | Present | enums incl. probation, terminated |
| Department/position/manager/title | Present | `Employee` |
| Start date | Present | `Employee.startDate` |
| End / termination date | **Missing** | No `terminationDate` field on employee |
| Probation tracking | Partial | status only; no probation end date or reminder |
| Notice period | **Missing** | No field |
| Salary, allowances, bank, tax, UIF | Present | `Employee` + `PayrollProfile` |
| Medical aid / pension / provident / RA | Present | `PayrollProfile` + salary fields |
| Employee documents | Present | `EmployeeDocument` (categories, expiry, storage) |
| Qualifications / licences / certificates | Partial | Only as uploaded documents, not structured records |
| Skills / languages | **Missing** | No models |
| Dependants | Partial | `medicalAidDependants` count only, no detail |
| Custom fields | **Missing** | No mechanism |
| Salary history | Present | `EmployeeSalaryHistory` |
| Promotion / transfer / disciplinary / performance history | **Missing** | Only salary history + activity timeline |
| Leave history | Present | `LeaveRequest` |
| Employee search / filter / sort | Present | `employee-directory.tsx` |
| Bulk import | Present | `import-employees-dialog.tsx` |
| Bulk export | Partial | CSV of some reports; no dedicated employee export |
| Employee archive | Present | terminated status retained |

## 3. Payroll

| Feature | Status | Evidence / note |
|--------|--------|-----------------|
| Monthly salary | Present | calculator |
| Hourly / daily / weekly rate | **Missing** | Monthly-only engine |
| Travel / housing allowance | Present | wired into calculator |
| Cellphone / meal / other allowance | Partial | only via generic `employerBenefits` JSON, not first-class |
| Overtime | **Missing** | not in calculator |
| Commission | **Missing** | catalogue category only, not applied |
| Bonus / 13th cheque | **Missing** | see V5 plan Phase 3 |
| Sunday / public holiday / night shift / standby | **Missing** | not in calculator |
| Back pay | **Missing** | no retroactive line |
| Custom earnings per run | **Missing** | `EarningType` catalogue exists but not applied to runs |
| PAYE / UIF / SDL / ETI | Present | validated against LifeCheq (2026/27) |
| Medical aid / pension / provident / RA deductions | Present | calculator + profile |
| Company loans / garnishees / maintenance | Present | `EmployeeDeduction` (loan/garnishee kinds, balance recovery) |
| Union fees / savings / voluntary / custom deductions | Partial | `DeductionType` catalogue + recurring deductions |
| Payroll processing / approval / finalisation | Present | `payroll/actions.ts`, approval flow |
| Payroll locking | Partial | completed status acts as lock; no explicit lock/unlock |
| Payroll reversal | Present | `run-reversal.ts` |
| Recalculation | Partial | via reversal + re-run |
| Retroactive payroll | **Missing** | no back-dated adjustments |
| Off-cycle payroll | **Missing** | one scheduled run per period |
| Multiple payrolls (by group/frequency) | **Missing** | single run per period |
| Payroll audit trail | Present | activity + audit log |
| Payslips | Present | 4 templates, PDF, YTD |
| Payroll register | **Missing** | no all-employees single register |
| Payroll summary | Partial | run totals only |
| Bank payment file | Present | Netcash export |
| General ledger export | **Missing** | no GL/journal export |
| Payroll journal | **Missing** | none |

## 4. South African compliance

| Feature | Status | Evidence |
|--------|--------|----------|
| PAYE / IRP5 / IT3(a) | Present | `irp5.ts`, `irp5-pdf.tsx` |
| EMP201 / EMP501 | Present | panels + actions |
| Tax certificates | Present | IRP5 PDF |
| UIF calculations / declaration | Present | `uif-actions.ts` |
| SDL calculations | Present | calculator + EMP201 |
| ETI | Present | `eti.ts` (160-hour gap tracked in V5) |
| COIDA Return of Earnings (W.As.8) | **Missing** | none |
| Leave types (annual/sick/family/maternity/parental/adoption/commissioning/study) | Present | `LeaveType` enum + policy |
| Employment equity data | Present | equity fields on employee |
| Formal EEA2 / EEA4 report | Partial | equity report exists; not the statutory EEA form |
| POPIA (privacy, PAIA, DPA, retention, deletion) | Present | legal pages + POPIA export helper |
| Audit logs | Present | `audit-log.tsx` |
| Employment contracts (generation) | **Missing** | upload only |
| Warnings / disciplinary records | **Missing** | document upload only, no structured module |
| Termination letters | **Missing** | terminate action, no letter |
| Exit interviews | **Missing** | none |
| Probation tracking | Partial | status only |

## 5. Leave management

Leave types, policies, rules, accrual (upfront/accrual), balances, carry-forward, requests, approval, reviewers, team/company calendar, custom holidays, public holidays, cancellation, half-day selections, leave audit trail: **Present**. Leave encashment: **Missing**. Sick-leave first-6-months BCEA rule: **Needs improvement** (tracked in V5).

## 6. Document management

Upload, categories, expiry field, storage, permissions (role-based), search: **Present/Partial**. Version history: **Missing**. Digital signatures: **Missing**. Expiry reminders/tracking dashboard: **Missing** (field exists, no alerting).

## 7. Employee self-service

Dashboard, profile view, leave requests, payslip downloads, document downloads, notifications: **Present**. IRP5 self-download: **Partial** (verify surfaced to employee). Profile update requests / bank-detail change workflow: **Partial** (edit dialog, no approval workflow). Announcements / company policies: **Missing**.

## 8. Manager self-service

Approve leave, view team, team calendar: **Present**. Approve overtime: **Missing** (no overtime). Approve employee changes: **Missing** (no change-request workflow). Performance reviews: **Missing**.

## 9. Reporting

Employee/workforce, headcount, leave, payroll composition, equity, employment-mix reports with CSV export: **Present**. PDF export of reports: **Partial**. Excel (xlsx): **Missing** (CSV only). Custom report builder: **Missing**. Scheduled reports: **Missing**.

## 10. Security

RBAC (4 roles), audit logs, payroll audit trail, encryption (Netcash keys; employee PII plaintext gap in V5), signed URLs, rate limiting (in-memory gap in V5): **Present/Partial**. MFA: **Missing** (and currently claimed in legal copy). Password policy config: **Partial** (Supabase defaults). Permission matrix / custom roles: **Missing**.

## 11. Workflow

Onboarding wizard + checklist: **Present**. Offboarding (terminate): **Partial**. Approval workflows (leave, payroll): **Present**. Notifications: **Present**. Task automation: **Missing**.

## 12. System quality

Search, filter, sort, pagination, responsive, validation, error messages, loading states, empty states, toasts, consistency, UI/UX quality: **Present** (strong, per UI/UX agent review). Autosave: **Partial**. Undo: **Partial** (reversal). Bulk actions: **Partial**.

---

## Gap-closure plan (grouped by priority)

### CRITICAL — before selling to a general SME audience
These cause wrong pay or "where is this basic thing" trust breaks.

1. **Variable and wage-based pay engine.** Extend the calculator and a per-run, per-employee input to support: hourly/daily/weekly rates; overtime (1.5x / 2.0x); Sunday and public-holiday pay; back pay; commission; and per-run custom earnings driven by the existing `EarningType` catalogue. This is the single biggest commercial blocker. (Bonus/13th cheque is specced separately in V5 Phase 3.)
2. **Core employee-record fields.** Add date of birth (explicit), gender (independent of equity), marital status, nationality, passport number, next of kin, and a termination/end date on the employee. These are expected on every HRIS.
3. **Payroll register + general-ledger/journal export.** An all-employees payroll register per run and a GL/journal export (CSV mapped to account codes) so a bookkeeper can post payroll. Routine expectation.
4. **Employment contract + basic letter generation.** Generate an employment contract, a termination letter, and a warning letter from templates using employee data. HR expects to produce these.

### HIGH — before marketing hard
5. **Structured qualifications, certificates, and skills** records on the employee (not just document uploads), with certificate/licence expiry reminders (the `expiresAt` field already exists on documents; add alerting).
6. **Disciplinary / warning records module** (structured, with type, date, expiry, linked documents) and probation tracking with an end-date reminder.
7. **Off-cycle and retroactive payroll runs** (bonus runs, corrections, back-dated increases).
8. **Custom fields** on the employee record so customers can capture what NovaHR does not model.
9. **Excel (xlsx) export** across reports and a basic employee export, plus PDF export of key reports.
10. **COIDA Return of Earnings** support (annual earnings report for the W.As.8 submission).
11. **Announcements / company policies** distribution in self-service, and a bank-detail / profile change-request approval workflow (MSS "approve employee changes").

### MEDIUM — Version 2
12. Company structure depth: branches, cost centres, job-position catalogue, and an organisation chart view.
13. Leave encashment; sick-leave first-6-months rule (also in V5).
14. Document version history and expiry dashboard.
15. Performance reviews (basic cycle: goals, review, rating) and employment/promotion/transfer history timelines.
16. Payroll locking/unlocking as an explicit control; multiple payroll groups.
17. Formal EEA2/EEA4 employment-equity report output.

### LOW / Enterprise edition
18. MFA (note: implement or remove the legal-copy claim per V5 Phase 2), SSO, custom roles / permission matrix.
19. Custom report builder and scheduled report delivery.
20. Digital signatures on documents, task automation, public API/webhooks for integrations.

---

## Suggested sequencing

- **Pre-launch (with V5):** Critical items 1 to 4 alongside the V5 revenue/compliance fixes. Without item 1 (variable pay), NovaHR can only serve fully-salaried customers, so decide explicitly whether launch targets salaried-only SMEs (then items 2 to 4 plus V5 suffice) or the general market (then item 1 is mandatory).
- **Version 1.1 (first month post-launch):** High items 5 to 11.
- **Version 2:** Medium items 12 to 17.
- **Enterprise edition:** items 18 to 20.

## What is genuinely strong (do not rebuild)

Salaried payroll engine (validated against LifeCheq), the four payslip templates, leave management breadth (9 types, accrual, reviewers, half-days, custom holidays), statutory outputs (EMP201/EMP501/IRP5/UIF/ETI), employee documents with expiry and categories, the onboarding wizard, bulk import, employment-equity data capture, RBAC with audit logging, and the overall UI/UX quality. The foundation is well above MVP; the gaps above are breadth of coverage, not depth of quality.
