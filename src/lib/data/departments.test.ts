import { describe, expect, it } from "vitest";
import { departments, getDepartmentsByTenant } from "./departments";

describe("getDepartmentsByTenant", () => {
  it("returns only departments belonging to the given tenant", () => {
    const result = getDepartmentsByTenant("novatech");

    expect(result.length).toBeGreaterThan(0);
    expect(result.every((d) => d.tenantId === "novatech")).toBe(true);
    expect(result.length).toBe(departments.filter((d) => d.tenantId === "novatech").length);
  });

  it("returns an empty array for an unknown tenant", () => {
    expect(getDepartmentsByTenant("does-not-exist")).toEqual([]);
  });
});
