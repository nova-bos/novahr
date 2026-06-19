# NovaHR: Calculation and Assumptions Reference

Living document. When SARS publishes new tables or you need to change any value, update this file and share it back. Every constant has a file path so the developer can locate and replace it directly.

**How to use this document:**
1. Read each section to understand what the app currently calculates.
2. The "Current value" column shows what is in the code today.
3. The "Correct for 2026/27?" column flags anything that needs verification or is known to be wrong.
4. When you have updated values, mark the row and share the file. The developer will apply them.

---

## 1. Payslip line item structure

Every monthly payslip is built in this order. Items only appear if they apply to the employee.

| # | Line item | Section | Always shown? | Source |
|---|---|---|---|---|
| 1 | Basic Salary | Earnings | Yes | annualGross / 12 |
| 2 | Travel Allowance | Earnings | Only if set on employee | Fixed monthly rand amount |
| 3 | Housing Allowance | Earnings | Only if set on employee | Fixed monthly rand amount |
| 4 | PAYE (Income Tax) | Deductions | Yes | Tax table calculation |
| 5 | UIF Contribution | Deductions | Yes | 1% of gross, capped |
| 6 | Pension Fund | Deductions | Only if pensionContributionPct is set | % of basic salary |
| 7 | Medical Aid | Deductions | Only if medicalAid amount is set | Fixed monthly rand amount |

**File:** `src/lib/payroll/calculator.ts` lines 39-68

---

## 2. Basic salary calculation

```
basicSalary = round(annualGross / 12, 2 decimal places)
```

- `annualGross` is the annual cost-to-company figure entered when adding or editing an employee.
- Division by 12 is always used regardless of pay frequency (see section 11 on pay frequency).
- Rounding: `Math.round(annualGross / 12 * 100) / 100` (standard half-up to 2 dp).

**File:** `src/lib/payroll/calculator.ts` line 37

---

## 3. Gross pay calculation

```
grossPay = basicSalary + travelAllowance + housingAllowance
```

Both allowances are optional monthly rand amounts stored on the employee record. If not set, they contribute zero and do not appear on the payslip.

**File:** `src/lib/payroll/calculator.ts` lines 39-48

---

## 4. Taxable income: what is included and what is excluded

```
annualTaxable = round(basicSalary * 12)
```

**What is included:** basic salary only, annualised.

**What is excluded:** travel allowance, housing allowance.

This is a simplification. The correct SARS treatment is:

| Allowance | Correct SARS treatment | Current app treatment |
|---|---|---|
| Travel allowance | 80% is taxable (20% exempt if business use is declared) | 0% taxable (fully excluded) |
| Housing allowance | 100% taxable as a fringe benefit | 0% taxable (fully excluded) |

**Impact:** employees with travel or housing allowances will have PAYE understated. This needs to be corrected before go-live for real clients.

**File:** `src/lib/payroll/calculator.ts` line 50

---

## 5. PAYE (income tax): tax brackets, rebates, and the monthly calculation

### Tax brackets in the code (labeled TAX_BRACKETS_2025)

| Bracket | Taxable income from | Taxable income to | Rate | Base tax on lower bound |
|---|---|---|---|---|
| 1 | R0 | R237,100 | 18% | R0 |
| 2 | R237,101 | R370,500 | 26% | R42,678 |
| 3 | R370,501 | R512,800 | 31% | R77,362 |
| 4 | R512,801 | R673,000 | 36% | R121,475 |
| 5 | R673,001 | R857,900 | 39% | R179,147 |
| 6 | R857,901 | R1,817,000 | 41% | R251,258 |
| 7 | R1,817,001 | No limit | 45% | R644,489 |

These match the SARS 2025/2026 tax year tables (1 March 2025 to 28 February 2026).

**Update required:** SARS publishes new brackets each year in the February budget. The 2026/2027 tables (effective 1 March 2026) are not yet in the code. Update these before processing any March 2026 payroll.

**File:** `src/lib/payroll/calculator.ts` lines 3-11

### Rebates

| Rebate | Current value in code | SARS 2025/2026 | Correct for 2026/27? |
|---|---|---|---|
| Primary rebate (all taxpayers) | R17,235 per year | R17,235 | Needs 2026/27 value from SARS |
| Secondary rebate (65+ years old) | Not implemented | R9,444 per year | Missing entirely |
| Tertiary rebate (75+ years old) | Not implemented | R3,145 per year | Missing entirely |

**Impact of missing secondary/tertiary rebates:** employees aged 65+ or 75+ will have PAYE overstated. This is a gap to address if you employ older workers.

