import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  tenant: { update: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

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

    await updateTenantProfile("novatech", { name: "NovaTech Solutions" });

    expect(mockPrisma.tenant.update).toHaveBeenCalledWith({
      where: { id: "novatech" },
      data: { name: "NovaTech Solutions" },
    });
  });

  it("returns the mapped Tenant", async () => {
    const row = makeTenantRow({ name: "Updated Name" });
    mockPrisma.tenant.update.mockResolvedValue(row);

    const result = await updateTenantProfile("novatech", { name: "Updated Name" });

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

    await updateTenantProfile("novatech", data);

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

    await updateTenantPayrollSettings("novatech", {
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

    const result = await updateTenantPayrollSettings("novatech", { payDay: 28, bankName: "Absa Bank" });

    expect(result).toEqual(mapTenant(row));
  });
});
