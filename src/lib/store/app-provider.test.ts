import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {}, default: {} }));

import { initialState, reducer, type AppState } from "./app-provider";
import type {
  ActivityItem,
  Department,
  Employee,
  LeaveRequest,
  NotificationItem,
  PayrollRun,
  Payslip,
  Tenant,
} from "../types";
import type { TenantWorkspace } from "../workspace/actions";

function makeTenant(overrides: Partial<Tenant> = {}): Tenant {
  return {
    id: "novatech",
    name: "NovaTech Solutions",
    legalName: "NovaTech Solutions (Pty) Ltd",
    initials: "NT",
    industry: "Software & Technology",
    color: "#4C6FFF",
    founded: "2018",
    currency: "ZAR",
    payFrequency: "monthly",
    registrationNumber: "2018/123456/07",
    vatNumber: "4480123456",
    address: "12 Bree Street, Cape Town, 8001",
    city: "Cape Town",
    payDay: 25,
    bankName: "First National Bank",
    primaryContact: "Lerato Dlamini",
    ...overrides,
  };
}

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: "emp-1",
    tenantId: "novatech",
    employeeNumber: "NT-0001",
    firstName: "Aisha",
    lastName: "Patel",
    email: "aisha.patel@example.com",
    phone: "+27 71 000 0000",
    avatarColor: "#4C6FFF",
    initials: "AP",
    jobTitle: "Software Engineer",
    department: "Engineering",
    employmentType: "full_time",
    status: "active",
    startDate: "2024-01-15",
    location: "Cape Town",
    salary: { annualGross: 600_000, currency: "ZAR", payFrequency: "monthly" },
    bankDetails: { bank: "Standard Bank", accountNumber: "1234567890", branchCode: "051001", accountType: "Cheque" },
    taxNumber: "1234567890",
    idNumber: "9001015800082",
    address: "1 Main Street, Cape Town",
    emergencyContact: { name: "John Patel", relationship: "Spouse", phone: "+27 71 111 1111" },
    leaveBalances: [
      { type: "annual", total: 18, used: 0 },
      { type: "sick", total: 10, used: 0 },
      { type: "unpaid", total: 5, used: 0 },
      { type: "family", total: 3, used: 0 },
    ],
    ...overrides,
  };
}

function makeActivity(overrides: Partial<ActivityItem> = {}): ActivityItem {
  return {
    id: "activity-1",
    tenantId: "novatech",
    type: "hire",
    message: "joined as Software Engineer",
    actor: "Lerato Dlamini",
    timestamp: "2026-06-15T08:00:00.000Z",
    ...overrides,
  };
}

function makeNotification(overrides: Partial<NotificationItem> = {}): NotificationItem {
  return {
    id: "notif-1",
    tenantId: "novatech",
    title: "New hire",
    description: "Aisha Patel joined as Software Engineer.",
    timestamp: "2026-06-15T08:00:00.000Z",
    read: false,
    type: "info",
    ...overrides,
  };
}

function makeLeaveRequest(overrides: Partial<LeaveRequest> = {}): LeaveRequest {
  return {
    id: "leave-1",
    tenantId: "novatech",
    employeeId: "emp-1",
    type: "annual",
    startDate: "2026-07-01",
    endDate: "2026-07-05",
    days: 5,
    reason: "Family vacation",
    status: "pending",
    appliedOn: "2026-06-15",
    ...overrides,
  };
}

function makePayrollRun(overrides: Partial<PayrollRun> = {}): PayrollRun {
  return {
    id: "novatech-run-2026-06",
    tenantId: "novatech",
    period: "2026-06",
    label: "June 2026 Payroll",
    payDate: "2026-06-25",
    status: "scheduled",
    totalGross: 0,
    totalDeductions: 0,
    totalNet: 0,
    totalPaye: 0,
    totalUif: 0,
    employeeCount: 1,
    payslipIds: [],
    ...overrides,
  };
}

