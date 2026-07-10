# NovaHR UIF Compliance Documentation

**Version:** 1.0
**Tax year:** 2026/27
**Review:** Annually and on any change to the UIF earnings ceiling
**Audience:** Customers, auditors, internal reference

> **Disclaimer:** Not tax or legal advice. The employer remains responsible for UIF registration, declarations, and payment. See `compliance-disclaimer-and-customer-responsibilities.md`.

---

## 1. Legal Basis

- **Unemployment Insurance Act 63 of 2001:** establishes the fund and benefits;
- **Unemployment Insurance Contributions Act 4 of 2002:** requires contributions of **1% of remuneration by the employee** (deducted from pay) and **1% by the employer**, paid monthly.

Contributions are paid to SARS with the EMP201 (where the employer is registered for PAYE or SDL) or directly to the UIF. Employers must also submit monthly **UI-19 declarations** to the Department of Employment and Labour (or via uFiling).

## 2. How NovaHR Calculates UIF

- Employee contribution: 1% of UIF remuneration for the period;
- Employer contribution: 1% (employer cost; not deducted from the employee);
- **Earnings ceiling:** remuneration above **R17,712 per month** is excluded, capping each contribution at **R177.12 per month** (2026/27 ceiling; the engine stores this as a configurable statutory default);
- The employee contribution appears as a deduction line on the payslip; the employer contribution appears in employer cost reporting;
- UIF can be disabled per tenant for the rare categories of exempt employment.

## 3. Exclusions

Certain workers are excluded from contributions under the Contributions Act, including employees working less than 24 hours a month for an employer and learners under specific learnership agreements. The employer is responsible for flagging exempt employees; NovaHR applies UIF by default.

## 4. What NovaHR Provides vs What the Employer Must Do

| NovaHR provides | Employer must do |
|---|---|
| Correct monthly contribution amounts per employee | Register with the UIF (and SARS where applicable) |
| Payslip disclosure of employee contribution | Pay contributions by the 7th of the following month (EMP201) |
| Reports totalling UIF per period | Submit monthly UI-19 / uFiling declarations |
| | Issue records on termination for benefit claims |

## 5. Employer Checklist

- [ ] UIF reference number captured in Company Settings;
- [ ] All qualifying employees active in payroll;
- [ ] Exempt employees identified and configured;
- [ ] Monthly payment by the 7th;
- [ ] Monthly UI-19 declarations submitted;
- [ ] Ceiling updated in NovaHR settings when the Minister gazettes a new ceiling (NovaHR ships updated defaults; verify after each gazette).
