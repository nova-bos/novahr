# NovaHR: Calculation and Assumptions Reference

Living document. When SARS publishes new tables or you need to change any value, update this file and share it back. Every constant has a file path so the developer can locate and replace it directly.

**How to use this document:**
1. Read each section to understand what the app currently calculates.
2. The "Current value" column shows what is in the code today.
3. The "Correct for 2026/27?" column flags anything that needs verification or is known to be wrong.
4. When you have updated values, mark the row and share the file. The developer will apply them.

**Decimal precision note:** All calculations use `decimal.js` with `ROUND_HALF_UP` rounding. There is no floating-point drift. Every intermediate value is rounded to 2 decimal places before being used in the next step.

---

## 1. Payslip line item structure

Every monthly payslip is built in this order. Items only appear if they apply to the employee.

| # | Line item | Section | Always shown? | Source |
|---|---|---|---|---|
| 1 | Basic Salary | Earnings | Yes | annualGross / divisor |
| 2 | Travel Allowance | Earnings | Only if set on employee | Fixed monthly rand amount |
| 3 | Housing Allowance | Earnings | Only if set on employee | Fixed monthly rand amount |
| 4 | PAYE (Income Tax) | Deductions | Yes | Tax table calculation |
| 5 | UIF Contribution | Deductions | Yes | 1% of adjusted gross, capped |
| 6 | Unpaid Leave | Deductions | Only if unpaid leave taken this period | Daily rate x unpaid days |
| 7 | Pension Fund | Deductions | Only if pensionContributionPct is set | % of basic salary |
| 8 | Medical Aid | Deductions | Only if medicalAid amount is set | Fixed monthly rand amount |

SDL is an employer cost and does not appear in the employee deductions. It is returned separately in the payroll breakdown for use in the EMP201 submission.

**File:** `src/lib/payroll/calculator.ts` lines 93-105

---

## 2. Basic salary and pay frequency

```
divisors = { monthly: 12, biweekly: 26, weekly: 52 }
basicSalary = Decimal(annualGross).dividedBy(divisor).toDecimalPlaces(2)
```

| Pay frequency | Divisor | UIF cap per run |
|---|---|---|
| Monthly | 12 | R177.12 |
| Bi-weekly | 26 | R81.75 (= 177.12 x 12 / 26) |
| Weekly | 52 | R40.88 (= 177.12 x 12 / 52) |

All three pay frequencies are now fully supported. PAYE is always calculated on the annualised taxable income and then divided by the divisor for the per-run amount.

**File:** `src/lib/payroll/calculator.ts` lines 26, 79-80

---

## 3. Gross pay calculation

```
grossPay = basicSalary + travelAllowance + housingAllowance
```

Both allowances are optional monthly rand amounts stored on the employee record. Gross pay is the contractual amount before any deductions including unpaid leave.

**File:** `src/lib/payroll/calculator.ts` lines 82-90

---

## 4. Taxable income: what is included and what is excluded

The adjusted gross (after unpaid leave deduction) is used as the base for all tax calculations. Taxable income adds the correct inclusion fractions for each component and then subtracts the pension s11F deduction.

```
travelInclusion   = hasLogbook ? 0.20 : 0.80
travelTaxable     = travelAllowance x travelInclusion
housingTaxable    = housingAllowance                    (100% taxable)
adjustedBasic     = basicSalary - unpaidLeaveDeduction
annualRemuneration = (adjustedBasic + travelTaxable + housingTaxable) x divisor
annualTaxable      = annualRemuneration - pensionS11fDeduction
```

| Component | Inclusion in taxable income | Basis |
|---|---|---|
| Basic salary | 100% | Remuneration |
| Travel allowance | 80% (or 20% with approved logbook) | SARS Budget 2026 Tax Guide |
| Housing allowance | 100% | Fixed cash subsidy: fully taxable |
| Pension contribution | Deducted before PAYE (see section 9) | Income Tax Act s11F |

**New field required:** `SalaryInfo.hasLogbook?: boolean` controls travel inclusion. Defaults to false (80%).

**File:** `src/lib/payroll/calculator.ts` lines 92-107

---

## 5. PAYE: tax brackets, rebates, MATC, and monthly calculation

### Tax brackets -- 2026/27 (1 March 2026 to 28 February 2027)

Source: National Treasury Budget 2026 Tax Guide. Constant name: `TAX_BRACKETS_2026_27` in `calculator.ts`.

