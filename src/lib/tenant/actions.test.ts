import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  tenant: { update: vi.fn() },
  payrollSettings: { findUnique: vi.fn(), upsert: vi.fn() },
  $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn(mockPrisma)),
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
    employeeId: undefined as string | undefined,
  },
}));

vi.mock("@/lib/auth/require", () => ({
  requireUser: vi.fn(async () => mockSession.current),
  requireRole: vi.fn(async () => mockSession.current),
  requireActiveSubscription: vi.fn(async () => {}),
  requireEmployeeScope: vi.fn(async () => mockSession.current),
  requireTenant: vi.fn(async () => mockSession.current),
}));


import { updateTenantPayrollSettings, updateTenantProfile } from "./actions";
import { makeTenantRow } from "@/lib/workspace/test-fixtures";
import { mapTenant } from "@/lib/workspace/mappers";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("updateTenantProfile", () => {
  it("calls prisma.tenant.update with the correct where and data", async () => {
    const row = makeTenantRow();
    mockPrisma.tenant.update.mockResolvedValue(row);

    await updateTenantProfile({ name: "NovaTech Solutions" });

    expect(mockPrisma.tenant.update).toHaveBeenCalledWith({
      where: { id: "novatech" },
      data: { name: "NovaTech Solutions" },
    });
  });

  it("returns the mapped Tenant", async () => {
    const row = makeTenantRow({ name: "Updated Name" });
    mockPrisma.tenant.update.mockResolvedValue(row);

    const result = await updateTenantProfile({ name: "Updated Name" });

    expect(result).toEqual(mapTenant(row));
  });

  it("passes all profile fields through to the update", async () => {
    const row = makeTenantRow();
    mockPrisma.tenant.update.mockResolvedValue(row);

    const data = {
      name: "Acme Corp",
      legalName: "Acme Corporation (Pty) Ltd",
      industry: "Retail",
      founded: "2020",
      registrationNumber: "2020/999999/07",
      vatNumber: "4480999999",
      city: "Johannesburg",
      address: "1 Commissioner Street, Johannesburg, 2001",
      primaryContact: "Jane Smith",
    };

    await updateTenantProfile(data);

    expect(mockPrisma.tenant.update).toHaveBeenCalledWith({
      where: { id: "novatech" },
      data,
    });
  });
});

describe("updateTenantPayrollSettings", () => {
  it("calls prisma.tenant.update with payroll fields only", async () => {
    const row = makeTenantRow();
    mockPrisma.tenant.update.mockResolvedValue(row);

    await updateTenantPayrollSettings({
      payFrequency: "monthly",
      payDay: 25,
      bankName: "First National Bank",
    });

    expect(mockPrisma.tenant.update).toHaveBeenCalledWith({
      where: { id: "novatech" },
      data: { payFrequency: "monthly", payDay: 25, bankName: "First National Bank" },
    });
  });

  it("returns the mapped Tenant", async () => {
    const row = makeTenantRow({ payDay: 28, bankName: "Absa Bank" });
    mockPrisma.tenant.update.mockResolvedValue(row);

    const result = await updateTenantPayrollSettings({ payDay: 28, bankName: "Absa Bank" });

    expect(result).toEqual(mapTenant(row));
  });
});
