"use client";

import * as React from "react";
import type {
  ActivityItem,
  Department,
  Employee,
  LeaveRequest,
  LeaveStatus,
  LeaveType,
  NotificationItem,
  PayrollRun,
  Payslip,
  Tenant,
} from "../types";
import { createEmployeeRecord, toggleOnboardingStepRecord, updateEmployeeRecord } from "../employees/actions";
import { createLeaveRequestRecord, decideLeaveRequestRecord, type CreateLeaveRequestInput } from "../leave/actions";
import { completePayrollRunRecord, startPayrollRunRecord } from "../payroll/actions";
import { markAllNotificationsReadRecord, markNotificationReadRecord } from "../notifications/actions";
import { getTenantWorkspace, type TenantWorkspace } from "../workspace/actions";
import {
  updateTenantProfile as updateTenantProfileAction,
  updateTenantPayrollSettings as updateTenantPayrollSettingsAction,
} from "../tenant/actions";

export interface AppState {
  tenantId: string;
  /** The DB-backed tenant for `tenantId`, loaded asynchronously. */
  currentTenant: Tenant | null;
  employees: Employee[];
  departments: Department[];
  leaveRequests: LeaveRequest[];
  payrollRuns: PayrollRun[];
  payslips: Payslip[];
  activity: ActivityItem[];
  notifications: NotificationItem[];
}

export type Action =
  | { type: "SET_TENANT"; tenantId: string }
  | { type: "SET_WORKSPACE"; workspace: TenantWorkspace | null }
  | { type: "EMPLOYEE_ADDED"; employee: Employee; activity: ActivityItem; notification: NotificationItem }
  | { type: "EMPLOYEE_UPDATED"; employee: Employee }
  | { type: "ONBOARDING_STEP_TOGGLED"; employee: Employee; activity?: ActivityItem }
  | {
      type: "LEAVE_REQUEST_ADDED";
      leaveRequest: LeaveRequest;
      activity: ActivityItem;
      notification: NotificationItem;
    }
  | {
      type: "LEAVE_REQUEST_DECIDED";
      leaveRequest: LeaveRequest;
      leaveBalance?: { employeeId: string; type: LeaveType; used: number };
      activity: ActivityItem;
    }
  | { type: "PAYROLL_RUN_STARTED"; payrollRun: PayrollRun }
  | {
      type: "PAYROLL_RUN_COMPLETED";
      payrollRun: PayrollRun;
      payslips: Payslip[];
      nextRun?: PayrollRun;
      activity: ActivityItem;
      notification: NotificationItem;
    }
  | { type: "NOTIFICATION_READ"; id: string }
  | { type: "ALL_NOTIFICATIONS_READ"; tenantId: string }
  | { type: "TENANT_UPDATED"; tenant: Tenant };

export const initialState: AppState = {
  tenantId: "",
  currentTenant: null,
  employees: [],
  departments: [],
  leaveRequests: [],
  payrollRuns: [],
  payslips: [],
  activity: [],
  notifications: [],
};

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_TENANT":
      return {
        ...state,
        tenantId: action.tenantId,
        currentTenant: null,
        employees: [],
        departments: [],
        leaveRequests: [],
        payrollRuns: [],
        payslips: [],
        activity: [],
        notifications: [],
      };

    case "SET_WORKSPACE":
      if (!action.workspace) return { ...state, currentTenant: null };
      return { ...state, ...action.workspace };

    case "EMPLOYEE_ADDED":
      return {
        ...state,
        employees: [...state.employees, action.employee],
        activity: [action.activity, ...state.activity],
        notifications: [action.notification, ...state.notifications],
      };

    case "EMPLOYEE_UPDATED":
      return {
        ...state,
        employees: state.employees.map((employee) =>
          employee.id === action.employee.id ? action.employee : employee
        ),
      };

    case "ONBOARDING_STEP_TOGGLED": {
      const employees = state.employees.map((employee) =>
        employee.id === action.employee.id ? action.employee : employee
      );
      if (!action.activity) return { ...state, employees };
      return { ...state, employees, activity: [action.activity, ...state.activity] };
    }

    case "LEAVE_REQUEST_ADDED":
      return {
        ...state,
        leaveRequests: [action.leaveRequest, ...state.leaveRequests],
        activity: [action.activity, ...state.activity],
        notifications: [action.notification, ...state.notifications],
      };

    case "LEAVE_REQUEST_DECIDED": {
      const leaveBalance = action.leaveBalance;
      const leaveRequests = state.leaveRequests.map((request) =>
        request.id === action.leaveRequest.id ? action.leaveRequest : request
      );
      const employees = leaveBalance
        ? state.employees.map((employee) => {
            if (employee.id !== leaveBalance.employeeId) return employee;
            return {
              ...employee,
              leaveBalances: employee.leaveBalances.map((balance) =>
                balance.type === leaveBalance.type ? { ...balance, used: leaveBalance.used } : balance
              ),
            };
          })
        : state.employees;

      return {
        ...state,
        leaveRequests,
        employees,
        activity: [action.activity, ...state.activity],
      };
    }

    case "PAYROLL_RUN_STARTED":
      return {
        ...state,
        payrollRuns: state.payrollRuns.map((run) =>
          run.id === action.payrollRun.id ? action.payrollRun : run
        ),
      };

    case "PAYROLL_RUN_COMPLETED": {
      const payrollRuns = state.payrollRuns.map((run) =>
        run.id === action.payrollRun.id ? action.payrollRun : run
      );
      if (action.nextRun) payrollRuns.push(action.nextRun);

      return {
        ...state,
        payrollRuns,
        payslips: [...state.payslips, ...action.payslips],
        activity: [action.activity, ...state.activity],
        notifications: [action.notification, ...state.notifications],
      };
    }

    case "NOTIFICATION_READ":
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === action.id ? { ...n, read: true } : n
        ),
      };

    case "ALL_NOTIFICATIONS_READ":
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.tenantId === action.tenantId ? { ...n, read: true } : n
        ),
      };

    case "TENANT_UPDATED":
      return { ...state, currentTenant: action.tenant };

    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  setTenant: (tenantId: string) => void;
  addEmployee: (employee: Employee) => Promise<Employee>;
  updateEmployee: (id: string, updates: Partial<Employee>) => Promise<void>;
  toggleOnboardingStep: (employeeId: string, stepId: string) => Promise<void>;
  addLeaveRequest: (input: CreateLeaveRequestInput) => Promise<void>;
  decideLeaveRequest: (
    id: string,
    status: Extract<LeaveStatus, "approved" | "rejected">,
    decidedBy: string,
    decisionNote?: string
  ) => Promise<void>;
  startPayrollRun: (runId: string) => Promise<void>;
  completePayrollRun: (runId: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: (tenantId: string) => Promise<void>;
  updateTenantProfile: (data: Parameters<typeof updateTenantProfileAction>[1]) => Promise<void>;
  updateTenantPayrollSettings: (data: Parameters<typeof updateTenantPayrollSettingsAction>[1]) => Promise<void>;
}

