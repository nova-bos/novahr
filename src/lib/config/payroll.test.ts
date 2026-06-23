import { describe, expect, it } from "vitest";
import { getPayrollConfig } from "./payroll";

describe("getPayrollConfig", () => {
  it("returns defaults with empty reference numbers for any tenant", () => {
    const config = getPayrollConfig("any-tenant");
    expect(config.payeReferenceNumber).toBe("");
    expect(config.uifReferenceNumber).toBe("");
    expect(config.sdlReferenceNumber).toBe("");
    expect(config.taxYear).toBe("2026/2027");
    expect(config.uifEnabled).toBe(true);
    expect(config.sdlEnabled).toBe(true);
    expect(config.defaultPensionPct).toBe(7.5);
  });

  it("includes the tenantId in the returned config", () => {
    const config = getPayrollConfig("demo-co");
    expect(config.tenantId).toBe("demo-co");
  });
});