function makePayslip(overrides: Partial<Payslip> = {}): Payslip {
  return {
    id: "novatech-run-2026-06-emp-1",
    tenantId: "novatech",
    runId: "novatech-run-2026-06",
    employeeId: "emp-1",
    period: "2026-06",
    payDate: "2026-06-25",
    basicSalary: 50_000,
    earnings: [],
    deductions: [
      { label: "PAYE (Income Tax)", amount: 11_302.67 },
      { label: "UIF Contribution", amount: 177.12 },
    ],
    grossPay: 50_000,
    totalDeductions: 11_479.79,
    netPay: 38_520.21,
    paye: 11_302.67,
    uif: 177.12,
    ...overrides,
  };
}

function makeWorkspace(overrides: Partial<TenantWorkspace> = {}): TenantWorkspace {
  return {
    currentTenant: makeTenant(),
    employees: [makeEmployee()],
    departments: [],
    leaveRequests: [],
    payrollRuns: [],
    payslips: [],
    activity: [],
    notifications: [],
    ...overrides,
  };
}

function withState(overrides: Partial<AppState> = {}): AppState {
  return { ...initialState, ...overrides };
}

describe("SET_TENANT", () => {
  it("switches the tenant id and clears all workspace data", () => {
    const state = withState({
      tenantId: "novatech",
      currentTenant: makeTenant(),
      employees: [makeEmployee()],
      departments: [{ id: "dept-1", tenantId: "novatech", name: "Eng", description: "", color: "#000", budget: 0 }] as Department[],
      leaveRequests: [makeLeaveRequest()],
      payrollRuns: [makePayrollRun()],
      payslips: [makePayslip()],
      activity: [makeActivity()],
      notifications: [makeNotification()],
    });

    const next = reducer(state, { type: "SET_TENANT", tenantId: "apex" });

    expect(next.tenantId).toBe("apex");
    expect(next.currentTenant).toBeNull();
    expect(next.employees).toEqual([]);
    expect(next.departments).toEqual([]);
    expect(next.leaveRequests).toEqual([]);
    expect(next.payrollRuns).toEqual([]);
    expect(next.payslips).toEqual([]);
    expect(next.activity).toEqual([]);
    expect(next.notifications).toEqual([]);
  });
});

describe("SET_WORKSPACE", () => {
  it("clears the current tenant when the workspace is null", () => {
    const state = withState({ currentTenant: makeTenant() });
    const next = reducer(state, { type: "SET_WORKSPACE", workspace: null });
    expect(next.currentTenant).toBeNull();
  });

  it("spreads a populated workspace into state", () => {
    const workspace = makeWorkspace();
    const next = reducer(initialState, { type: "SET_WORKSPACE", workspace });

    expect(next.currentTenant).toEqual(workspace.currentTenant);
    expect(next.employees).toEqual(workspace.employees);
    expect(next.tenantId).toBe(initialState.tenantId);
  });
});

describe("EMPLOYEE_ADDED", () => {
  it("appends the employee and prepends activity/notification", () => {
    const state = withState({ employees: [makeEmployee({ id: "emp-1" })] });
    const newEmployee = makeEmployee({ id: "emp-2", firstName: "Bongani", lastName: "Khumalo" });
    const activity = makeActivity({ id: "activity-2", message: "joined as Software Engineer" });
    const notification = makeNotification({ id: "notif-2" });

    const next = reducer(state, {
      type: "EMPLOYEE_ADDED",
      employee: newEmployee,
      activity,
      notification,
    });

    expect(next.employees.map((e) => e.id)).toEqual(["emp-1", "emp-2"]);
    expect(next.activity[0]).toEqual(activity);
    expect(next.notifications[0]).toEqual(notification);
  });
});

