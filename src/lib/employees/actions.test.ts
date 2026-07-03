import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeEmployee, makeEmployeeRow } from "../workspace/test-fixtures";

const mockPrisma = vi.hoisted(() => {
  const tx = {
    tenant: { findUniqueOrThrow: vi.fn().mockResolvedValue({ name: "NovaTech Solutions" }) },
    employee: { create: vi.fn(), update: vi.fn(), findUniqueOrThrow: vi.fn(), count: vi.fn().mockResolvedValue(0) },
    activityItem: { create: vi.fn() },
    notificationItem: { create: vi.fn() },
  };
  return { ...tx, $transaction: vi.fn((cb: (t: typeof tx) => unknown) => cb(tx)) };
});

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
  requireEmployeeScope: vi.fn(async () => mockSession.current),
  requireTenant: vi.fn(async () => mockSession.current),
}));


import { createEmployeeRecord, toggleOnboardingStepRecord, updateEmployeeRecord } from "./actions";

beforeEach(() => {
  vi.clearAllMocks();
});

function makeActivityRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "activity-1",
    tenantId: "novatech",
    type: "hire",
    message: "joined as Software Engineer",
    actor: "Aisha Patel",
    employeeId: "emp-1",
    timestamp: new Date("2026-06-15T08:00:00Z"),
    ...overrides,
  };
}

function makeNotificationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "notif-1",
    tenantId: "novatech",
    title: "New employee added",
    description: "Aisha Patel joined as Software Engineer.",
    timestamp: new Date("2026-06-15T08:00:00Z"),
    read: false,
    type: "info",
    ...overrides,
  };
}

describe("createEmployeeRecord", () => {
  it("creates a hire activity and notification for an active employee", async () => {
    const input = makeEmployee({ status: "active" });
    const createdRow = makeEmployeeRow({ status: "active" });
    mockPrisma.employee.create.mockResolvedValue(createdRow);
    mockPrisma.activityItem.create.mockResolvedValue(makeActivityRow());
    mockPrisma.notificationItem.create.mockResolvedValue(makeNotificationRow());

    const result = await createEmployeeRecord(input);

    expect(result.employee.id).toBe(createdRow.id);
    expect(result.activity.type).toBe("hire");
    expect(result.activity.message).toBe("joined as Software Engineer");
    expect(result.notification.title).toBe("New employee added");

    expect(mockPrisma.employee.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: input.tenantId,
        firstName: "Aisha",
        lastName: "Patel",
        status: "active",
        startDate: new Date("2024-01-15"),
        leaveBalances: { create: input.leaveBalances },
      }),
      include: { leaveBalances: true },
    });
    expect(mockPrisma.activityItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: "hire", message: "joined as Software Engineer" }),
    });
  });

  it("creates an onboarding activity and notification for a probation employee", async () => {
    const input = makeEmployee({ status: "probation", jobTitle: "Account Manager" });
    const createdRow = makeEmployeeRow({ status: "probation", jobTitle: "Account Manager" });
    mockPrisma.employee.create.mockResolvedValue(createdRow);
    mockPrisma.activityItem.create.mockResolvedValue(
      makeActivityRow({ type: "onboarding", message: "started onboarding as Account Manager" })
    );
    mockPrisma.notificationItem.create.mockResolvedValue(
      makeNotificationRow({ title: "New team member onboarding" })
    );

    const result = await createEmployeeRecord(input);

    expect(result.activity.type).toBe("onboarding");
    expect(result.activity.message).toBe("started onboarding as Account Manager");
    expect(result.notification.title).toBe("New team member onboarding");

    expect(mockPrisma.activityItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: "onboarding", message: "started onboarding as Account Manager" }),
    });
    expect(mockPrisma.notificationItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ title: "New team member onboarding" }),
    });
  });
});

describe("updateEmployeeRecord", () => {
  it("flattens nested salary, bankDetails, emergencyContact, and startDate updates", async () => {
    const updatedRow = makeEmployeeRow({ jobTitle: "Senior Engineer" });
    mockPrisma.employee.update.mockResolvedValue(updatedRow);

    const result = await updateEmployeeRecord("emp-1", {
      jobTitle: "Senior Engineer",
      startDate: "2024-02-01",
      salary: { annualGross: 700_000, currency: "ZAR", payFrequency: "monthly", travelAllowance: 2_000 },
      bankDetails: { bank: "Capitec", accountNumber: "111", branchCode: "470010", accountType: "Savings", validated: false, validatedAt: null },
      emergencyContact: { name: "Jane Doe", relationship: "Sister", phone: "+27 82 000 0000" },
    });

    expect(mockPrisma.employee.update).toHaveBeenCalledWith({
      where: { id: "emp-1" },
      data: {
        jobTitle: "Senior Engineer",
        startDate: new Date("2024-02-01"),
        salaryAnnualGross: 700_000,
        salaryCurrency: "ZAR",
        salaryPayFrequency: "monthly",
        salaryTravelAllowance: 2_000,
        bankName: "Capitec",
        bankAccountNumber: "111",
        bankBranchCode: "470010",
        bankAccountType: "Savings",
        emergencyContactName: "Jane Doe",
        emergencyContactRelationship: "Sister",
        emergencyContactPhone: "+27 82 000 0000",
      },
      include: { leaveBalances: true },
    });
    expect(result.id).toBe(updatedRow.id);
  });

  it("only includes the given top-level fields when no nested updates are provided", async () => {
    const updatedRow = makeEmployeeRow({ jobTitle: "Team Lead" });
    mockPrisma.employee.update.mockResolvedValue(updatedRow);

    await updateEmployeeRecord("emp-1", { jobTitle: "Team Lead" });

    expect(mockPrisma.employee.update).toHaveBeenCalledWith({
      where: { id: "emp-1" },
      data: { jobTitle: "Team Lead" },
      include: { leaveBalances: true },
    });
  });
});

