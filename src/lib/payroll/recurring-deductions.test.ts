import { describe, expect, it } from "vitest";
import { applyRecurringDeductions } from "./recurring-deductions";

describe("applyRecurringDeductions", () => {
  it("recovers the monthly instalment and reduces the balance", () => {
    const r = applyRecurringDeductions([
      { id: "l1", kind: "loan", description: "Study loan", monthlyAmount: 1000, balance: 5000 },
    ]);
    expect(r.total).toBe(1000);
    expect(r.lines).toEqual([{ label: "Study loan", amount: 1000 }]);
    expect(r.applied[0]).toMatchObject({ id: "l1", amount: 1000, newBalance: 4000, settled: false });
  });

  it("caps the final instalment at the remaining balance and marks it settled", () => {
    const r = applyRecurringDeductions([
      { id: "l1", kind: "loan", description: "Advance", monthlyAmount: 1000, balance: 400 },
    ]);
    expect(r.total).toBe(400); // never over-recovers
    expect(r.applied[0]).toMatchObject({ amount: 400, newBalance: 0, settled: true });
  });

  it("sums multiple deductions (loan plus garnishee)", () => {
    const r = applyRecurringDeductions([
      { id: "l1", kind: "loan", description: "Loan", monthlyAmount: 500, balance: 2000 },
      { id: "g1", kind: "garnishee", description: "Maintenance order", monthlyAmount: 750, balance: 9000 },
    ]);
    expect(r.total).toBe(1250);
    expect(r.lines).toHaveLength(2);
  });

  it("skips fully settled or zero-balance deductions", () => {
    const r = applyRecurringDeductions([
      { id: "l1", kind: "loan", description: "Done", monthlyAmount: 500, balance: 0 },
    ]);
    expect(r.total).toBe(0);
    expect(r.lines).toHaveLength(0);
    expect(r.applied).toHaveLength(0);
  });
});
