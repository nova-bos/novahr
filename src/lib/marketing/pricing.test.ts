import { describe, it, expect } from "vitest";
import { PLATFORM_FEE, MEMBER_FEE, ENTERPRISE_THRESHOLD, PRICING_EXAMPLES } from "./pricing";

describe("PLATFORM_FEE", () => {
  it("is R349", () => {
    expect(PLATFORM_FEE).toBe(349);
  });
});

describe("MEMBER_FEE", () => {
  it("is R30", () => {
    expect(MEMBER_FEE).toBe(30);
  });
});

describe("ENTERPRISE_THRESHOLD", () => {
  it("is 150", () => {
    expect(ENTERPRISE_THRESHOLD).toBe(150);
  });
});

describe("PRICING_EXAMPLES", () => {
  it("has correct totals for each example", () => {
    for (const example of PRICING_EXAMPLES) {
      expect(example.total).toBe(PLATFORM_FEE + example.members * MEMBER_FEE);
    }
  });

  it("includes an entry for 1 member", () => {
    const one = PRICING_EXAMPLES.find((e) => e.members === 1);
    expect(one).toBeDefined();
    expect(one?.total).toBe(379);
  });

  it("includes an entry for 100 members", () => {
    const hundred = PRICING_EXAMPLES.find((e) => e.members === 100);
    expect(hundred).toBeDefined();
    expect(hundred?.total).toBe(3349);
  });
});
