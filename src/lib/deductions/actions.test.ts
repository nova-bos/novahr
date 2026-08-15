import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  earningType: {
    count: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn().mockResolvedValue({ count: 0 }),
    deleteMany: vi.fn(),
  },
  deductionType: {
    count: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn().mockResolvedValue({ count: 0 }),
    findFirst: vi.fn(),
    deleteMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/db-context", () => ({
  runAsTenant: vi.fn((_t: string, fn: (tx: unknown) => unknown) => fn(mockPrisma)),
}));
vi.mock("@/lib/auth/require", () => ({
  requireTenant: vi.fn(async () => ({ tenantId: "novatech", role: "hr" })),
  requireActiveSubscription: vi.fn(async () => {}),
}));

import {
  createEarningTypeAction,
  deleteEarningTypeAction,
  ensureDefaultEarningTypes,
  createDeductionTypeAction,
  deleteDeductionTypeAction,
  ensureDefaultDeductionTypes,
} from "./actions";

beforeEach(() => vi.clearAllMocks());

describe("earning types", () => {
  it("creates with sortOrder taken from the current count", async () => {
    mockPrisma.earningType.count.mockResolvedValue(3);
    mockPrisma.earningType.create.mockResolvedValue({ id: "e1" });
    const res = await createEarningTypeAction("novatech", { name: "Standby", category: "bonus", isTaxable: true });
    expect(res).toEqual({ id: "e1" });
    expect(mockPrisma.earningType.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ sortOrder: 3, tenantId: "novatech" }) })
    );
  });

  it("returns an error object when the row does not exist on delete", async () => {
    mockPrisma.earningType.deleteMany.mockResolvedValue({ count: 0 });
    expect(await deleteEarningTypeAction("novatech", "missing")).toEqual({
      success: false,
      error: "Earning type not found.",
    });
  });

  it("seeds defaults only when none exist", async () => {
    mockPrisma.earningType.count.mockResolvedValue(0);
    await ensureDefaultEarningTypes("novatech");
    expect(mockPrisma.earningType.createMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.earningType.createMany.mock.calls[0][0].data.length).toBeGreaterThanOrEqual(6);

    vi.clearAllMocks();
    mockPrisma.earningType.count.mockResolvedValue(4);
    await ensureDefaultEarningTypes("novatech");
    expect(mockPrisma.earningType.createMany).not.toHaveBeenCalled();
  });
});

describe("deduction types", () => {
  it("creates with sortOrder from the count", async () => {
    mockPrisma.deductionType.count.mockResolvedValue(2);
    mockPrisma.deductionType.create.mockResolvedValue({ id: "d1" });
    const res = await createDeductionTypeAction("novatech", {
      name: "Union Fee",
      category: "other",
      isEmployer: false,
      isStatutory: false,
    });
    expect(res).toEqual({ id: "d1" });
    expect(mockPrisma.deductionType.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ sortOrder: 2 }) })
    );
  });

  it("refuses to delete a statutory deduction type", async () => {
    mockPrisma.deductionType.findFirst.mockResolvedValue({ isStatutory: true });
    expect(await deleteDeductionTypeAction("novatech", "paye")).toEqual({
      success: false,
      error: "Statutory deduction types cannot be deleted.",
    });
    expect(mockPrisma.deductionType.deleteMany).not.toHaveBeenCalled();
  });

  it("deletes a non-statutory deduction type", async () => {
    mockPrisma.deductionType.findFirst.mockResolvedValue({ isStatutory: false });
    mockPrisma.deductionType.deleteMany.mockResolvedValue({ count: 1 });
    expect(await deleteDeductionTypeAction("novatech", "union")).toEqual({ success: true });
  });

  it("seeds statutory defaults (PAYE, UIF) when empty", async () => {
    mockPrisma.deductionType.count.mockResolvedValue(0);
    await ensureDefaultDeductionTypes("novatech");
    const seeded = mockPrisma.deductionType.createMany.mock.calls[0][0].data;
    expect(seeded.some((d: { name: string }) => d.name === "PAYE")).toBe(true);
  });
});