| Bracket | Taxable income from | Taxable income to | Rate | Base tax on lower bound |
|---|---|---|---|---|
| 1 | R1 | R245,100 | 18% | R0 |
| 2 | R245,101 | R383,100 | 26% | R44,118 |
| 3 | R383,101 | R530,200 | 31% | R79,998 |
| 4 | R530,201 | R695,800 | 36% | R125,599 |
| 5 | R695,801 | R887,000 | 39% | R185,215 |
| 6 | R887,001 | R1,878,600 | 41% | R259,783 |
| 7 | R1,878,601 | No limit | 45% | R666,339 |

Each bracket object also stores `prevUpTo` to eliminate index-based lookups and off-by-one risk.

**File:** `src/lib/payroll/calculator.ts` lines 11-19

### Rebates -- 2026/27

| Constant | Value | Applies to | File / line |
|---|---|---|---|
| `PRIMARY_REBATE_ANNUAL` | R17,820 | All individual taxpayers | `calculator.ts` line 21 |
| `SECONDARY_REBATE_ANNUAL` | R9,765 | Employees aged 65 and older | `calculator.ts` line 22 |
| `TERTIARY_REBATE_ANNUAL` | R3,249 | Employees aged 75 and older | `calculator.ts` line 23 |

Age is determined from `Employee.dateOfBirth` (ISO date string, optional). If not set, only the primary rebate applies.

**File:** `src/lib/payroll/calculator.ts` lines 21-23, 35-43

### Tax thresholds (income below which PAYE is zero)

| Age group | Annual threshold |
|---|---|
| Under 65 | R99,000 |
| 65 to below 75 | R153,250 |
| 75 and above | R171,300 |

These are implicit in the bracket + rebate calculation. PAYE is floored at zero.

### Medical Aid Tax Credit (s6A) -- 2026/27

Credits reduce the PAYE liability after bracket tax is computed. They are not deducted from gross pay.

| Constant | Value per month | Beneficiary |
|---|---|---|
| `MATC_MAIN` | R376 | Main member (taxpayer) |
| `MATC_FIRST` | R376 | First dependant |
| `MATC_EXTRA` | R254 | Each additional dependant beyond the first |

**New field required:** `SalaryInfo.medicalAidDependants?: number` (0 = member only, 1 = member + 1 dependant, etc.). If not set, MATC is not applied.

```
matcAnnual = monthlyMatc(medicalAidDependants) x 12
annualPAYE = max(bracketTax - totalRebate - matcAnnual, 0)
monthlyPAYE = annualPAYE / divisor
```

**File:** `src/lib/payroll/calculator.ts` lines 25-27, 45-52, 109-113

### Monthly PAYE calculation

```
bracket = TAX_BRACKETS_2026_27.find(b => annualTaxable <= b.upTo)
bracketTax = bracket.base + (annualTaxable - bracket.prevUpTo) x bracket.rate
annualPAYE = max(bracketTax - totalRebate(dateOfBirth) - matcAnnual, 0)
monthlyPAYE = Decimal(annualPAYE).dividedBy(divisor).toDecimalPlaces(2)
```

**File:** `src/lib/payroll/calculator.ts` lines 55-61, 109-113

---

## 6. UIF (Unemployment Insurance Fund)

| Constant | Value | Correct for 2026/27? | File / line |
|---|---|---|---|
| `UIF_RATE` | 1% (0.01) | Yes | `calculator.ts` line 29 |
| `UIF_BASE_CAP` | R177.12/month | Verify annually | `calculator.ts` line 30 |
| Employer rate | 1% (same as employee) | Yes | Same constant used |
| UIF earnings ceiling | R17,712/month | Verify annually | Derived: 177.12 / 0.01 |

```
uifCap = UIF_BASE_CAP x 12 / divisor     (scales with pay frequency)
uif    = Decimal.min(adjustedGross x 0.01, uifCap).toDecimalPlaces(2)
```

Both employee and employer UIF are calculated (employer matches employee exactly). Employer UIF is returned in the breakdown as `employerUif` but does not appear on the employee payslip.

**File:** `src/lib/payroll/calculator.ts` lines 29-30, 115-117

---

## 7. SDL (Skills Development Levy)

| Constant | Value | File / line |
|---|---|---|
| `SDL_RATE` | 1% (0.01) | `calculator.ts` line 32 |
| Annual exempt threshold | R500,000 total payroll | Checked at run level |

SDL is an employer cost. It does not reduce employee net pay and does not appear on the payslip. It is returned in the breakdown as `employerSdl` for EMP201 reporting.

```
employerSdl = isSDLLiable ? adjustedGross x 0.01 : 0
```

`isSDLLiable` is determined at the payroll run level (total annual payroll across all employees >= R500,000) and passed into `calculateMonthlyPayroll` as an option.

**File:** `src/lib/payroll/calculator.ts` line 32, 119-121