**File:** `src/lib/payroll/calculator.ts` line 13

### Monthly PAYE calculation

```
annualPaye = base + (annualTaxable - lowerBound) x rate - primaryRebate
monthlyPaye = round(annualPaye / 12, 2 decimal places)
```

The function finds the correct bracket, computes the annual tax, subtracts the primary rebate, then divides by 12 for the monthly deduction. It floors at zero (no negative PAYE).

**File:** `src/lib/payroll/calculator.ts` lines 17-22, 51

### When to update tax tables

| Event | Action required |
|---|---|
| February budget speech (annually, usually last Wednesday of February) | SARS publishes new brackets and rebates effective 1 March. Update `TAX_BRACKETS_2025` (rename the constant to `TAX_BRACKETS_YYYY`) and `PRIMARY_REBATE_ANNUAL` in `calculator.ts` before the first payroll run of the new tax year. |
| March payroll run | First payroll using the new tables. Verify one employee manually before completing the run. |

---

## 6. UIF (Unemployment Insurance Fund)

### Constants

| Constant | Current value in code | Correct for 2026? | File and line |
|---|---|---|---|
| Employee UIF rate | 1% (0.01) | Yes, confirmed by UIF Act | `calculator.ts` line 14 |
| Monthly earnings ceiling | R17,712/month | Verify: updated annually by UIF | Used to derive the cap below |
| Monthly UIF cap | R177.12 | Correct if ceiling is R17,712 | `calculator.ts` line 15 |
| Employer UIF rate | 1% | Not calculated in the app | See gap below |

### Calculation

```
employeeUIF = round(min(grossPay x 0.01, 177.12), 2 decimal places)
```

- Applied to gross pay (basic salary + allowances), not just basic salary.
- If gross pay exceeds R17,712/month the contribution is capped at R177.12.
- The employer's matching 1% contribution is not calculated or shown anywhere in the app.

### Gaps

- Employer UIF (matching 1%) is not calculated. Your payroll summary will not show the employer's total UIF liability.
- The UIF earnings ceiling is updated by the Department of Employment annually. Verify the R17,712 figure against the latest Government Gazette before each tax year.

**File:** `src/lib/payroll/calculator.ts` lines 14-15, 52

---

## 7. SDL (Skills Development Levy)

| Item | Status |
|---|---|
| SDL rate | 1% of total remuneration (SETA Act) |
| SDL threshold | Companies with annual payroll under R500,000 are exempt |
| `sdlEnabled` config field | Exists in `payrollConfigs` (set to `true` for all 3 demo tenants) |
| SDL calculation in code | NOT IMPLEMENTED. No SDL amount is computed anywhere. |
| SDL on payslip | Does not appear |

**This is a gap.** If your clients' annual payroll exceeds R500,000 they are legally required to pay SDL to SARS. The config flag exists but has no effect.

**To implement:** add `const sdl = Math.round(grossPay * 0.01 * 100) / 100` in `calculateMonthlyPayroll`, add it to the deductions array, and surface it on the payslip. It is an employer cost, not an employee deduction, so whether to show it on the payslip is a business decision.

**File:** `src/lib/config/payroll.ts` lines 8, 20, 30, 40 (`sdlEnabled` field; `sdlReferenceNumber` also stored here)

---

## 8. Pension fund contribution

### Calculation

```
employeePension = round(basicSalary x pensionContributionPct, 2 decimal places)
```

- `pensionContributionPct` is stored as a decimal: `0.075` means 7.5%.
- Calculated on basic salary only, not on gross pay (allowances are excluded).
- Default for all demo tenants: 7.5%.
- If the field is not set on the employee, no pension deduction appears.

### Employer contribution

Not calculated. The employer's matching or top-up contribution is not shown on the payslip or in the payroll run totals.

### Tax deductibility

SARS allows pension contributions up to 27.5% of taxable income (capped at R350,000/year) as a deduction from taxable income. The app does not apply this deduction, so PAYE may be slightly overstated for employees with pension contributions.

**File:** `src/lib/payroll/calculator.ts` lines 59-61

| Config | Current value | Where set |
|---|---|---|
| Default pension % (all tenants) | 7.5% | `src/lib/config/payroll.ts` line 21 |
| Per-employee pension % | Set per employee in the compensation step | `Employee.salary.pensionContributionPct` |

---

## 9. Medical aid deduction

```
medicalAidDeduction = employee.salary.medicalAid (fixed monthly rand amount)
```

