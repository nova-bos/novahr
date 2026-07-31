# Tax constants validation (2026/27)

NovaHR runs the **2026/27** SARS tax year (1 March 2026 to 28 February 2027). The constants in `src/lib/payroll/calculator.ts` (brackets, rebates R17,820 / R9,765 / R3,249, medical tax credits R376 / R376 / R254, s11F cap R430,000, UIF ceiling R17,712) are **correct and validated**. Do not change them to make a test pass.

## Validation sources

1. **Real-world reconciliation (authoritative).** NovaHR's output was compared against a printed **LifeCheq** payslip for July 2026 (`Desktop/NovaHR-vs-LifeCheq-payslip.xlsx`). For an employee on R65,000/month basic + R1,400/month fully-taxable cash allowance + R585/month taxable fringe benefit (income protection), under 65, no pension:

   | Line | LifeCheq (printed) | NovaHR | 
   |------|-------------------|--------|
   | Gross earnings (cash) | R66,400.00 | R66,400.00 |
   | PAYE | R17,460.23 | R17,460.23 |
   | UIF (employee) | R177.12 | R177.12 |
   | SDL (employer) | R669.85 | R669.85 |
   | Net pay | R48,762.65 | R48,762.65 |

   This case is locked as the **golden-master regression test** in `src/lib/payroll/calculator.test.ts` (`describe("golden master: LifeCheq 2026/27 reconciliation")`). If any calculation path or constant drifts, that test fails.

2. **SARS tables.** Brackets, bases and rebates verified against sars.gov.za rates for individuals (2026/27).

## Note on older reference documents

`NovaHR_Calculation_Reference.docx` describes the **2025/26** year (rebate R17,235 etc.) and is retained only as a historical reference. It does **not** reflect the operative 2026/27 constants and must not be used to "correct" the calculator. A prior automated audit flagged the 2026/27 constants as wrong by comparing against that stale 2025/26 document; that was a false positive, disproven by the LifeCheq reconciliation above.

## Single source of truth

All statutory outputs (EMP201, EMP501, IRP5/IT3(a)) derive their PAYE/UIF/SDL figures from the payslips produced by `calculator.ts`. There is no second copy of the tax tables. Keep it that way: any future rate change happens in `calculator.ts` and the golden test only.
