import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CsvRow } from "./import-columns";
import { IMPORT_COLUMNS } from "./import-columns";

// A valid SA ID number (passes the Luhn checksum) reused across rows that create
// employees.
const VALID_ID = "8001015009087";

const mockPrisma = vi.hoisted(() => ({
  employee: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  tenantLeavePolicy: { findUnique: vi.fn().mockResolvedValue(null) },
  employeeNumberConfig: {
    upsert: vi.fn().mockResolvedValue({ prefix: "EMP", separator: "-", padLength: 4, nextNumber: 2 }),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/db-context", () => ({
  runAsTenant: vi.fn((_tenantId: string, fn: (tx: unknown) => unknown) => fn(mockPrisma)),
}));

vi.mock("@/lib/employee-numbers/actions", () => ({
  claimNextEmployeeNumber: vi.fn(async () => "EMP-0009"),
}));

const mockSession = vi.hoisted(() => ({
  current: {
    id: "user-1",
    tenantId: "tenant-a",
    role: "hr",
    name: "HR Admin",
    email: "hr@tenant-a.co.za",
    employeeId: undefined as string | undefined,
  },
}));

vi.mock("@/lib/auth/require", () => ({
  requireRole: vi.fn(async () => mockSession.current),
}));

import {
  importEmployeesFromCsvAction,
  previewEmployeeImportAction,
  exportEmployeeTemplateAction,
} from "./import-actions";

function baseRow(overrides: Partial<CsvRow> = {}): CsvRow {
  const row: CsvRow = {};
  for (const col of IMPORT_COLUMNS) row[col.key] = "";
  return {
    ...row,
    firstName: "Jane",
    lastName: "Doe",
    email: "jane.doe@company.co.za",
    phone: "0712345678",
    idNumber: VALID_ID,
    jobTitle: "Engineer",
    startDate: "2024-01-15",
    annualGross: "480000",
    bank: "FNB",
    accountNumber: "62012345678",
    branchCode: "250655",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.tenantLeavePolicy.findUnique.mockResolvedValue(null);
});

describe("importEmployeesFromCsvAction upsert", () => {
  it("creates a new employee when the employee number is blank", async () => {
    mockPrisma.employee.findMany.mockResolvedValue([]);
    mockPrisma.employee.create.mockResolvedValue({
      id: "new-1",
      email: "jane.doe@company.co.za",
      employeeNumber: "EMP-0009",
    });

    const res = await importEmployeesFromCsvAction([baseRow()]);

    expect(res.created).toBe(1);
    expect(res.updated).toBe(0);
    expect(res.imported).toBe(1);
    expect(mockPrisma.employee.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.employee.update).not.toHaveBeenCalled();
  });

  it("updates an existing employee when the employee number matches", async () => {
    mockPrisma.employee.findMany.mockResolvedValue([
      { id: "emp-1", email: "jane.doe@company.co.za", employeeNumber: "EMP-0001" },
    ]);
    mockPrisma.employee.update.mockResolvedValue({
      id: "emp-1",
      email: "jane.doe@company.co.za",
      employeeNumber: "EMP-0001",
    });

    const res = await importEmployeesFromCsvAction([
      baseRow({ employeeNumber: "EMP-0001", jobTitle: "Senior Engineer" }),
    ]);

    expect(res.updated).toBe(1);
    expect(res.created).toBe(0);
    expect(mockPrisma.employee.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "emp-1" },
        data: expect.objectContaining({ jobTitle: "Senior Engineer" }),
      })
    );
    expect(mockPrisma.employee.create).not.toHaveBeenCalled();
  });

  it("does not duplicate: the same email on the matched employee is not an error", async () => {
    mockPrisma.employee.findMany.mockResolvedValue([
      { id: "emp-1", email: "jane.doe@company.co.za", employeeNumber: "EMP-0001" },
    ]);

    const preview = await previewEmployeeImportAction([
      baseRow({ employeeNumber: "EMP-0001" }),
    ]);

    expect(preview.updates).toBe(1);
    expect(preview.creates).toBe(0);
    expect(preview.errors).toHaveLength(0);
  });

  it("flags an unknown employee number as an error and does not write", async () => {
    mockPrisma.employee.findMany.mockResolvedValue([]);

    const res = await importEmployeesFromCsvAction([
      baseRow({ employeeNumber: "EMP-9999" }),
    ]);

    expect(res.created).toBe(0);
    expect(res.updated).toBe(0);
    expect(res.errors.some((e) => e.field === "employeeNumber")).toBe(true);
    expect(mockPrisma.employee.create).not.toHaveBeenCalled();
    expect(mockPrisma.employee.update).not.toHaveBeenCalled();
  });

  it("flags an email that belongs to a different existing employee", async () => {
    mockPrisma.employee.findMany.mockResolvedValue([
      { id: "emp-1", email: "jane.doe@company.co.za", employeeNumber: "EMP-0001" },
      { id: "emp-2", email: "someone.else@company.co.za", employeeNumber: "EMP-0002" },
    ]);

    // Row updates EMP-0002 but tries to use EMP-0001's email.
    const preview = await previewEmployeeImportAction([
      baseRow({ employeeNumber: "EMP-0002", email: "jane.doe@company.co.za" }),
    ]);

    expect(preview.errors.some((e) => e.field === "email")).toBe(true);
  });

  it("accepts a passport holder without an SA ID number", async () => {
    mockPrisma.employee.findMany.mockResolvedValue([]);
    mockPrisma.employee.create.mockResolvedValue({
      id: "new-2",
      email: "foreign@company.co.za",
      employeeNumber: "EMP-0009",
    });

    const res = await importEmployeesFromCsvAction([
      baseRow({
        email: "foreign@company.co.za",
        idType: "passport",
        idNumber: "",
        passportNumber: "A01234567",
        nationality: "Zimbabwean",
        dateOfBirth: "1990-05-05",
      }),
    ]);

    expect(res.created).toBe(1);
    expect(res.errors).toHaveLength(0);
  });
});