describe("toggleOnboardingStepRecord", () => {
  it("returns the employee unchanged when there is no onboarding plan", async () => {
    const existingRow = makeEmployeeRow({ onboarding: null });
    mockPrisma.employee.findUniqueOrThrow.mockResolvedValue(existingRow);

    const result = await toggleOnboardingStepRecord("emp-1", "personal-info");

    expect(result.activity).toBeUndefined();
    expect(result.employee.id).toBe(existingRow.id);
    expect(mockPrisma.employee.update).not.toHaveBeenCalled();
    expect(mockPrisma.activityItem.create).not.toHaveBeenCalled();
  });

  it("toggles a step without graduating when progress stays below 100%", async () => {
    const onboarding = {
      progress: 50,
      startDate: "2026-06-01",
      steps: [
        { id: "personal-info", label: "Personal information", complete: true },
        { id: "role-details", label: "Role and reporting line", complete: true },
        { id: "salary-setup", label: "Salary and banking setup", complete: true },
        { id: "documents", label: "Document collection", complete: false },
        { id: "equipment", label: "Equipment and access provisioning", complete: false },
        { id: "induction", label: "Induction and orientation", complete: false },
      ],
    };
    const existingRow = makeEmployeeRow({ status: "probation", onboarding });
    const updatedOnboarding = {
      ...onboarding,
      progress: 67,
      steps: onboarding.steps.map((step) =>
        step.id === "documents" ? { ...step, complete: true } : step
      ),
    };
    const updatedRow = makeEmployeeRow({ status: "probation", onboarding: updatedOnboarding });
    mockPrisma.employee.findUniqueOrThrow.mockResolvedValue(existingRow);
    mockPrisma.employee.update.mockResolvedValue(updatedRow);

    const result = await toggleOnboardingStepRecord("emp-1", "documents");

    expect(mockPrisma.employee.update).toHaveBeenCalledWith({
      where: { id: "emp-1" },
      data: {
        status: "probation",
        onboarding: expect.objectContaining({ progress: 67 }),
      },
      include: { leaveBalances: true },
    });
    expect(result.activity).toBeUndefined();
    expect(result.employee.onboarding?.progress).toBe(67);
    expect(mockPrisma.activityItem.create).not.toHaveBeenCalled();
  });

  it("marks the employee active and records a graduation activity at 100% progress", async () => {
    const onboarding = {
      progress: 83,
      startDate: "2026-06-01",
      steps: [
        { id: "personal-info", label: "Personal information", complete: true },
        { id: "role-details", label: "Role and reporting line", complete: true },
        { id: "salary-setup", label: "Salary and banking setup", complete: true },
        { id: "documents", label: "Document collection", complete: true },
        { id: "equipment", label: "Equipment and access provisioning", complete: true },
        { id: "induction", label: "Induction and orientation", complete: false },
      ],
    };
    const existingRow = makeEmployeeRow({
      status: "probation",
      onboarding,
      firstName: "Bongani",
      lastName: "Khumalo",
    });
    const updatedOnboarding = {
      ...onboarding,
      progress: 100,
      steps: onboarding.steps.map((step) =>
        step.id === "induction" ? { ...step, complete: true } : step
      ),
    };
    const updatedRow = makeEmployeeRow({
      status: "active",
      onboarding: updatedOnboarding,
      firstName: "Bongani",
      lastName: "Khumalo",
    });
    mockPrisma.employee.findUniqueOrThrow.mockResolvedValue(existingRow);
    mockPrisma.employee.update.mockResolvedValue(updatedRow);
    mockPrisma.activityItem.create.mockResolvedValue(
      makeActivityRow({
        type: "onboarding",
        message: "completed onboarding and is now fully active",
        actor: "Bongani Khumalo",
      })
    );

    const result = await toggleOnboardingStepRecord("emp-1", "induction");

    expect(mockPrisma.employee.update).toHaveBeenCalledWith({
      where: { id: "emp-1" },
      data: {
        status: "active",
        onboarding: expect.objectContaining({ progress: 100 }),
      },
      include: { leaveBalances: true },
    });
    expect(result.activity?.message).toBe("completed onboarding and is now fully active");
    expect(result.employee.status).toBe("active");
  });

  it("does not record a graduation activity if the employee is already active", async () => {
    const onboarding = {
      progress: 83,
      startDate: "2026-06-01",
      steps: [
        { id: "personal-info", label: "Personal information", complete: true },
        { id: "role-details", label: "Role and reporting line", complete: true },
        { id: "salary-setup", label: "Salary and banking setup", complete: true },
        { id: "documents", label: "Document collection", complete: true },
        { id: "equipment", label: "Equipment and access provisioning", complete: true },
        { id: "induction", label: "Induction and orientation", complete: false },
      ],
    };
    const existingRow = makeEmployeeRow({ status: "active", onboarding });
    const updatedOnboarding = {
      ...onboarding,
      progress: 100,
      steps: onboarding.steps.map((step) =>
        step.id === "induction" ? { ...step, complete: true } : step
      ),
    };
    const updatedRow = makeEmployeeRow({ status: "active", onboarding: updatedOnboarding });
    mockPrisma.employee.findUniqueOrThrow.mockResolvedValue(existingRow);
    mockPrisma.employee.update.mockResolvedValue(updatedRow);

    const result = await toggleOnboardingStepRecord("emp-1", "induction");

    expect(result.activity).toBeUndefined();
    expect(mockPrisma.activityItem.create).not.toHaveBeenCalled();
  });
});
