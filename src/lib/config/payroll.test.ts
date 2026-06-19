import { describe, expect, it } from "vitest";
import { getPayrollConfig, payrollConfigs } from "./payroll";

describe("getPayrollConfig", () => {
  it("returns the configured payroll config for a known tenant", () => {
    expect(getPayrollConfig("novatech")).toBe(payrollConfigs.find((c) => c.tenantId === "novatech"));
  });

  it("falls back to sensible defaults for an unconfigured tenant", () => {
    expect(getPayrollConfig("does-not-exist")).toEqual({
      tenantId: "does-not-exist",
      payeReferenceNumber: "",
      uifReferenceNumber: "",
      sdlReferenceNumber: "",
      taxYear: "2026/2027",
      uifEnabled: true,
      sdlEnabled: true,
      defaultPensionPct: 7.5,
    });
  });
});
