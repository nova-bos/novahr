"use client";

import * as React from "react";
import type {
  ActivityItem,
  Employee,
  LeaveRequest,
  LeaveStatus,
  NotificationItem,
  PayrollRun,
  Payslip,
} from "../types";
import {
  activityFeed as initialActivity,
  employees as initialEmployees,
  getTenant,
  leaveRequests as initialLeaveRequests,
  notifications as initialNotifications,
  payrollRuns as initialPayrollRuns,
  payslips as initialPayslips,
} from "../data";
import { buildPayslip, incrementPeriod } from "../payroll-calc";

export interface AppState {
  tenantId: string;
  employees: Employee[];
  leaveRequests: LeaveRequest[];
  payrollRuns: PayrollRun[];
  payslips: Payslip[];
  activity: ActivityItem[];
  notifications: NotificationItem[];
}

const PAYROLL_OWNER: Record<string, string> = {
  novatech: "Werner Botha",
  apex: "Thandiwe Mokoena",
  horizon: "Annelie Joubert",
};

type Action =
  | { type: "SET_TENANT"; tenantId: string }
  | { type: "ADD_EMPLOYEE"; employee: Employee }
  | { type: "UPDATE_EMPLOYEE"; id: string; updates: Partial<Employee> }
  | { type: "TOGGLE_ONBOARDING_STEP"; employeeId: string; stepId: string }
  | { type: "ADD_LEAVE_REQUEST"; request: LeaveRequest }
  | {
      type: "DECIDE_LEAVE_REQUEST";
      id: string;
      status: Extract<LeaveStatus, "approved" | "rejected">;
      decidedBy: string;
      decisionNote?: string;
    }
  | { type: "START_PAYROLL_RUN"; runId: string }
  | { type: "COMPLETE_PAYROLL_RUN"; runId: string }
  | { type: "MARK_NOTIFICATION_READ"; id: string }
  | { type: "MARK_ALL_NOTIFICATIONS_READ"; tenantId: string };

