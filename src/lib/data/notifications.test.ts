import { describe, expect, it } from "vitest";
import { getNotificationsByTenant, notifications } from "./notifications";

describe("getNotificationsByTenant", () => {
  it("returns only notifications for the given tenant, sorted newest-first", () => {
    const result = getNotificationsByTenant("novatech");

    expect(result.length).toBeGreaterThan(0);
    expect(result.every((n) => n.tenantId === "novatech")).toBe(true);
    expect(result.length).toBe(notifications.filter((n) => n.tenantId === "novatech").length);

    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].timestamp.localeCompare(result[i + 1].timestamp)).toBeGreaterThanOrEqual(0);
    }
  });

  it("returns an empty array for an unknown tenant", () => {
    expect(getNotificationsByTenant("does-not-exist")).toEqual([]);
  });
});
