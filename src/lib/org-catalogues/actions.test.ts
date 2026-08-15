import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  jobPosition: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn().mockResolvedValue({ count: 0 }),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/db-context", () => ({
  runAsTenant: vi.fn((_tenantId: string, fn: (tx: unknown) => unknown) => fn(mockPrisma)),
}));
vi.mock("@/lib/auth/require", () => ({
  requireRole: vi.fn(async () => ({ tenantId: "novatech", role: "hr", name: "HR" })),
  requireActiveSubscription: vi.fn(async () => {}),
}));

import { seedDefaultJobPositionsAction, createJobPositionAction } from "./actions";
import { DEFAULT_JOB_POSITIONS } from "./defaults";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("seedDefaultJobPositionsAction", () => {
  it("adds every default when the catalogue is empty", async () => {
    mockPrisma.jobPosition.findMany.mockResolvedValue([]);
    const res = await seedDefaultJobPositionsAction();
    expect(res).toEqual({ added: DEFAULT_JOB_POSITIONS.length, skipped: 0 });
    expect(mockPrisma.jobPosition.createMany).toHaveBeenCalledTimes(1);
    const arg = mockPrisma.jobPosition.createMany.mock.calls[0][0];
    expect(arg.data).toHaveLength(DEFAULT_JOB_POSITIONS.length);
    expect(arg.data[0]).toMatchObject({ tenantId: "novatech" });
  });

  it("skips titles that already exist, case-insensitively", async () => {
    mockPrisma.jobPosition.findMany.mockResolvedValue([
      { title: "accountant" },
      { title: "DRIVER" },
    ]);
    const res = await seedDefaultJobPositionsAction();
    expect(res.skipped).toBe(2);
    expect(res.added).toBe(DEFAULT_JOB_POSITIONS.length - 2);
  });

  it("does not create anything when everything already exists", async () => {
    mockPrisma.jobPosition.findMany.mockResolvedValue(
      DEFAULT_JOB_POSITIONS.map((title) => ({ title }))
    );
    const res = await seedDefaultJobPositionsAction();
    expect(res).toEqual({ added: 0, skipped: DEFAULT_JOB_POSITIONS.length });
    expect(mockPrisma.jobPosition.createMany).not.toHaveBeenCalled();
  });
});

describe("createJobPositionAction", () => {
  it("rejects a duplicate title", async () => {
    mockPrisma.jobPosition.findFirst.mockResolvedValue({ id: "p1", title: "Accountant" });
    await expect(createJobPositionAction({ title: "Accountant" })).rejects.toThrow(/already exists/);
  });

  it("rejects a title that is too short", async () => {
    await expect(createJobPositionAction({ title: "A" })).rejects.toThrow(/at least 2/);
  });

  it("creates a new position", async () => {
    mockPrisma.jobPosition.findFirst.mockResolvedValue(null);
    mockPrisma.jobPosition.create.mockResolvedValue({
      id: "p2",
      title: "Fleet Controller",
      grade: null,
      isActive: true,
    });
    const res = await createJobPositionAction({ title: "Fleet Controller" });
    expect(res).toMatchObject({ id: "p2", title: "Fleet Controller", isActive: true });
  });
});