const initialState: AppState = {
  tenantId: "novatech",
  employees: initialEmployees,
  leaveRequests: initialLeaveRequests,
  payrollRuns: initialPayrollRuns,
  payslips: initialPayslips,
  activity: initialActivity,
  notifications: initialNotifications,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_TENANT":
      return { ...state, tenantId: action.tenantId };

    case "ADD_EMPLOYEE": {
      const employee = action.employee;
      const isOnboarding = employee.status === "probation";
      const newActivity: ActivityItem = {
        id: `${employee.tenantId}-act-${Date.now()}`,
        tenantId: employee.tenantId,
        type: isOnboarding ? "onboarding" : "hire",
        message: isOnboarding
          ? `started onboarding as ${employee.jobTitle}`
          : `joined as ${employee.jobTitle}`,
        actor: `${employee.firstName} ${employee.lastName}`,
        employeeId: employee.id,
        timestamp: new Date().toISOString(),
      };
      const newNotification: NotificationItem = {
        id: `${employee.tenantId}-notif-${Date.now()}`,
        tenantId: employee.tenantId,
        title: isOnboarding ? "New team member onboarding" : "New employee added",
        description: `${employee.firstName} ${employee.lastName} ${
          isOnboarding ? "started onboarding as" : "joined as"
        } ${employee.jobTitle}.`,
        timestamp: new Date().toISOString(),
        read: false,
        type: "info",
      };
      return {
        ...state,
        employees: [...state.employees, employee],
        activity: [newActivity, ...state.activity],
        notifications: [newNotification, ...state.notifications],
      };
    }

    case "UPDATE_EMPLOYEE": {
      const { salary, bankDetails, emergencyContact, ...rest } = action.updates;
      return {
        ...state,
        employees: state.employees.map((employee) => {
          if (employee.id !== action.id) return employee;
          return {
            ...employee,
            ...rest,
            salary: salary ? { ...employee.salary, ...salary } : employee.salary,
            bankDetails: bankDetails
              ? { ...employee.bankDetails, ...bankDetails }
              : employee.bankDetails,
            emergencyContact: emergencyContact
              ? { ...employee.emergencyContact, ...emergencyContact }
              : employee.emergencyContact,
          };
        }),
      };
    }

    case "TOGGLE_ONBOARDING_STEP": {
      let graduatedEmployee: Employee | undefined;
      const employees = state.employees.map((employee) => {
        if (employee.id !== action.employeeId || !employee.onboarding) return employee;
        const steps = employee.onboarding.steps.map((step) =>
          step.id === action.stepId ? { ...step, complete: !step.complete } : step
        );
        const completeCount = steps.filter((step) => step.complete).length;
        const progress = Math.round((completeCount / steps.length) * 100);
        const updated: Employee = {
          ...employee,
          status: progress === 100 ? "active" : employee.status,
          onboarding: { ...employee.onboarding, steps, progress },
        };
        if (progress === 100 && employee.status !== "active") {
          graduatedEmployee = updated;
        }
        return updated;
      });

      if (!graduatedEmployee) {
        return { ...state, employees };
      }

      const newActivity: ActivityItem = {
        id: `${graduatedEmployee.tenantId}-act-${Date.now()}`,
        tenantId: graduatedEmployee.tenantId,
        type: "onboarding",
        message: "completed onboarding and is now fully active",
        actor: `${graduatedEmployee.firstName} ${graduatedEmployee.lastName}`,
        employeeId: graduatedEmployee.id,
        timestamp: new Date().toISOString(),
      };
      return {
        ...state,
        employees,
        activity: [newActivity, ...state.activity],
      };
    }

    case "ADD_LEAVE_REQUEST": {
      const request = action.request;
      const newActivity: ActivityItem = {
        id: `${request.tenantId}-act-${Date.now()}`,
        tenantId: request.tenantId,
        type: "leave_request",
        message: `requested ${request.days} day${request.days > 1 ? "s" : ""} of ${leaveTypeLabel(
          request.type
        )}`,
        actor: employeeName(state.employees, request.employeeId),
        employeeId: request.employeeId,
        timestamp: new Date().toISOString(),
      };
      const newNotification: NotificationItem = {
        id: `${request.tenantId}-notif-${Date.now()}`,
        tenantId: request.tenantId,
        title: "Leave request awaiting approval",
        description: `${employeeName(state.employees, request.employeeId)} requested ${
          request.days
        } day${request.days > 1 ? "s" : ""} of ${leaveTypeLabel(request.type)}.`,
        timestamp: new Date().toISOString(),
        read: false,
        type: "warning",
      };
      return {
        ...state,
        leaveRequests: [request, ...state.leaveRequests],
        activity: [newActivity, ...state.activity],
        notifications: [newNotification, ...state.notifications],
      };
    }

    case "DECIDE_LEAVE_REQUEST": {
      const target = state.leaveRequests.find((r) => r.id === action.id);
      if (!target) return state;

      const leaveRequests = state.leaveRequests.map((request) =>
        request.id === action.id
          ? {
              ...request,
              status: action.status,
              decidedBy: action.decidedBy,
              decidedOn: new Date().toISOString().slice(0, 10),
              decisionNote: action.decisionNote,
            }
          : request
      );

      const employees =
        action.status === "approved"
          ? state.employees.map((employee) => {
              if (employee.id !== target.employeeId) return employee;
              return {
                ...employee,
                leaveBalances: employee.leaveBalances.map((balance) =>
                  balance.type === target.type
                    ? { ...balance, used: balance.used + target.days }
                    : balance
                ),
              };
            })
          : state.employees;

      const newActivity: ActivityItem = {
        id: `${target.tenantId}-act-${Date.now()}`,
        tenantId: target.tenantId,
        type: action.status === "approved" ? "leave_approved" : "leave_rejected",
        message: `${leaveTypeLabel(target.type)} request was ${action.status}`,
        actor: employeeName(state.employees, target.employeeId),
        employeeId: target.employeeId,
        timestamp: new Date().toISOString(),
      };

      return {
        ...state,
        employees,
        leaveRequests,
        activity: [newActivity, ...state.activity],
      };
    }

    case "START_PAYROLL_RUN": {
      return {
        ...state,
        payrollRuns: state.payrollRuns.map((run) =>
          run.id === action.runId ? { ...run, status: "processing" } : run
        ),
      };
    }

    case "COMPLETE_PAYROLL_RUN": {
      const run = state.payrollRuns.find((r) => r.id === action.runId);
      if (!run) return state;

      const tenant = getTenant(run.tenantId);
      const eligible = state.employees.filter(
        (e) => e.tenantId === run.tenantId && e.status !== "terminated" && e.startDate <= run.payDate
      );
      const newPayslips = eligible.map((e) => buildPayslip(e, run.id, run.period, run.payDate));

      const totalGross = round2(sum(newPayslips, (p) => p.grossPay));
      const totalDeductions = round2(sum(newPayslips, (p) => p.totalDeductions));
      const totalNet = round2(sum(newPayslips, (p) => p.netPay));
      const totalPaye = round2(sum(newPayslips, (p) => p.paye));
      const totalUif = round2(sum(newPayslips, (p) => p.uif));

      const completedRun: PayrollRun = {
        ...run,
        status: "completed",
        totalGross,
        totalDeductions,
        totalNet,
        totalPaye,
        totalUif,
        employeeCount: newPayslips.length,
        payslipIds: newPayslips.map((p) => p.id),
        processedOn: new Date().toISOString(),
      };

      const nextPeriod = incrementPeriod(run.period);
      const nextPayDate = `${nextPeriod}-${String(tenant.payDay).padStart(2, "0")}`;
      const nextRunId = `${run.tenantId}-run-${nextPeriod}`;
      const nextRunExists = state.payrollRuns.some((r) => r.id === nextRunId);
      const nextEligibleCount = state.employees.filter(
        (e) => e.tenantId === run.tenantId && e.status !== "terminated" && e.startDate <= nextPayDate
      ).length;

      const payrollRuns: PayrollRun[] = state.payrollRuns.map((r) =>
        r.id === run.id ? completedRun : r
      );
      if (!nextRunExists) {
        payrollRuns.push({
          id: nextRunId,
          tenantId: run.tenantId,
          period: nextPeriod,
          label: `${formatPeriodLabel(nextPeriod)} Payroll`,
          payDate: nextPayDate,
          status: "scheduled",
          totalGross: 0,
          totalDeductions: 0,
          totalNet: 0,
          totalPaye: 0,
          totalUif: 0,
          employeeCount: nextEligibleCount,
          payslipIds: [],
        });
      }

      const newActivity: ActivityItem = {
        id: `${run.tenantId}-act-${Date.now()}`,
        tenantId: run.tenantId,
        type: "payroll_run",
        message: `processed payroll for ${formatPeriodLabel(run.period)}`,
        actor: PAYROLL_OWNER[run.tenantId] ?? "Payroll Team",
        timestamp: new Date().toISOString(),
      };

      const newNotification: NotificationItem = {
        id: `${run.tenantId}-notif-${Date.now()}`,
        tenantId: run.tenantId,
        title: "Payslips published",
        description: `${formatPeriodLabel(run.period)} payslips have been generated for ${
          newPayslips.length
        } employees.`,
        timestamp: new Date().toISOString(),
        read: false,
        type: "success",
      };

      return {
        ...state,
        payrollRuns,
        payslips: [...state.payslips, ...newPayslips],
        activity: [newActivity, ...state.activity],
        notifications: [newNotification, ...state.notifications],
      };
    }

    case "MARK_NOTIFICATION_READ":
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === action.id ? { ...n, read: true } : n
        ),
      };

    case "MARK_ALL_NOTIFICATIONS_READ":
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.tenantId === action.tenantId ? { ...n, read: true } : n
        ),
      };

    default:
      return state;
  }
}

