# NovaHR BCEA and Leave Compliance Documentation

**Version:** 1.0
**Review:** Annually and on any BCEA amendment or new sectoral determination affecting customers
**Audience:** Customers, auditors, internal reference

> **Disclaimer:** Not legal advice. Employment terms more generous than the BCEA (contracts, bargaining council agreements, sectoral determinations) override these minimums, and the employer must configure NovaHR accordingly. See `compliance-disclaimer-and-customer-responsibilities.md`.

---

## 1. Legal Basis

The Basic Conditions of Employment Act 75 of 1997 ("BCEA") sets minimum employment conditions: leave (Chapter 3), working time (Chapter 2), pay statements (s 33), and record-keeping (s 31: records kept for 3 years).

## 2. Leave Minimums and NovaHR Defaults

| Leave type | BCEA minimum | NovaHR default |
|---|---|---|
| **Annual leave** (s 20) | 21 consecutive days per annual leave cycle (equivalent to 15 working days for a 5-day week; 18 for a 6-day week); or by agreement 1 day per 17 days worked, or 1 hour per 17 hours worked | 15 working days per cycle, accrued monthly (1.25 days per month); configurable per company |
| **Sick leave** (ss 22-24) | 36-month cycle: number of days the employee would normally work in 6 weeks (30 days for a 5-day week). First 6 months: 1 day per 26 days worked | 30 days per 36-month cycle; first-6-months accrual rule applied; medical certificate flag for absences over 2 consecutive days or frequent absences (s 23) |
| **Family responsibility leave** (s 27) | 3 days per annual cycle, for employees employed longer than 4 months and working at least 4 days a week; for child birth/illness or death of specified family | 3 days per cycle, non-cumulative, reset annually |
| **Maternity leave** (s 25) | 4 consecutive months; unpaid unless agreed (UIF maternity benefits claimable) | 4 months tracked as a leave type; pay treatment configurable |
| **Parental leave** (s 25A) | 10 consecutive days | 10 days tracked |
| **Adoption / commissioning parental leave** (ss 25B-25C) | 10 weeks / 10 days respectively | Tracked as configured leave types |

Notes:

- Annual leave must be granted within 6 months after the end of the leave cycle (s 20(4));
- Pay on termination must include accrued untaken annual leave (s 40(b)); NovaHR surfaces the accrued balance for the final payslip;
- Employers may not pay employees instead of granting annual leave except on termination (s 20(11)).

## 3. Unpaid Leave

Unpaid leave days reduce remuneration proportionately. NovaHR calculates the per-day rate from the employee's remuneration and pay frequency and deducts unpaid days in the payroll run (method documented in `docs/planning/CALCULATIONS.md`), with the deduction disclosed on the payslip.

## 4. Payslip Requirements (BCEA s 33)

NovaHR payslips include the required particulars: employer name and address, employee name and occupation, period of payment, remuneration in money, deductions and their purposes, and net amount, plus overtime and rates where applicable.

## 5. Record-Keeping (BCEA s 31)

Employers must keep for **3 years**: employee name and occupation, time worked, remuneration paid, and other prescribed records. NovaHR retains leave, attendance, and payroll records beyond this minimum (see the Data Retention Policy) and provides exports; the employer must export records before account closure.

## 6. Configuration Responsibilities

The employer must:

- Configure leave policies at least as generous as the BCEA or any applicable bargaining council agreement or sectoral determination;
- Set each employee's working pattern (5-day vs 6-day week) so day-equivalents are correct;
- Apply sector rules (e.g. domestic workers, hospitality) where they exceed BCEA minimums;
- Ensure employment contracts align with the configured policies.

## 7. Employer Checklist

- [ ] Leave policies configured and at least BCEA-compliant;
- [ ] Working patterns set per employee;
- [ ] Leave cycles and accruals verified for a sample employee;
- [ ] Sick leave 36-month cycles anchored to each employee's start date;
- [ ] Termination payouts include accrued annual leave;
- [ ] Records exported and retained for 3+ years on any system exit.