describe("EMPLOYEE_UPDATED", () => {
  it("replaces the matching employee in place", () => {
    const state = withState({ employees: [makeEmployee({ id: "emp-1", jobTitle: "Engineer" })] });
    const updated = makeEmployee({ id: "emp-1", jobTitle: "Senior Engineer" });

    const next = reducer(state, { type: "EMPLOYEE_UPDATED", employee: updated });

    expect(next.employees).toEqual([updated]);
  });

  it("leaves other employees untouched", () => {
    const other = makeEmployee({ id: "emp-2" });
    const state = withState({ employees: [makeEmployee({ id: "emp-1" }), other] });
    const updated = makeEmployee({ id: "emp-1", jobTitle: "Senior Engineer" });

    const next = reducer(state, { type: "EMPLOYEE_UPDATED", employee: updated });

    expect(next.employees).toEqual([updated, other]);
  });
});

describe("ONBOARDING_STEP_TOGGLED", () => {
  it("updates the employee without adding activity when none is provided", () => {
    const state = withState({ employees: [makeEmployee({ id: "emp-1" })], activity: [] });
    const updated = makeEmployee({ id: "emp-1", status: "probation" });

    const next = reducer(state, { type: "ONBOARDING_STEP_TOGGLED", employee: updated });

    expect(next.employees).toEqual([updated]);
    expect(next.activity).toEqual([]);
  });

  it("prepends activity when the employee graduates from onboarding", () => {
    const state = withState({ employees: [makeEmployee({ id: "emp-1" })], activity: [] });
    const updated = makeEmployee({ id: "emp-1", status: "active" });
    const activity = makeActivity({ id: "activity-graduate", message: "completed onboarding and is now fully active" });

    const next = reducer(state, { type: "ONBOARDING_STEP_TOGGLED", employee: updated, activity });

    expect(next.employees).toEqual([updated]);
    expect(next.activity).toEqual([activity]);
  });
});

describe("LEAVE_REQUEST_ADDED", () => {
  it("prepends the leave request, activity, and notification", () => {
    const state = withState({ leaveRequests: [], activity: [], notifications: [] });
    const leaveRequest = makeLeaveRequest();
    const activity = makeActivity({ type: "leave_request", message: "requested 5 day(s) of annual leave" });
    const notification = makeNotification({ title: "Leave request awaiting approval" });

    const next = reducer(state, {
      type: "LEAVE_REQUEST_ADDED",
      leaveRequest,
      activity,
      notification,
    });

    expect(next.leaveRequests).toEqual([leaveRequest]);
    expect(next.activity).toEqual([activity]);
    expect(next.notifications).toEqual([notification]);
  });
});

describe("LEAVE_REQUEST_DECIDED", () => {
  it("updates the leave request and prepends activity", () => {
    const pending = makeLeaveRequest({ status: "pending" });
    const state = withState({ leaveRequests: [pending], activity: [] });
    const decided = makeLeaveRequest({ status: "approved", decidedBy: "Lerato Dlamini", decidedOn: "2026-06-16" });
    const activity = makeActivity({ type: "leave_approved", message: "annual leave request was approved" });

    const next = reducer(state, {
      type: "LEAVE_REQUEST_DECIDED",
      leaveRequest: decided,
      activity,
    });

    expect(next.leaveRequests).toEqual([decided]);
    expect(next.activity).toEqual([activity]);
  });

  it("patches the matching employee's leave balance when approved", () => {
    const employee = makeEmployee({
      id: "emp-1",
      leaveBalances: [
        { type: "annual", total: 18, used: 0 },
        { type: "sick", total: 10, used: 0 },
        { type: "unpaid", total: 5, used: 0 },
        { type: "family", total: 3, used: 0 },
      ],
    });
    const state = withState({
      employees: [employee],
      leaveRequests: [makeLeaveRequest({ status: "pending" })],
      activity: [],
    });
    const decided = makeLeaveRequest({ status: "approved" });
    const activity = makeActivity({ type: "leave_approved" });

    const next = reducer(state, {
      type: "LEAVE_REQUEST_DECIDED",
      leaveRequest: decided,
      leaveBalance: { employeeId: "emp-1", type: "annual", used: 5 },
      activity,
    });

    expect(next.employees[0].leaveBalances).toEqual([
      { type: "annual", total: 18, used: 5 },
      { type: "sick", total: 10, used: 0 },
      { type: "unpaid", total: 5, used: 0 },
      { type: "family", total: 3, used: 0 },
    ]);
  });
});

