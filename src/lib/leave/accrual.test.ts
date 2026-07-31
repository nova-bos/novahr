import { describe, it, expect } from "vitest";
import { accruedEntitlement, completedMonths, sickLeaveEntitlement } from "./accrual";

describe("completedMonths", () => {
  it("counts whole months once the day-of-month anniversary is reached", () => {
    expect(completedMonths(new Date("2026-01-15"), new Date("2026-01-15"))).toBe(0);
    expect(completedMonths(new Date("2026-01-15"), new Date("2026-02-14"))).toBe(0);
    expect(completedMonths(new Date("2026-01-15"), new Date("2026-02-15"))).toBe(1);
    expect(completedMonths(new Date("2026-01-15"), new Date("2027-01-15"))).toBe(12);
  });

  it("never returns negative for future start dates", () => {
    expect(completedMonths(new Date("2026-06-01"), new Date("2026-01-01"))).toBe(0);
  });
});

describe("accruedEntitlement", () => {
  const base = { type: "annual" as const, total: 18, startDate: "2026-01-01" };

  it("gives the full total upfront regardless of tenure", () => {
    expect(accruedEntitlement({ ...base, method: "upfront", asOf: new Date("2026-01-01") })).toBe(18);
  });

  it("earns annual leave evenly across twelve months under accrual", () => {
    expect(accruedEntitlement({ ...base, method: "accrual", asOf: new Date("2026-01-01") })).toBe(0);
    expect(accruedEntitlement({ ...base, method: "accrual", asOf: new Date("2026-05-01") })).toBe(6); // 4/12 * 18
    expect(accruedEntitlement({ ...base, method: "accrual", asOf: new Date("2026-07-01") })).toBe(9); // 6/12 * 18
  });

  it("caps accrual at the full total after a year", () => {
    expect(accruedEntitlement({ ...base, method: "accrual", asOf: new Date("2027-06-01") })).toBe(18);
  });

  it("does not accrue non-annual leave types (always full)", () => {
    expect(
      accruedEntitlement({ type: "sick", total: 30, method: "accrual", startDate: "2026-01-01", asOf: new Date("2026-03-01") })
    ).toBe(30);
    expect(
      accruedEntitlement({ type: "family", total: 3, method: "accrual", startDate: "2026-01-01", asOf: new Date("2026-03-01") })
    ).toBe(3);
  });

  it("treats a zero entitlement as zero", () => {
    expect(accruedEntitlement({ type: "annual", total: 0, method: "accrual", startDate: "2026-01-01" })).toBe(0);
  });
});

describe("sickLeaveEntitlement (BCEA s.22 first-6-months rule)", () => {
  it("earns 0 days before the first 26 working days have been completed", () => {
    // Day 0: 0 working periods, 0 days.
    expect(sickLeaveEntitlement({ startDate: "2026-01-01", asOf: new Date("2026-01-01") })).toBe(0);
  });

  it("earns 1 day per 26-working-day period in the first 6 months", () => {
    // ~1.2 months in (1 period of 26 working days ~ 1 calendar month + a few days).
    expect(sickLeaveEntitlement({ startDate: "2026-01-01", asOf: new Date("2026-02-01") })).toBe(0);
    // 2 months: floor(2 * 21.75 / 26) = floor(43.5 / 26) = 1.
    expect(sickLeaveEntitlement({ startDate: "2026-01-01", asOf: new Date("2026-03-01") })).toBe(1);
    // 3 months: floor(3 * 21.75 / 26) = floor(65.25 / 26) = 2.
    expect(sickLeaveEntitlement({ startDate: "2026-01-01", asOf: new Date("2026-04-01") })).toBe(2);
  });

  it("returns the full cycle entitlement after 6 months", () => {
    expect(sickLeaveEntitlement({ startDate: "2026-01-01", asOf: new Date("2026-07-01") })).toBe(30);
    expect(sickLeaveEntitlement({ startDate: "2026-01-01", asOf: new Date("2027-01-01") })).toBe(30);
  });

  it("respects a custom cycleDays", () => {
    expect(sickLeaveEntitlement({ startDate: "2026-01-01", cycleDays: 36, asOf: new Date("2026-07-01") })).toBe(36);
  });
});
