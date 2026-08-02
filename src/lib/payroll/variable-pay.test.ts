import { describe, it, expect } from "vitest";
import {
  COMPONENT_TYPES,
  MANUAL_COMPONENTS,
  RECURRING_COMPONENTS,
  isRecurringComponentType,
  resolveInputAmount,
  toInputValue,
} from "./variable-pay";

describe("isRecurringComponentType", () => {
  it("allows fixed regular earnings/deductions", () => {
    expect(isRecurringComponentType("commission")).toBe(true);
    expect(isRecurringComponentType("allowance_custom")).toBe(true);
    expect(isRecurringComponentType("deduction_custom")).toBe(true);
  });

  it("excludes hours-based, annual-payment and leave-encashment components", () => {
    expect(isRecurringComponentType("overtime")).toBe(false); // hours
    expect(isRecurringComponentType("bonus")).toBe(false); // annual_payment
    expect(isRecurringComponentType("thirteenth_cheque")).toBe(false); // annual_payment
    expect(isRecurringComponentType("leave_encashment")).toBe(false); // special
  });

  it("rejects unknown types", () => {
    expect(isRecurringComponentType("nope")).toBe(false);
  });
});

describe("component catalogues", () => {
  it("RECURRING_COMPONENTS only contains recurring-eligible types", () => {
    expect(RECURRING_COMPONENTS.length).toBeGreaterThan(0);
    for (const c of RECURRING_COMPONENTS) {
      expect(isRecurringComponentType(c.type)).toBe(true);
    }
  });

  it("MANUAL_COMPONENTS excludes leave_encashment but keeps others", () => {
    expect(MANUAL_COMPONENTS.some((c) => c.type === "leave_encashment")).toBe(false);
    expect(MANUAL_COMPONENTS.some((c) => c.type === "overtime")).toBe(true);
    expect(COMPONENT_TYPES).toContain("leave_encashment");
  });
});

describe("resolveInputAmount", () => {
  it("uses quantity x rate x multiplier for hours-based components", () => {
    // overtime multiplier is 1.5
    expect(resolveInputAmount("overtime", { quantity: 10, rate: 100 })).toBe(1500);
  });

  it("uses the explicit amount for fixed components", () => {
    expect(resolveInputAmount("commission", { amount: 2000 })).toBe(2000);
  });
});

describe("toInputValue", () => {
  it("falls back to the component label and defaults tax treatment", () => {
    const v = toInputValue({ componentType: "commission", amount: 500 });
    expect(v.label).toBe("Commission");
    expect(v.taxTreatment).toBe("regular");
    expect(v.amount).toBe(500);
  });

  it("preserves an annual-payment treatment", () => {
    const v = toInputValue({ componentType: "bonus", amount: 1000, taxTreatment: "annual_payment" });
    expect(v.taxTreatment).toBe("annual_payment");
  });
});
