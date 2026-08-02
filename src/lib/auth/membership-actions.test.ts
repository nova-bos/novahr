import { beforeEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({
  current: { id: "user-1", tenantId: "tenant-a", role: "hr", name: "Ann", email: "ann@x.co" },
}));

const mockPrisma = vi.hoisted(() => ({
  tenantMembership: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  user: { update: vi.fn() },
}));

vi.mock("@/lib/auth/require", () => ({
  requireUser: vi.fn(async () => session.current),
}));
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

import { listMyTenantsAction, switchTenantAction } from "./membership-actions";

beforeEach(() => {
  vi.clearAllMocks();
  session.current = { id: "user-1", tenantId: "tenant-a", role: "hr", name: "Ann", email: "ann@x.co" };
});

describe("listMyTenantsAction", () => {
  it("returns memberships with the active one flagged", async () => {
    mockPrisma.tenantMembership.findMany.mockResolvedValue([
      { tenantId: "tenant-a", role: "hr", tenant: { name: "Alpha" } },
      { tenantId: "tenant-b", role: "manager", tenant: { name: "Beta" } },
    ]);

    const result = await listMyTenantsAction();

    expect(result).toEqual([
      { tenantId: "tenant-a", tenantName: "Alpha", role: "hr", isActive: true },
      { tenantId: "tenant-b", tenantName: "Beta", role: "manager", isActive: false },
    ]);
  });
});

describe("switchTenantAction", () => {
  it("is a no-op when already on the target tenant", async () => {
    const result = await switchTenantAction("tenant-a");
    expect(result).toEqual({ ok: true });
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("rejects a tenant the user is not a member of", async () => {
    mockPrisma.tenantMembership.findUnique.mockResolvedValue(null);
    await expect(switchTenantAction("tenant-x")).rejects.toThrow("do not have access");
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("copies the membership onto the user as the active context", async () => {
    mockPrisma.tenantMembership.findUnique.mockResolvedValue({
      tenantId: "tenant-b",
      role: "manager",
      employeeId: "emp-b",
      branchScopeId: null,
      title: "Ops Manager",
    });

    const result = await switchTenantAction("tenant-b");

    expect(result).toEqual({ ok: true });
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        tenantId: "tenant-b",
        role: "manager",
        employeeId: "emp-b",
        branchScopeId: null,
        title: "Ops Manager",
      },
    });
  });
});
