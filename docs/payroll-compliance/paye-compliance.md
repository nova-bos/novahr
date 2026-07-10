# NovaHR PAYE Compliance Documentation

**Version:** 1.0
**Tax year:** 2026/27 (1 March 2026 to 28 February 2027)
**Review:** Every March after the National Budget, and on any SARS mid-year change
**Audience:** Customers (HR administrators), auditors, and internal reference

> **Disclaimer:** This document explains how NovaHR calculates Pay-As-You-Earn (PAYE). It is not tax advice. The employer remains responsible for the correctness of submissions to SARS. See `compliance-disclaimer-and-customer-responsibilities.md`.

---

## 1. Legal Basis

PAYE is governed by the Fourth Schedule to the Income Tax Act 58 of 1962. Employers must deduct employees' tax from remuneration and pay it to SARS monthly (EMP201, by the 7th of the following month), reconcile bi-annually (EMP501), and issue IRP5/IT3(a) certificates.

## 2. How NovaHR Calculates PAYE

NovaHR annualises the employee's taxable remuneration for the pay period, applies the annual tax table, subtracts rebates and medical tax credits, then de-annualises to the period.

### 2.1 Taxable remuneration

Per period, taxable remuneration includes:

- Basic salary;
- Housing allowance: 100% taxable;
- Travel allowance: 80% included in remuneration for PAYE by default (20% inclusion where the employer is satisfied at least 80% of use is business, per SARS practice; configured per employee);
- Other taxable allowances and recurring earnings as configured.

Less allowable deductions before tax:

- Retirement fund contributions under section 11F, capped at the lesser of **27.5% of the greater of remuneration or taxable income** and **R430,000 per year** (2026/27).

### 2.2 Tax table applied (2026/27, annual taxable income)

| Taxable income (R) | Rate |
|---|---|
| 0 to 245,100 | 18% of each R1 |
| 245,101 to 383,100 | R44,118 + 26% above 245,100 |
| 383,101 to 530,200 | R79,998 + 31% above 383,100 |
| 530,201 to 695,800 | R125,599 + 36% above 530,200 |
| 695,801 to 887,000 | R185,215 + 39% above 695,800 |
| 887,001 to 1,878,600 | R259,783 + 41% above 887,000 |
| 1,878,601 and above | R666,339 + 45% above 1,878,600 |

### 2.3 Rebates (2026/27, annual)

| Rebate | Amount | Applies |
|---|---|---|
| Primary | R17,820 | All natural persons |
| Secondary | R9,765 | Age 65 and older (additional) |
| Tertiary | R3,249 | Age 75 and older (additional) |

Age is determined from the employee's date of birth. The implied tax threshold for under-65s is R99,000, which NovaHR asserts in its automated tests as a tripwire against constant errors.

### 2.4 Medical Scheme Fees Tax Credit (section 6A, 2026/27, monthly)

| Beneficiary | Credit |
|---|---|
| Main member | R376 |
| First dependant | R376 |
| Each additional dependant | R254 |

Applied as a credit against PAYE (not a deduction from income), based on the dependant count configured on the employee record.

### 2.5 Pay frequencies

Annualisation divisors: monthly 12, bi-weekly 26, weekly 52. PAYE cannot be negative; it floors at zero.

### 2.6 Precision

All calculations use decimal arithmetic (decimal.js) with half-up rounding, never binary floating point, to avoid cent-level drift.

## 3. Source Verification

Constants were verified line by line against the National Treasury Budget 2026 Tax Guide and sars.gov.za (rates of tax for individuals) on 2026-07-04. The engine's constants live in `src/lib/payroll/calculator.ts`, with the annual update checklist in `docs/planning/CALCULATIONS.md`.

## 4. What NovaHR Does Not Do (customer responsibilities)

- Submit EMP201 or EMP501 to SARS (NovaHR provides the figures; the employer or their practitioner files);
- Generate IRP5 certificates [roadmap item ●];
- Handle directives (fixed-rate tax directives from SARS) unless captured manually;
- Advise on the tax treatment of unusual remuneration structures.

## 5. Employer Checklist

- [ ] Company PAYE reference number captured in Company Settings;
- [ ] Each employee's income tax number captured;
- [ ] Travel allowance inclusion rate set correctly per employee (80% default, 20% with logbook substantiation);
- [ ] Medical aid dependant counts current;
- [ ] Pension percentages current;
- [ ] EMP201 filed and paid by the 7th of each month;
- [ ] EMP501 reconciliations filed (interim: October window; annual: May window, per SARS notice each year).
