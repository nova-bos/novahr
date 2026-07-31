import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  branch: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/db-context", () => ({
  runAsTenant: vi.fn((_tenantId: string, fn: (tx: unknown) => unknown) => fn(mockPrisma)),
}));

const mockSession = vi.hoisted(() => ({
  current: {
    id: "user-1",
    tenantId: "novatech",
    role: "hr",
    name: "Lerato Dlamini",
    email: "hr@novatech.co.za",
  },
}));

vi.mock("@/lib/auth/require", () => ({
  requireUser: vi.fn(async () => mockSession.current),
  requireRole: vi.fn(async () => mockSession.current),
  requireActiveSubscription: vi.fn(async () => {}),
}));

import {
  createBranchRecord,
  updateBranchRecord,
  deactivateBranchRecord,
} from "./actions";

function makeBranchRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "branch-cpt",
    tenantId: "novatech",
    name: "Cape Town",
    code: "CPT",
    address: null,
    city: "Cape Town",
    isDefault: true,
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.branch.updateMany.mockResolvedValue({ count: 0 });
});

describe("createBranchRecord", () => {
  it("creates the first branch as the default and carries a tenantId predicate", async () => {
    mockPrisma.branch.findFirst.mockResolvedValue(null);
    mockPrisma.branch.count.mockResolvedValue(0);
    mockPrisma.branch.create.mockResolvedValue(makeBranchRow());

    const result = await createBranchRecord({ name: "Cape Town", code: "CPT", city: "Cape Town" });

    expect(result.name).toBe("Cape Town");
    expect(result.isDefault).toBe(true);
    // The duplicate-name check is tenant-scoped.
    expect(mockPrisma.branch.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId: "novatech" }) })
    );
    // The create payload carries the tenantId.
    expect(mockPrisma.branch.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tenantId: "novatech", isDefault: true }) })
    );
  });

  it("rejects a duplicate branch name within the tenant", async () => {
    mockPrisma.branch.findFirst.mockResolvedValue(makeBranchRow());

    await expect(createBranchRecord({ name: "Cape Town" })).rejects.toThrow(/already exists/);
    expect(mockPrisma.branch.create).not.toHaveBeenCalled();
  });

  it("rejects a name shorter than two characters", async () => {
    await expect(createBranchRecord({ name: "C" })).rejects.toThrow(/at least 2 characters/);
  });
});

describe("updateBranchRecord", () => {
  it("updates a branch that belongs to the tenant", async () => {
    mockPrisma.branch.findFirst.mockResolvedValueOnce({ id: "branch-cpt" });
    // No name clash on the second findFirst (name change path is not exercised here).
    mockPrisma.branch.update.mockResolvedValue(makeBranchRow({ city: "Cape Town CBD" }));

    const result = await updateBranchRecord("branch-cpt", { city: "Cape Town CBD" });

    expect(result.city).toBe("Cape Town CBD");
    expect(mockPrisma.branch.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "branch-cpt", tenantId: "novatech" }),
      })
    );
  });

  it("throws when the branch is not in the tenant", async () => {
    mockPrisma.branch.findFirst.mockResolvedValue(null);

    await expect(updateBranchRecord("branch-x", { city: "X" })).rejects.toThrow(/not found/);
    expect(mockPrisma.branch.update).not.toHaveBeenCalled();
  });
});

describe("deactivateBranchRecord", () => {
  it("sets isActive to false without deleting", async () => {
    mockPrisma.branch.findFirst.mockResolvedValueOnce({ id: "branch-cpt" });
    mockPrisma.branch.update.mockResolvedValue(makeBranchRow({ isActive: false }));

    const result = await deactivateBranchRecord("branch-cpt");

    expect(result.isActive).toBe(false);
    expect(mockPrisma.branch.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isActive: false }) })
    );
  });
});