- Flat monthly rand amount per employee. No calculation is applied.
- If not set on the employee, it does not appear on the payslip.
- The employer's medical aid subsidy (if any) is not calculated or shown.
- SARS Medical Tax Credits (MTC): not applied. For 2025/2026, the MTC is R364/month for the main member, R364 for the first dependant, and R246 for each additional dependant. These reduce PAYE directly. The app does not reduce PAYE by MTC.

**Impact of missing MTC:** employees with medical aid will have PAYE overstated.

**File:** `src/lib/payroll/calculator.ts` lines 64-66

---

## 10. Net pay calculation and rounding

```
totalDeductions = PAYE + UIF + pension (if set) + medicalAid (if set)
netPay = round(grossPay - totalDeductions, 2 decimal places)
```

All intermediate amounts are rounded to 2 decimal places before summing. The final net pay is rounded again. There should be no floating-point drift beyond 1 cent in practice.

**File:** `src/lib/payroll/calculator.ts` lines 68-79

---

## 11. Leave entitlements

### Current leave policy (global, applies to all tenants)

| Leave type | Days per year in code | BCEA minimum | Gap? | File and line |
|---|---|---|---|---|
| Annual leave | 18 days | 15 working days | Above minimum, intentional | `config/leave.ts` line 5 |
| Sick leave | 10 days | 30 days per 36-month cycle | See note below | `config/leave.ts` line 13 |
| Family responsibility | 3 days | 3 days | Correct | `config/leave.ts` line 20 |
| Unpaid leave | 5 days | No minimum (discretionary) | Discretionary policy | `config/leave.ts` line 27 |

### Important note on sick leave

The BCEA grants 30 sick days in every 36-month (3-year) cycle, not 10 days per year. The app treats sick leave as 10 days per calendar year, which is non-compliant. Options:

1. Change to 30 days and reset every 3 years rather than every year (requires tracking cycle start date per employee).
2. Keep 10 days/year as a simplification and note it in your employment contracts as a company policy that differs from the BCEA minimum (the BCEA allows more generous policies but not less generous ones for annual leave; sick leave works on a cycle and the 10/year interpretation is defensible only if the 36-month running total stays at or above 30).

**File to update:** `src/lib/config/leave.ts` (annualDays value for each leave type)

---

## 12. Leave balance: how days are deducted

When a leave request is approved, the `LeaveBalance.used` count for that employee and leave type is incremented by the `days` field on the `LeaveRequest`.

- `days` is entered manually by the employee when submitting the request. It is not calculated from the start and end dates against a calendar or public holiday list.
- No public holiday exclusion is applied.
- No half-day logic exists.
- `LeaveBalance.total` is set when the employee record is created and does not auto-reset at the start of a new leave year.

**File:** `src/lib/leave/actions.ts` (decideLeaveRequestRecord, the leaveBalance.update call)

---

## 13. Unpaid leave: effect on pay

**Currently: none.** Unpaid leave is tracked (a `LeaveBalance` entry exists, days are deducted on approval) but taking unpaid leave does not reduce the employee's net pay on their payslip. The payroll calculator has no knowledge of approved unpaid leave requests for a given month.

The correct deduction would be:

```
dailyRate = basicSalary / workingDaysInMonth (typically 21.67 on average, or exact count)
unpaidDeduction = dailyRate x unpaidLeaveDaysApprovedThisMonth
```

This is not implemented. Employees who take unpaid leave in a month will receive full pay.

---

## 14. Pay frequency: what is stored vs what is calculated

| Frequency option | Stored on employee | Affects payroll calculation |
|---|---|---|
| Monthly | Yes | Yes, this is the only supported frequency |
| Bi-weekly | Yes (can be selected in forms) | No, calculator always divides annualGross / 12 |
| Weekly | Yes (can be selected in forms) | No, calculator always divides annualGross / 12 |

**Gap:** employees set to bi-weekly or weekly pay still receive monthly payslips calculated as annualGross / 12. If you onboard clients with weekly or bi-weekly payroll, this must be implemented before they run their first payroll.

The correct divisors would be `annualGross / 26` (bi-weekly) and `annualGross / 52` (weekly), along with corresponding UIF cap proration.

---

## 15. Tax year dates: annual update checklist

| Date | Action |
|---|---|
| February budget speech (last week of February each year) | SARS announces new brackets, rebates, UIF ceiling, and MTC rates. Gather the new values from the SARS website or official budget documents. |
| By 1 March (start of new tax year) | Update `TAX_BRACKETS_2025` (and rename the constant), `PRIMARY_REBATE_ANNUAL`, and `UIF_MONTHLY_CAP` in `src/lib/payroll/calculator.ts`. Update `taxYear` string in `src/lib/config/payroll.ts`. |
| Before first payroll run of the new tax year | Do a manual check: pick one employee at a known salary, compute expected PAYE by hand using the SARS calculator at sarsefiling.co.za, and compare to the app output. |

