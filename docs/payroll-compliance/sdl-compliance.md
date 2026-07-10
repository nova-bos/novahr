# NovaHR SDL Compliance Documentation

**Version:** 1.0
**Tax year:** 2026/27
**Review:** Annually
**Audience:** Customers, auditors, internal reference

> **Disclaimer:** Not tax advice. The employer remains responsible for SDL registration and payment. See `compliance-disclaimer-and-customer-responsibilities.md`.

---

## 1. Legal Basis

The Skills Development Levies Act 9 of 1999 imposes a levy of **1% of the leviable amount (total remuneration)** on employers, payable monthly to SARS via the EMP201.

## 2. Who Pays SDL

- Employers whose total annual remuneration (leviable amount) exceeds **R500,000** are liable;
- Employers at or below R500,000 per year are **exempt** (s 4(b)), along with certain public entities;
- SDL is an **employer cost only**: it is never deducted from employees.

## 3. How NovaHR Handles SDL

- Tenant-level toggle: SDL enabled or disabled per company, reflecting the employer's liability status;
- Per-employee flag for SDL-liable remuneration;
- Calculates 1% of leviable remuneration per period as an employer cost;
- SDL appears in employer cost reports, not on the employee's deduction lines;
- The R500,000 threshold assessment is the employer's responsibility: NovaHR shows the setting and explains the threshold in-app, but the employer must determine and configure liability.

## 4. Interaction with Skills Funding

SDL funds SETAs and the National Skills Fund. Employers who pay SDL and submit Workplace Skills Plans / Annual Training Reports to their SETA may claim mandatory grants back. This is outside NovaHR's scope but relevant to customers asking why they pay it.

## 5. Employer Checklist

- [ ] Annual payroll assessed against the R500,000 threshold (include expected 12-month remuneration);
- [ ] SDL registration with SARS where liable;
- [ ] SDL reference number captured in Company Settings;
- [ ] SDL toggle in NovaHR matches actual liability;
- [ ] Monthly payment via EMP201 by the 7th;
- [ ] Threshold re-assessed each year and when headcount changes materially.
