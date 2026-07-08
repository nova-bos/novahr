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

  it("caps garnishees at 25% of gross, leaving the rest in the balance", () => {
    const r = applyRecurringDeductions(
      [{ id: "g1", kind: "garnishee", description: "Maintenance order", monthlyAmount: 5_000, balance: 20_000 }],
      { grossRemuneration: 10_000 } // 25% cap = 2,500
    );
    expect(r.applied[0].amount).toBe(2_500);
    expect(r.applied[0].newBalance).toBe(17_500);
    expect(r.applied[0].settled).toBe(false);
  });

  it("does not cap loans, only garnishees", () => {
    const r = applyRecurringDeductions(
      [{ id: "l1", kind: "loan", description: "Advance", monthlyAmount: 5_000, balance: 20_000 }],
      { grossRemuneration: 10_000 }
    );
    expect(r.applied[0].amount).toBe(5_000); // loans are uncapped
  });

  it("shares the 25% garnishee cap across multiple garnishees", () => {
    const r = applyRecurringDeductions(
      [
        { id: "g1", kind: "garnishee", description: "Order A", monthlyAmount: 2_000, balance: 10_000 },
        { id: "g2", kind: "garnishee", description: "Order B", monthlyAmount: 2_000, balance: 10_000 },
      ],
      { grossRemuneration: 10_000 } // 25% cap = 2,500 total
    );
    expect(r.total).toBe(2_500);
    expect(r.applied[0].amount).toBe(2_000);
    expect(r.applied[1].amount).toBe(500); // only 500 of the cap left
  });
});
