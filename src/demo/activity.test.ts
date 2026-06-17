import { describe, expect, it } from "vitest";
import { activityFeed, getActivityByTenant } from "./activity";

describe("getActivityByTenant", () => {
  it("returns only activity for the given tenant, sorted newest-first", () => {
    const result = getActivityByTenant("novatech");

    expect(result.length).toBeGreaterThan(0);
    expect(result.every((a) => a.tenantId === "novatech")).toBe(true);
    expect(result.length).toBe(activityFeed.filter((a) => a.tenantId === "novatech").length);

    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].timestamp.localeCompare(result[i + 1].timestamp)).toBeGreaterThanOrEqual(0);
    }
  });

  it("limits the number of returned items when a limit is given", () => {
    const full = getActivityByTenant("novatech");
    const limited = getActivityByTenant("novatech", 2);

    expect(limited).toEqual(full.slice(0, 2));
  });

  it("returns an empty array for an unknown tenant", () => {
    expect(getActivityByTenant("does-not-exist")).toEqual([]);
  });
});
