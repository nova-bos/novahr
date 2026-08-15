import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  payrollProfile: { findFirst: vi.fn(), upsert: vi.fn() },
  employee: { findFirst: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/db-context", () => ({
  runAsTenant: vi.fn((_t: string, fn: (tx: unknown) => unknown) => fn(mockPrisma)),
}));
vi.mock("@/lib/auth/require", () => ({
  requireTenant: vi.fn(async () => ({ tenantId: "novatech", role: "hr" })),
  requireActiveSubscription: vi.fn(async () => {}),
}));

import { getPayrollProfileAction, upsertPayrollProfileAction } from "./actions";

beforeEach(() => vi.clearAllMocks());

describe("getPayrollProfileAction", () => {
  it("returns null when there is no profile", async () => {
    mockPrisma.payrollProfile.findFirst.mockResolvedValue(null);
    expect(await getPayrollProfileAction("novatech", "emp1")).toBeNull();
  });

  it("maps a stored profile", async () => {
    mockPrisma.payrollProfile.findFirst.mockResolvedValue({
      id: "pp1",
      employeeId: "emp1",
      taxNumber: "1234567890",
      uifNumber: null,
      payFrequency: "monthly",
      medicalAidDependants: 2,
      medicalAidScheme: "Discovery",
      medicalAidNumber: "MED1",
      retirementFundName: null,
      retirementFundNumber: null,
      notes: null,
    });
    const res = await getPayrollProfileAction("novatech", "emp1");
    expect(res).toMatchObject({ id: "pp1", taxNumber: "1234567890", medicalAidDependants: 2 });
  });
});

describe("upsertPayrollProfileAction", () => {
  it("refuses to write a profile for an employee outside the tenant", async () => {
    mockPrisma.employee.findFirst.mockResolvedValue(null);
    const res = await upsertPayrollProfileAction("novatech", "foreign-emp", { taxNumber: "1" });
    expect(res).toEqual({ success: false, error: "Employee not found." });
    expect(mockPrisma.payrollProfile.upsert).not.toHaveBeenCalled();
  });

  it("upserts for an employee that belongs to the tenant", async () => {
    mockPrisma.employee.findFirst.mockResolvedValue({ id: "emp1" });
    mockPrisma.payrollProfile.upsert.mockResolvedValue({ id: "pp1" });
    const res = await upsertPayrollProfileAction("novatech", "emp1", { taxNumber: "9" });
    expect(res).toEqual({ success: true });
    // Create branch defaults the pay frequency to monthly.
    expect(mockPrisma.payrollProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ payFrequency: "monthly", medicalAidDependants: 0 }) })
    );
  });
});