### Values to update each March

| Value | File | Line | Current (2025/2026) | Updated to (fill in) |
|---|---|---|---|---|
| Tax bracket 1 threshold | `src/lib/payroll/calculator.ts` | 4 | R237,100 | |
| Tax bracket 2 threshold | `src/lib/payroll/calculator.ts` | 5 | R370,500 | |
| Tax bracket 3 threshold | `src/lib/payroll/calculator.ts` | 6 | R512,800 | |
| Tax bracket 4 threshold | `src/lib/payroll/calculator.ts` | 7 | R673,000 | |
| Tax bracket 5 threshold | `src/lib/payroll/calculator.ts` | 8 | R857,900 | |
| Tax bracket 6 threshold | `src/lib/payroll/calculator.ts` | 9 | R1,817,000 | |
| Bracket 2 base tax | `src/lib/payroll/calculator.ts` | 5 | R42,678 | |
| Bracket 3 base tax | `src/lib/payroll/calculator.ts` | 6 | R77,362 | |
| Bracket 4 base tax | `src/lib/payroll/calculator.ts` | 7 | R121,475 | |
| Bracket 5 base tax | `src/lib/payroll/calculator.ts` | 8 | R179,147 | |
| Bracket 6 base tax | `src/lib/payroll/calculator.ts` | 9 | R251,258 | |
| Bracket 7 base tax | `src/lib/payroll/calculator.ts` | 10 | R644,489 | |
| Primary rebate | `src/lib/payroll/calculator.ts` | 13 | R17,235 | |
| UIF monthly cap | `src/lib/payroll/calculator.ts` | 15 | R177.12 | |
| Tax year label | `src/lib/config/payroll.ts` | 18 (and lines 28, 38) | "2025/2026" | |

---

## 16. Known gaps and inaccuracies (priority order)

These need to be resolved before the app can be used for real payroll. The higher the row, the more legally significant the gap.

| # | Gap | Legal risk | Effort to fix |
|---|---|---|---|
| 1 | SDL not calculated despite sdlEnabled=true | High: mandatory for payroll over R500k/year | Low: one line of calculation, add to deductions |
| 2 | Taxable income excludes travel and housing allowances entirely | High: understates PAYE for employees with allowances | Medium: apply 80% rule for travel, 100% for housing |
| 3 | Sick leave is 10 days/year instead of 30 days/36 months (BCEA non-compliance) | High: employees are contractually entitled to more | Medium: requires per-employee cycle tracking |
| 4 | Secondary rebate (65+) and tertiary rebate (75+) not applied | Medium: overstates PAYE for older employees | Low: add age check using employee.idNumber birth digits |
| 5 | Medical Tax Credits (MTC) not deducted from PAYE | Medium: overstates PAYE for employees with medical aid | Low: add MTC reduction step in annualPaye() |
| 6 | Pension contribution not deducted from taxable income before PAYE | Medium: slightly overstates PAYE for pension members | Medium: reduce annualTaxable by qualifying pension amount |
| 7 | Unpaid leave does not reduce pay | Medium: employees get paid for unpaid leave | Medium: requires payroll to check approved leave for the period |
| 8 | Employer UIF (1%) not calculated or shown in payroll totals | Low: employer liability is not surfaced | Low: calculate in completePayrollRunRecord |
| 9 | Bi-weekly and weekly pay frequencies not implemented | Low: no clients use them yet | Medium: requires divisor change and period handling |
| 10 | Leave days not calculated from calendar dates | Low: relies on employee self-reporting | Medium: requires calendar + public holiday lookup |
| 11 | Leave balances do not auto-reset annually | Low: HR must reset manually if this feature is needed | Medium: requires a scheduled job |
| 12 | 2026/2027 SARS tax tables not yet applied | High from 1 March 2026 onwards | Low: update 13 constants when SARS publishes them |

---

## 17. How to apply updated values

When you have verified or updated any value in this document, share the file. The developer will:

1. Open `src/lib/payroll/calculator.ts` and replace the relevant constant.
2. Run `npm test` to confirm no calculator tests break.
3. Do a manual spot-check (one employee, known salary, verify PAYE against SARS eFiling tax calculator).
4. Commit and deploy.

For leave policy changes, the developer will update `src/lib/config/leave.ts` and check that existing `LeaveBalance` records in the database are also updated to match (the config drives new employees; existing employees have their totals stored in the `LeaveBalance` table).