const AppContext = React.createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(reducer, initialState);

  React.useEffect(() => {
    if (!state.tenantId) return;
    let active = true;
    getTenantWorkspace(state.tenantId)
      .then((workspace) => {
        if (active) dispatch({ type: "SET_WORKSPACE", workspace });
      })
      .catch((err) => {
        console.error("[AppProvider] workspace fetch failed:", err);
      });
    return () => {
      active = false;
    };
  }, [state.tenantId]);

  const value = React.useMemo<AppContextValue>(
    () => ({
      state,
      setTenant: (tenantId) => dispatch({ type: "SET_TENANT", tenantId }),
      addEmployee: async (employee) => {
        const result = await createEmployeeRecord(employee);
        dispatch({
          type: "EMPLOYEE_ADDED",
          employee: result.employee,
          activity: result.activity,
          notification: result.notification,
        });
        return result.employee;
      },
      updateEmployee: async (id, updates) => {
        const employee = await updateEmployeeRecord(id, updates);
        dispatch({ type: "EMPLOYEE_UPDATED", employee });
      },
      toggleOnboardingStep: async (employeeId, stepId) => {
        const result = await toggleOnboardingStepRecord(employeeId, stepId);
        dispatch({
          type: "ONBOARDING_STEP_TOGGLED",
          employee: result.employee,
          activity: result.activity,
        });
      },
      addLeaveRequest: async (input) => {
        const result = await createLeaveRequestRecord(input);
        dispatch({
          type: "LEAVE_REQUEST_ADDED",
          leaveRequest: result.leaveRequest,
          activity: result.activity,
          notification: result.notification,
        });
      },
      decideLeaveRequest: async (id, status, decidedBy, decisionNote) => {
        const result = await decideLeaveRequestRecord(id, status, decidedBy, decisionNote);
        dispatch({
          type: "LEAVE_REQUEST_DECIDED",
          leaveRequest: result.leaveRequest,
          leaveBalance: result.leaveBalance,
          activity: result.activity,
        });
      },
      startPayrollRun: async (runId) => {
        const payrollRun = await startPayrollRunRecord(runId);
        dispatch({ type: "PAYROLL_RUN_STARTED", payrollRun });
      },
      completePayrollRun: async (runId) => {
        const result = await completePayrollRunRecord(runId);
        dispatch({
          type: "PAYROLL_RUN_COMPLETED",
          payrollRun: result.payrollRun,
          payslips: result.payslips,
          nextRun: result.nextRun,
          activity: result.activity,
          notification: result.notification,
        });
      },
      markNotificationRead: async (id) => {
        await markNotificationReadRecord(id);
        dispatch({ type: "NOTIFICATION_READ", id });
      },
      markAllNotificationsRead: async (tenantId) => {
        await markAllNotificationsReadRecord(tenantId);
        dispatch({ type: "ALL_NOTIFICATIONS_READ", tenantId });
      },
      updateTenantProfile: async (data) => {
        const updated = await updateTenantProfileAction(state.tenantId, data);
        dispatch({ type: "TENANT_UPDATED", tenant: updated });
      },
      updateTenantPayrollSettings: async (data) => {
        const updated = await updateTenantPayrollSettingsAction(state.tenantId, data);
        dispatch({ type: "TENANT_UPDATED", tenant: updated });
      },
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