function sum<T>(items: T[], selector: (item: T) => number): number {
  return items.reduce((acc, item) => acc + selector(item), 0);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function employeeName(employees: Employee[], id: string): string {
  const employee = employees.find((e) => e.id === id);
  return employee ? `${employee.firstName} ${employee.lastName}` : "Unknown employee";
}

function leaveTypeLabel(type: LeaveRequest["type"]): string {
  switch (type) {
    case "annual":
      return "annual leave";
    case "sick":
      return "sick leave";
    case "unpaid":
      return "unpaid leave";
    case "family":
      return "family responsibility leave";
  }
}

function formatPeriodLabel(period: string): string {
  const [year, month] = period.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat("en-ZA", { month: "long", year: "numeric" }).format(date);
}

interface AppContextValue {
  state: AppState;
  setTenant: (tenantId: string) => void;
  addEmployee: (employee: Employee) => void;
  updateEmployee: (id: string, updates: Partial<Employee>) => void;
  toggleOnboardingStep: (employeeId: string, stepId: string) => void;
  addLeaveRequest: (request: LeaveRequest) => void;
  decideLeaveRequest: (
    id: string,
    status: Extract<LeaveStatus, "approved" | "rejected">,
    decidedBy: string,
    decisionNote?: string
  ) => void;
  startPayrollRun: (runId: string) => void;
  completePayrollRun: (runId: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (tenantId: string) => void;
}

const AppContext = React.createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(reducer, initialState);

  const value = React.useMemo<AppContextValue>(
    () => ({
      state,
      setTenant: (tenantId) => dispatch({ type: "SET_TENANT", tenantId }),
      addEmployee: (employee) => dispatch({ type: "ADD_EMPLOYEE", employee }),
      updateEmployee: (id, updates) => dispatch({ type: "UPDATE_EMPLOYEE", id, updates }),
      toggleOnboardingStep: (employeeId, stepId) =>
        dispatch({ type: "TOGGLE_ONBOARDING_STEP", employeeId, stepId }),
      addLeaveRequest: (request) => dispatch({ type: "ADD_LEAVE_REQUEST", request }),
      decideLeaveRequest: (id, status, decidedBy, decisionNote) =>
        dispatch({ type: "DECIDE_LEAVE_REQUEST", id, status, decidedBy, decisionNote }),
      startPayrollRun: (runId) => dispatch({ type: "START_PAYROLL_RUN", runId }),
      completePayrollRun: (runId) => dispatch({ type: "COMPLETE_PAYROLL_RUN", runId }),
      markNotificationRead: (id) => dispatch({ type: "MARK_NOTIFICATION_READ", id }),
      markAllNotificationsRead: (tenantId) =>
        dispatch({ type: "MARK_ALL_NOTIFICATIONS_READ", tenantId }),
    }),
    [state]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = React.useContext(AppContext);
  if (!context) throw new Error("useApp must be used within an AppProvider");
  return context;
}
