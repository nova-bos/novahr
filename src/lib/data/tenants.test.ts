import { describe, expect, it } from "vitest";
import { getTenant, tenants } from "./tenants";

describe("getTenant", () => {
  it("returns the tenant with the given id", () => {
    expect(getTenant("novatech")).toBe(tenants.find((t) => t.id === "novatech"));
  });

  it("throws for an unknown tenant id", () => {
    expect(() => getTenant("does-not-exist")).toThrow("Unknown tenant: does-not-exist");
  });
});
