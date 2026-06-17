import { describe, it, expect } from "vitest";
import {
  getMonthlyPrice,
  getAnnualPrice,
  tierFitsEmployeeCount,
  suggestTier,
} from "./pricing";

describe("getMonthlyPrice", () => {
  it("returns 499 for starter", () => {
    expect(getMonthlyPrice("starter")).toBe(499);
  });

  it("returns 999 for growth", () => {
    expect(getMonthlyPrice("growth")).toBe(999);
  });

  it("throws on unknown tier id", () => {
    expect(() => getMonthlyPrice("unknown" as "starter")).toThrow(
      "Unknown tier id: unknown"
    );
  });
});

describe("getAnnualPrice", () => {
  it("returns 5988 for starter (499 * 12)", () => {
    expect(getAnnualPrice("starter")).toBe(5988);
  });

  it("returns 11988 for growth (999 * 12)", () => {
    expect(getAnnualPrice("growth")).toBe(11988);
  });
});

describe("tierFitsEmployeeCount", () => {
  it("returns true for starter with exactly 10 employees", () => {
    expect(tierFitsEmployeeCount("starter", 10)).toBe(true);
  });

  it("returns false for starter with 11 employees", () => {
    expect(tierFitsEmployeeCount("starter", 11)).toBe(false);
  });

  it("returns true for growth with exactly 30 employees", () => {
    expect(tierFitsEmployeeCount("growth", 30)).toBe(true);
  });
});

describe("suggestTier", () => {
  it("suggests starter for 1 employee", () => {
    expect(suggestTier(1)).toBe("starter");
  });

  it("suggests starter for 10 employees", () => {
    expect(suggestTier(10)).toBe("starter");
  });

  it("suggests growth for 11 employees", () => {
    expect(suggestTier(11)).toBe("growth");
  });

  it("returns null for 31 employees (over max)", () => {
    expect(suggestTier(31)).toBe(null);
  });
});
