import { describe, it, expect, vi } from "vitest";
import type { TenantTransactionClient } from "@/lib/prisma";
import { reverseRunCompletion } from "./run-reversal";

type Payslip = { id: string; employeeId: string; deductions: { label: string; amount: number }[] };
type Deduction = { id: string; employeeId: string; description: string; balance: number };

function makeTx(payslips: Payslip[], deductions: Deduction[]) {
  const tx = {
    payslip: {
      findMany: vi.fn().mockResolvedValue(payslips),
      deleteMany: vi.fn().mockResolvedValue({ count: payslips.length }),
    },
    employeeDeduction: {
      findMany: vi.fn().mockResolvedValue(deductions),
      update: vi.fn().mockResolvedValue({}),
    },
    bankExport: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
  };
  return tx;
}

describe("reverseRunCompletion", () => {
  it("restores matching loan/garnishee balances and skips statutory lines", async () => {
    const payslips: Payslip[] = [
      {
        id: "ps-1",
        employeeId: "emp-1",
        deductions: [
          { label: "PAYE (Income Tax)", amount: 5000 },
          { label: "UIF Contribution", amount: 177.12 },
          { label: "Staff loan", amount: 1500 },
        ],
      },
    ];
    const deductions: Deduction[] = [
      { id: "d-1", employeeId: "emp-1", description: "Staff loan", balance: 3000 },
    ];
    const tx = makeTx(payslips, deductions);

    await reverseRunCompletion(tx as unknown as TenantTransactionClient, "run-1", "t1");

    // Only the loan line is reversed; PAYE and UIF have no matching deduction.
    expect(tx.employeeDeduction.update).toHaveBeenCalledTimes(1);
    expect(tx.employeeDeduction.update).toHaveBeenCalledWith({
      where: { id: "d-1" },
      data: { balance: { increment: 1500 }, status: "active", settledAt: null },
    });
    expect(tx.bankExport.updateMany).toHaveBeenCalled();
    expect(tx.payslip.deleteMany).toHaveBeenCalledWith({ where: { runId: "run-1", tenantId: "t1" } });
  });

  it("does nothing when the run has no payslips", async () => {
    const tx = makeTx([], []);

    await reverseRunCompletion(tx as unknown as TenantTransactionClient, "run-1", "t1");

    expect(tx.employeeDeduction.update).not.toHaveBeenCalled();
    expect(tx.bankExport.updateMany).not.toHaveBeenCalled();
    expect(tx.payslip.deleteMany).not.toHaveBeenCalled();
  });
});
