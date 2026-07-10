# NovaHR Payroll Calculations and Auditing

**Version:** 1.0
**Review:** Every March (SARS update) and after any calculator change
**Audience:** Customers, auditors, tax practitioners, internal reference

This document explains how NovaHR computes a payslip end to end, and how the results are verified. It answers the due-diligence question: "How do you know the numbers are right?"

---

## 1. Calculation Pipeline

For each employee in a payroll run:

1. **Gross earnings:** basic salary for the period, plus allowances (housing, travel, other), plus overtime, plus once-off earnings;
2. **Unpaid leave:** per-day rate deducted for unpaid leave days in the period, disclosed as its own line;
3. **Retirement deduction (s 11F):** pension/provident contributions deducted before tax, capped at 27.5% of the greater of remuneration or taxable income, max R430,000 per year (2026/27);
4. **Taxable income:** gross less allowable pre-tax deductions, with travel allowance included at its PAYE inclusion rate (80% default, 20% with logbook);
5. **PAYE:** annualise, apply the 2026/27 tax table, subtract age-based rebates and Medical Scheme Fees Tax Credits, de-annualise, floor at zero (details: `paye-compliance.md`);
6. **UIF:** 1% employee and 1% employer up to the R17,712 monthly ceiling (details: `uif-compliance.md`);
7. **SDL:** 1% employer cost where liable (details: `sdl-compliance.md`);
8. **Other deductions:** recurring deductions (garnishees, loans, medical aid contributions) as configured;
9. **Net pay:** gross less employee deductions;
10. **Employer cost:** gross plus employer UIF, SDL, and employer fund contributions.

## 2. Engineering Controls for Correctness

| Control | Detail |
|---|---|
| Decimal arithmetic | decimal.js with half-up rounding; binary floating point is never used for money |
| Single source of constants | All SARS constants live in one module (`src/lib/payroll/calculator.ts`), annotated with source and verification date |
| Automated tests | 200+ unit and integration tests, including PAYE at multiple salary points, rebate ages (under 65, 65+, 75+), MATC dependant counts, UIF ceiling boundary, SDL threshold behaviour, unpaid leave, and bi-weekly and weekly frequencies |
| Tripwire assertions | The under-65 tax threshold (R99,000 for 2026/27) is asserted in tests: any silent edit to a constant fails CI |
| CI gates | Lint, type-check, and full test suite must pass before any deployment |
| Change freeze | No deployments in the month-end window (24th to 1st) except critical fixes |
| Audit log | Every payroll run, approval, and publication is logged with actor and timestamp |

## 3. Annual SARS Update Procedure (every March)

1. Obtain the Budget tax tables (National Treasury Budget Tax Guide, sars.gov.za);
2. Update constants: brackets, rebates, MATC, s 11F cap, UIF ceiling if gazetted, SDL parameters if changed;
3. Update the expected values in the test suite, including the threshold tripwire;
4. Verify at least 5 salary points against the SARS tax calculator;
5. Deploy before the first March payroll run; notify customers via release notes;
6. Record the update in `docs/planning/CALCULATIONS.md`.

## 4. Independent Verification

- **Payroll Calculation Verification Report:** before commercial launch, and after each annual update, spot-checks at multiple salary points are compared with SARS eFiling calculator output and signed off by a registered tax practitioner [commission: ●]. The report is available to customers under NDA.
- Customers are encouraged to have their accountant verify the first payroll run in parallel with their previous system (parallel run), and NovaHR's onboarding checklist includes this step.

## 5. Auditing a Payroll Run (customer procedure)

1. Reports: open the payroll run summary; verify headcount and gross totals against expectations;
2. Sample-check one payslip per pay grade against an independent calculation (SARS calculator for PAYE; 1% rules for UIF);
3. Verify once-off items (overtime, bonuses, unpaid leave) against source records;
4. Check the audit log for unexpected changes between calculation and approval;
5. Approve the run; publication to employees is logged;
6. Export and archive the run report (SARS: 5-year retention).

## 6. Error Correction Policy

If a published payslip is found to be incorrect: the correction is made in a subsequent run or a corrected payslip is issued; published payslips are never silently edited; all corrections are visible in the audit log. Material calculation defects on NovaHR's side are disclosed to affected customers per the Incident Response Plan.
