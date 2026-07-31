import { describe, expect, it } from "vitest";
import type { Payslip } from "@/lib/types";
import {
  buildPayrollRegister,
  payrollRegisterToRows,
  type RegisterEmployee,
} from "./register";

function makePayslip(overrides: Partial<Payslip> = {}): Payslip {
  return {
    id: "ps-1",
    tenantId: "t1",
    runId: "run-1",
    employeeId: "emp-1",
    period: "2026-06",
    payDate: "2026-06-25",
    basicSalary: 30_000,
    earnings: [],
    deductions: [],
    grossPay: 30_000,
    totalDeductions: 6_000,
    netPay: 24_000,
    paye: 5_500,
    uif: 177.12,
    employerUif: 177.12,
    employerSdl: 300,
    ...overrides,
  };
}

describe("buildPayrollRegister", () => {
  it("classifies earnings into the right columns and rolls the rest into allowances", () => {
    const ps = makePayslip({
      earnings: [
        { label: "Travel allowance", amount: 2_000 },
        { label: "Overtime (1.5x)", amount: 1_500 },
        { label: "Sales commission", amount: 3_000 },
        { label: "Annual bonus", amount: 10_000 },
      ],
      grossPay: 46_500,
    });
    const employees = new Map<string, RegisterEmployee>([
      ["emp-1", { employeeNumber: "E001", firstName: "Thabo", lastName: "Nkosi", branchName: "Sandton" }],
    ]);

    const register = buildPayrollRegister([ps], employees);
    const row = register.rows[0];

    expect(row.employeeNumber).toBe("E001");
    expect(row.name).toBe("Thabo Nkosi");
    expect(row.branch).toBe("Sandton");
    expect(row.basic).toBe(30_000);
    expect(row.allowances).toBe(2_000);
    expect(row.overtime).toBe(1_500);
    expect(row.commission).toBe(3_000);
    expect(row.bonus).toBe(10_000);
  });

  it("excludes PAYE and UIF from other deductions but keeps voluntary ones", () => {
    const ps = makePayslip({
      deductions: [
        { label: "PAYE", amount: 5_500 },
        { label: "UIF", amount: 177.12 },
        { label: "Medical aid", amount: 1_800 },
        { label: "Loan repayment", amount: 500 },
      ],
    });
    const register = buildPayrollRegister([ps], new Map());
    expect(register.rows[0].otherDeductions).toBe(2_300);
  });

  it("sums a totals row across employees", () => {
    const a = makePayslip({ employeeId: "emp-1", id: "ps-1", grossPay: 30_000, netPay: 24_000, paye: 5_500, uif: 177.12, employerUif: 177.12, employerSdl: 300 });
    const b = makePayslip({ employeeId: "emp-2", id: "ps-2", basicSalary: 20_000, grossPay: 20_000, netPay: 16_000, paye: 3_500, uif: 177.12, employerUif: 177.12, employerSdl: 200 });

    const register = buildPayrollRegister([a, b], new Map());

    expect(register.rows).toHaveLength(2);
    expect(register.totals.gross).toBe(50_000);
    expect(register.totals.netPay).toBe(40_000);
    expect(register.totals.paye).toBe(9_000);
    expect(register.totals.uif).toBe(354.24);
    expect(register.totals.employerUif).toBe(354.24);
    expect(register.totals.employerSdl).toBe(500);
    expect(register.totals.basic).toBe(50_000);
  });

  it("emits a TOTAL row as the final CSV row", () => {
    const register = buildPayrollRegister([makePayslip()], new Map());
    const rows = payrollRegisterToRows(register);
    expect(rows[rows.length - 1][0]).toBe("TOTAL");
    // 15 columns per row.
    expect(rows[0]).toHaveLength(15);
  });

  it("falls back to payslip ids when the employee lookup is missing", () => {
    const register = buildPayrollRegister([makePayslip({ employeeId: "ghost" })], new Map());
    expect(register.rows[0].employeeNumber).toBe("ghost");
    expect(register.rows[0].name).toBe("ghost");
    expect(register.rows[0].branch).toBe("");
  });
});
