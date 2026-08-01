import { describe, it, expect } from "vitest";
import { buildCoidaReturn, coidaCeilingForYear } from "./coida";

describe("coidaCeilingForYear", () => {
  it("returns the gazetted ceiling for a known year", () => {
    expect(coidaCeilingForYear("2024")).toBe(597328);
    expect(coidaCeilingForYear("2023")).toBe(563520);
  });

  it("falls back to the latest ceiling for an unknown year", () => {
    expect(coidaCeilingForYear("2099")).toBe(597328);
  });
});

describe("buildCoidaReturn", () => {
  it("caps assessable earnings at the ceiling and totals the return", () => {
    const result = buildCoidaReturn("2024/2025", [
      { employeeId: "b", employeeNumber: "E2", name: "Bongi Zulu", earnings: 700000, monthsWorked: 12 },
      { employeeId: "a", employeeNumber: "E1", name: "Ann Smith", earnings: 300000, monthsWorked: 6 },
    ]);

    expect(result.ceiling).toBe(597328);
    // Sorted by name.
    expect(result.rows.map((r) => r.name)).toEqual(["Ann Smith", "Bongi Zulu"]);
    // Under-ceiling employee is uncapped; over-ceiling is capped.
    expect(result.rows[0].assessableEarnings).toBe(300000);
    expect(result.rows[1].assessableEarnings).toBe(597328);
    expect(result.totalActualEarnings).toBe(1000000);
    expect(result.totalAssessableEarnings).toBe(897328);
    expect(result.employeeCount).toBe(2);
    // (12 + 6) / 12 = 1.5 average employed.
    expect(result.averageEmployees).toBeCloseTo(1.5);
  });

  it("returns zeroes for an empty workforce", () => {
    const result = buildCoidaReturn("2024/2025", []);
    expect(result.employeeCount).toBe(0);
    expect(result.totalAssessableEarnings).toBe(0);
    expect(result.averageEmployees).toBe(0);
  });
});
