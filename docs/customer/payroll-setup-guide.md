# NovaHR Payroll Setup Guide

**Audience:** HR Administrators preparing for their first payroll run
**Purpose:** Collect and verify everything needed before the first run, so payslips are right the first time.

---

## 1. Company-Level Information

| Item | Where to find it | Where it goes in NovaHR |
|---|---|---|
| PAYE reference number (7 + 3 digits starting with 7) | SARS eFiling / EMP registration | Settings, Payroll |
| UIF reference number | Department of Employment and Labour / uFiling | Settings, Payroll |
| SDL reference number | SARS (if liable) | Settings, Payroll |
| SDL liability | Annual payroll above R500,000? | Settings, Payroll (toggle) |
| Pay frequency | Your practice (monthly, bi-weekly, weekly) | Settings, Payroll |
| Pay day | Your practice (e.g. 25th) | Settings, Payroll |
| Company bank account | Your bank | Settings, Company |

## 2. Per-Employee Information

Collect for **every** employee before capture:

### Identity
- Full names and surname (as per ID);
- SA ID number or passport number;
- Date of birth (**drives age-based tax rebates; must be correct**);
- Contact details (email for payslip delivery and self-service).

### Employment
- Position and department;
- Start date (drives leave accrual and first-6-months sick leave rule);
- Working pattern (5-day or 6-day week; drives daily rates and leave equivalents).

### Tax
- Income tax number (10 digits; employees can get theirs from SARS);
- Any SARS tax directive (fixed rate) if applicable.

### Remuneration
- Basic salary (per pay period);
- Housing allowance (fully taxable);
- Travel allowance and its PAYE inclusion rate: 80% standard; 20% only if you are satisfied at least 80% of use is business (logbook);
- Other allowances and recurring earnings;
- Overtime eligibility and agreed rates.

### Deductions and Fringe
- Pension/provident fund percentage or amount (employee and employer portions);
- Medical aid: monthly contribution and the **number of dependants** (drives Medical Scheme Fees Tax Credit: R376 main member, R376 first dependant, R254 each additional, 2026/27);
- Garnishee orders or other recurring deductions.

### Banking
- Bank, branch code, account number, account type (verify against a bank letter or statement; payroll fraud usually starts with a bank-detail change).

### Leave
- Opening balances at cut-over: annual, sick (with cycle anchor), family responsibility.

## 3. Verification Before First Run

- [ ] Every employee's DOB and ID number cross-checked against ID documents;
- [ ] Dependant counts confirmed against medical aid certificates;
- [ ] Pension percentages confirmed against fund statements;
- [ ] Banking details verified against bank confirmations;
- [ ] One calculated payslip per pay grade checked against your previous system or the SARS calculator;
- [ ] Your accountant has reviewed a sample payslip.

## 4. Cut-Over Rules

- Do the first NovaHR run **in parallel** with your old system for one period; reconcile to the cent before switching;
- Keep your previous payroll history accessible: SARS requires 5 years of records, and history does not migrate automatically;
- Mid-tax-year cut-over: year-to-date figures from your old system are needed for accurate annual reconciliation (EMP501/IRP5); export YTD reports from the old system as at cut-over [YTD import: see roadmap ●].

## 5. Ongoing Monthly Rhythm

1. Before the run: process joiners, leavers, salary changes, once-off items, unpaid leave;
2. Run and review; sample-check anything unusual;
3. Approve and publish; pay employees;
4. By the 7th of the next month: EMP201 filed and paid, UI-19 submitted;
5. Archive the run report.