describe("PAYROLL_RUN_STARTED", () => {
  it("replaces the matching payroll run", () => {
    const state = withState({ payrollRuns: [makePayrollRun({ id: "run-1", status: "scheduled" })] });
    const updated = makePayrollRun({ id: "run-1", status: "processing" });

    const next = reducer(state, { type: "PAYROLL_RUN_STARTED", payrollRun: updated });

    expect(next.payrollRuns).toEqual([updated]);
  });
});

describe("PAYROLL_RUN_COMPLETED", () => {
  it("updates the run, appends payslips, and prepends activity/notification", () => {
    const state = withState({
      payrollRuns: [makePayrollRun({ id: "run-2026-06", status: "processing" })],
      payslips: [],
      activity: [],
      notifications: [],
    });
    const completedRun = makePayrollRun({ id: "run-2026-06", status: "completed" });
    const payslip = makePayslip();
    const activity = makeActivity({ type: "payroll_run", message: "processed payroll for June 2026" });
    const notification = makeNotification({ title: "Payslips published" });

    const next = reducer(state, {
      type: "PAYROLL_RUN_COMPLETED",
      payrollRun: completedRun,
      payslips: [payslip],
      activity,
      notification,
    });

    expect(next.payrollRuns).toEqual([completedRun]);
    expect(next.payslips).toEqual([payslip]);
    expect(next.activity).toEqual([activity]);
    expect(next.notifications).toEqual([notification]);
  });

  it("appends a newly scheduled next run when provided", () => {
    const state = withState({
      payrollRuns: [makePayrollRun({ id: "run-2026-06", status: "processing" })],
    });
    const completedRun = makePayrollRun({ id: "run-2026-06", status: "completed" });
    const nextRun = makePayrollRun({ id: "run-2026-07", period: "2026-07", status: "scheduled" });

    const next = reducer(state, {
      type: "PAYROLL_RUN_COMPLETED",
      payrollRun: completedRun,
      payslips: [],
      nextRun,
      activity: makeActivity(),
      notification: makeNotification(),
    });

    expect(next.payrollRuns.map((r) => r.id)).toEqual(["run-2026-06", "run-2026-07"]);
  });
});

describe("NOTIFICATION_READ", () => {
  it("marks only the matching notification as read", () => {
    const state = withState({
      notifications: [makeNotification({ id: "notif-1", read: false }), makeNotification({ id: "notif-2", read: false })],
    });

    const next = reducer(state, { type: "NOTIFICATION_READ", id: "notif-1" });

    expect(next.notifications).toEqual([
      makeNotification({ id: "notif-1", read: true }),
      makeNotification({ id: "notif-2", read: false }),
    ]);
  });
});

describe("ALL_NOTIFICATIONS_READ", () => {
  it("marks every notification for the tenant as read", () => {
    const state = withState({
      notifications: [
        makeNotification({ id: "notif-1", tenantId: "novatech", read: false }),
        makeNotification({ id: "notif-2", tenantId: "apex", read: false }),
      ],
    });

    const next = reducer(state, { type: "ALL_NOTIFICATIONS_READ", tenantId: "novatech" });

    expect(next.notifications).toEqual([
      makeNotification({ id: "notif-1", tenantId: "novatech", read: true }),
      makeNotification({ id: "notif-2", tenantId: "apex", read: false }),
    ]);
  });
});