describe("exportEmployeeTemplateAction", () => {
  it("returns a header-only template with one example row for an empty tenant", async () => {
    mockPrisma.employee.findMany.mockResolvedValue([]);

    const csv = await exportEmployeeTemplateAction();
    const lines = csv.split(/\r?\n/).filter(Boolean);

    expect(lines).toHaveLength(2); // header + example
    expect(lines[0].split(",")[0]).toBe("employeeNumber");
  });

  it("exports the current workforce keyed by employee number", async () => {
    mockPrisma.employee.findMany.mockResolvedValue([
      {
        id: "emp-1",
        tenantId: "tenant-a",
        employeeNumber: "EMP-0001",
        firstName: "Jane",
        lastName: "Doe",
        preferredName: null,
        email: "jane.doe@company.co.za",
        phone: "0712345678",
        idType: "sa_id",
        idNumber: VALID_ID,
        passportNumber: null,
        nationality: null,
        dateOfBirth: null,
        gender: null,
        maritalStatus: null,
        taxNumber: "1234567890",
        jobTitle: "Engineer",
        department: "Engineering",
        employmentType: "full_time",
        startDate: new Date("2024-01-15T00:00:00Z"),
        location: "Cape Town",
        managerId: null,
        salaryAnnualGross: { toString: () => "480000" },
        salaryPayFrequency: "monthly",
        salaryTravelAllowance: null,
        salaryHousingAllowance: null,
        salaryPensionContributionPct: null,
        salaryMedicalAid: null,
        salaryRetirementAnnuity: null,
        bankName: "FNB",
        bankAccountNumber: "62012345678",
        bankBranchCode: "250655",
        bankAccountType: "Cheque",
        address: "1 Main Road",
        emergencyContactName: "",
        emergencyContactRelationship: "",
        emergencyContactPhone: "",
        nextOfKinName: null,
        nextOfKinRelationship: null,
        nextOfKinPhone: null,
        nextOfKinAddress: null,
        equityRace: null,
        equityGender: null,
        occupationalLevel: null,
        foreignNational: false,
        hasDisability: false,
      },
    ]);

    const csv = await exportEmployeeTemplateAction();
    const lines = csv.split(/\r?\n/).filter(Boolean);

    expect(lines).toHaveLength(2); // header + one employee
    expect(lines[1].startsWith("EMP-0001,Jane,Doe")).toBe(true);
  });
});