Config field `sdlEnabled` in `src/lib/config/payroll.ts` stores the reference number but the liability check uses `isSDLLiable` at runtime.

---

## 8. Pension fund contribution

### Payslip deduction (what leaves the employee's pay)

```
pensionMonthly = adjustedBasic x pensionContributionPct
```

`pensionContributionPct` is stored as a decimal (0.075 = 7.5%). Calculated on the adjusted basic salary (after unpaid leave deduction), not on gross pay including allowances.

### s11F deduction from taxable income (reduces PAYE base)

```
pensionAnnual      = pensionMonthly x divisor
s11fCap            = min(annualRemuneration x 0.275, 430_000)
pensionS11fDeduction = min(pensionAnnual, s11fCap)
annualTaxable      = annualRemuneration - pensionS11fDeduction
```

| Cap rule | Value for 2026/27 | Update when |
|---|---|---|
| Maximum percentage of remuneration | 27.5% | Verify annually |
| Maximum annual rand cap | R430,000 | Was R350,000 prior year; verify each February |

**File:** `src/lib/payroll/calculator.ts` lines 34-35, 99-107

### Config

| Setting | Value | Where |
|---|---|---|
| Default pension % (all demo tenants) | 7.5% | `src/lib/config/payroll.ts` line 21 |
| Per-employee pension % | Set per employee, stored as decimal (e.g. 0.075) | `Employee.salary.pensionContributionPct` |

---

## 9. Medical aid deduction

```
medicalAidDeduction = salary.medicalAid (fixed monthly rand amount)
```

Flat monthly rand amount per employee. No calculation applied. The PAYE reduction via Medical Aid Tax Credit is handled separately in section 5.

**New field required:** `SalaryInfo.medicalAidDependants?: number` for the MATC credit.

**File:** `src/lib/payroll/calculator.ts` lines 125-127

---

## 10. Net pay calculation and rounding

```
totalDeductions = PAYE + UIF + unpaidLeave (if any) + pension (if set) + medicalAid (if set)
netPay = Decimal(grossPay - totalDeductions).toDecimalPlaces(2)
```

SDL and employer UIF are not included in `totalDeductions`. All intermediate amounts are computed with `decimal.js` using `ROUND_HALF_UP`. Final rounding is applied once to `netPay`.

**File:** `src/lib/payroll/calculator.ts` lines 129-135

---

## 11. Leave entitlements

### Current leave policy (global, applies to all tenants)

| Leave type | Days | Cycle | Paid | BCEA basis | File / line |
|---|---|---|---|---|---|
| Annual leave | 18 working days | 12 months | Yes | BCEA s20 minimum is 15 days. 18 is intentionally above minimum. | `config/leave.ts` line 5 |
| Sick leave | 30 days | 36 months | Yes | BCEA s22: 30 days per 36-month cycle. | `config/leave.ts` line 13 |
| Family responsibility | 3 days | 12 months | Yes | BCEA s27: exactly 3 days per cycle. | `config/leave.ts` line 20 |
| Unpaid leave | 5 days | 12 months (discretionary) | No | No BCEA minimum. Discretionary policy. | `config/leave.ts` line 27 |

The `LeavePolicy` interface now includes `cycleMonths?: number`. Sick leave has `cycleMonths: 36`. All others use the default 12-month year cycle.

**File:** `src/lib/config/leave.ts`, `src/lib/types.ts` (LeavePolicy.cycleMonths)

---

## 12. Leave balance: how days are deducted

When a leave request is approved, `LeaveBalance.used` is incremented by the `days` field on the `LeaveRequest`. The `days` field is entered manually by the employee when submitting the request.

**New field:** `LeaveBalance.cycleStartDate?: string` (ISO date) tracks the start of the 36-month sick leave cycle.

**Remaining gap:** leave days are not automatically calculated from calendar dates minus public holidays. Day counts rely on employee self-reporting.

---

## 13. Unpaid leave: effect on pay

When `unpaidLeaveDays > 0` is passed to `calculateMonthlyPayroll`:

```
unpaidDeduction  = Decimal(basicSalary x unpaidLeaveDays / workingDaysInMonth).toDecimalPlaces(2)
adjustedBasic    = basicSalary - unpaidDeduction
```

The adjusted basic is then used as the base for all PAYE, UIF, SDL, and pension calculations for that period. Unpaid leave appears as a deduction line item on the payslip. `workingDaysInMonth` defaults to 21 if not supplied.

**File:** `src/lib/payroll/calculator.ts` lines 84-88

---

## 14. Pay frequency: fully supported

All three frequency options are now fully implemented.

