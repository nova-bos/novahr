import { describe, expect, it } from "vitest";
import type { Payslip } from "@/lib/types";
import { buildPayrollRegister } from "./register";
import { buildGlJournal, glJournalToRows, DEFAULT_GL_ACCOUNTS } from "./gl-journal";

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
    deductions: [
      { label: "PAYE", amount: 5_500 },
      { label: "UIF", amount: 177.12 },
    ],
    grossPay: 30_000,
    totalDeductions: 5_677.12,
    netPay: 24_322.88,
    paye: 5_500,
    uif: 177.12,
    employerUif: 177.12,
    employerSdl: 300,
    ...overrides,
  };
}

describe("buildGlJournal", () => {
  it("produces a balanced journal (debits equal credits) for a sample run", () => {
    const register = buildPayrollRegister([makePayslip()], new Map());
    const journal = buildGlJournal(register);

    expect(journal.balanced).toBe(true);
    expect(journal.totalDebit).toBe(journal.totalCredit);
    // Debits = gross + employer UIF + employer SDL.
    expect(journal.totalDebit).toBe(30_000 + 177.12 + 300);
  });

  it("balances across multiple employees with voluntary deductions", () => {
    const a = makePayslip({
      id: "ps-1",
      employeeId: "emp-1",
      deductions: [
        { label: "PAYE", amount: 5_500 },
        { label: "UIF", amount: 177.12 },
        { label: "Medical aid", amount: 1_800 },
      ],
      netPay: 22_522.88,
    });
    const b = makePayslip({
      id: "ps-2",
      employeeId: "emp-2",
      basicSalary: 20_000,
      grossPay: 20_000,
      deductions: [
        { label: "PAYE", amount: 3_000 },
        { label: "UIF", amount: 148.72 },
        { label: "Loan repayment", amount: 500 },
      ],
      paye: 3_000,
      uif: 148.72,
      employerUif: 148.72,
      employerSdl: 200,
      netPay: 16_351.28,
    });

    const register = buildPayrollRegister([a, b], new Map());
    const journal = buildGlJournal(register);

    expect(journal.balanced).toBe(true);
    expect(journal.totalDebit).toBe(journal.totalCredit);
  });

  it("maps to the default SA account labels and omits zero lines", () => {
    const register = buildPayrollRegister([makePayslip({ employerSdl: 0 })], new Map());
    const journal = buildGlJournal(register);

    const names = journal.lines.map((l) => l.accountName);
    expect(names).toContain(DEFAULT_GL_ACCOUNTS.salariesExpense.name);
    expect(names).toContain(DEFAULT_GL_ACCOUNTS.payePayable.name);
    expect(names).toContain(DEFAULT_GL_ACCOUNTS.netPayClearing.name);
    // SDL was zero, so no SDL expense or payable line.
    expect(names).not.toContain(DEFAULT_GL_ACCOUNTS.employerSdlExpense.name);
    expect(names).not.toContain(DEFAULT_GL_ACCOUNTS.sdlPayable.name);
  });

  it("emits a balanced TOTAL row in the CSV", () => {
    const register = buildPayrollRegister([makePayslip()], new Map());
    const journal = buildGlJournal(register);
    const rows = glJournalToRows(journal);
    const total = rows[rows.length - 1];
    expect(total[1]).toBe("TOTAL");
    expect(total[2]).toBe(total[3]);
  });
});
