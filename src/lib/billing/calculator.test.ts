import { describe, expect, it } from "vitest";
import {
  calculateMonthlyAmount,
  isEnterpriseTier,
  formatBillingBreakdown,
  PLATFORM_FEE,
  MEMBER_FEE,
  ENTERPRISE_THRESHOLD,
} from "./calculator";

describe("calculateMonthlyAmount", () => {
  it("is the platform fee with no members", () => {
    expect(calculateMonthlyAmount(0)).toBe(PLATFORM_FEE);
  });
  it("adds the per-member fee", () => {
    expect(calculateMonthlyAmount(1)).toBe(PLATFORM_FEE + MEMBER_FEE);
    expect(calculateMonthlyAmount(10)).toBe(PLATFORM_FEE + 10 * MEMBER_FEE);
  });
});

describe("isEnterpriseTier", () => {
  it("is false below the threshold and true at or above it", () => {
    expect(isEnterpriseTier(ENTERPRISE_THRESHOLD - 1)).toBe(false);
    expect(isEnterpriseTier(ENTERPRISE_THRESHOLD)).toBe(true);
    expect(isEnterpriseTier(ENTERPRISE_THRESHOLD + 50)).toBe(true);
  });
});

describe("formatBillingBreakdown", () => {
  it("shows the fee breakdown and total", () => {
    const out = formatBillingBreakdown(10);
    expect(out).toContain(`R${PLATFORM_FEE}`);
    expect(out).toContain(`10 × R${MEMBER_FEE}`);
    expect(out).toContain(`R${(PLATFORM_FEE + 10 * MEMBER_FEE).toLocaleString("en-ZA")}`);
  });
});