| Value | Divisor | UIF cap per run | PAYE annualisation |
|---|---|---|---|
| monthly | 12 | R177.12 | annualTaxable / 12 |
| biweekly | 26 | R81.75 | annualTaxable / 26 |
| weekly | 52 | R40.88 | annualTaxable / 52 |

**File:** `src/lib/payroll/calculator.ts` line 26

---

## 15. Tax year dates: annual update checklist

| What to update | When | Source | File / constant |
|---|---|---|---|
| Tax bracket thresholds and base tax | Before 1 March each year | National Treasury Budget Tax Guide | `calculator.ts` -- `TAX_BRACKETS_2026_27` (rename to next year) |
| Primary, secondary, tertiary rebates | Before 1 March each year | National Treasury Budget Tax Guide | `calculator.ts` -- `*_REBATE_ANNUAL` |
| Medical Aid Tax Credit monthly amounts | Before 1 March each year | National Treasury Budget Tax Guide | `calculator.ts` -- `MATC_*` |
| Pension annual rand cap | Before 1 March each year | National Treasury Budget Tax Guide | `calculator.ts` -- `PENSION_MAX_RAND` |
| UIF monthly remuneration ceiling | March -- check Department of Labour notice | UIF Act Determination | `calculator.ts` -- `UIF_BASE_CAP` |
| Tax year label in payroll config | Before 1 March each year | Internal | `payroll.ts` -- `taxYear` |

### Values to update each March (current 2026/27 values for reference)

| Value | File | Current (2026/27) | Updated to (fill in) |
|---|---|---|---|
| Bracket 1 threshold | `calculator.ts` line 12 | R245,100 | |
| Bracket 2 threshold | `calculator.ts` line 13 | R383,100 | |
| Bracket 3 threshold | `calculator.ts` line 14 | R530,200 | |
| Bracket 4 threshold | `calculator.ts` line 15 | R695,800 | |
| Bracket 5 threshold | `calculator.ts` line 16 | R887,000 | |
| Bracket 6 threshold | `calculator.ts` line 17 | R1,878,600 | |
| Bracket 2 base tax | `calculator.ts` line 13 | R44,118 | |
| Bracket 3 base tax | `calculator.ts` line 14 | R79,998 | |
| Bracket 4 base tax | `calculator.ts` line 15 | R125,599 | |
| Bracket 5 base tax | `calculator.ts` line 16 | R185,215 | |
| Bracket 6 base tax | `calculator.ts` line 17 | R259,783 | |
| Bracket 7 base tax | `calculator.ts` line 18 | R666,339 | |
| Primary rebate | `calculator.ts` line 21 | R17,820 | |
| Secondary rebate (65+) | `calculator.ts` line 22 | R9,765 | |
| Tertiary rebate (75+) | `calculator.ts` line 23 | R3,249 | |
| MATC main member | `calculator.ts` line 25 | R376/month | |
| MATC first dependant | `calculator.ts` line 26 | R376/month | |
| MATC extra dependants | `calculator.ts` line 27 | R254/month | |
| Pension max rand cap (s11F) | `calculator.ts` line 35 | R430,000/year | |
| UIF monthly cap | `calculator.ts` line 30 | R177.12 | |
| Tax year label | `payroll.ts` lines 18, 28, 38, 58 | "2026/2027" | |

---

## 16. Known gaps and remaining items

Most of the original gaps have been resolved in the 2026/27 update. The following items are still outstanding.

| # | Gap | Impact | Effort |
|---|---|---|---|
| 1 | Leave days not calculated from calendar dates | Low: relies on employee self-reporting | Medium: requires calendar + public holiday lookup |
| 2 | Leave balances do not auto-reset based on cycle | Low: HR must reset sick leave cycle manually | Medium: requires a scheduled job and cycleStartDate logic |
| 3 | Leave policy is global static config, not per-tenant | Low: no clients yet | Medium: add LeavePolicies table |
| 4 | `isSDLLiable` not wired from run level to buildPayslip | SDL not calculated in practice yet | Low: pass total annual payroll check into completePayrollRunRecord |
| 5 | Employee `dateOfBirth` field is optional | Secondary/tertiary rebates silently skipped | Low: make required on new employee form |

---

## 17. How to apply updated values

When you have verified or updated any value in this document, share the file. The developer will:

1. Open `src/lib/payroll/calculator.ts` and replace the relevant constant.
2. Run `npm test` to confirm all calculator tests pass with the new values.
3. Do a manual spot-check using the SARS eFiling tax calculator for one employee at a known salary.
4. Commit and deploy.

For leave policy changes, also update `src/lib/config/leave.ts` and check that existing `LeaveBalance.total` values in the database match the new policy for all existing employees.
