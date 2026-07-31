"use client";

import * as React from "react";
import type {
  ActivityItem,
  Branch,
  CustomHoliday,
  Department,
  Employee,
  LeaveRequest,
  LeaveReviewer,
  LeaveStatus,
  LeaveType,
  NotificationItem,
  PayrollRun,
  Payslip,
  Tenant,
} from "../types";
import {
  createEmployeeRecord,
  toggleOnboardingStepRecord,
  updateEmployeeRecord,
  updateEmployeePhotoRecord,
} from "../employees/actions";
import {
  cancelLeaveRequestRecord,
  createLeaveRequestRecord,
  decideLeaveRequestRecord,
  type CreateLeaveRequestInput,
} from "../leave/actions";
import {
  createDepartmentRecord,
  deleteDepartmentRecord,
  updateDepartmentRecord,
} from "../departments/actions";
import {
  createBranchRecord,
  updateBranchRecord,
  deactivateBranchRecord,
} from "../branches/actions";
import { completePayrollRunRecord, setPayrollRunBranchAction, startPayrollRunRecord } from "../payroll/actions";
import { markAllNotificationsReadRecord, markNotificationReadRecord, markNotificationUnreadRecord } from "../notifications/actions";
import { getTenantWorkspace, type TenantWorkspace } from "../workspace/actions";
import { createCustomHolidayAction, deleteCustomHolidayAction } from "../leave/custom-holiday-actions";
import { createLeaveReviewerAction, deleteLeaveReviewerAction } from "../leave/leave-reviewer-actions";
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
  branches: Branch[];
  leaveRequests: LeaveRequest[];
  payrollRuns: PayrollRun[];
  payslips: Payslip[];
  activity: ActivityItem[];
  notifications: NotificationItem[];
  customHolidays: CustomHoliday[];
  leaveReviewers: LeaveReviewer[];
  /** True once the workspace has finished loading (success or empty). */
  ready: boolean;
  /** True when the workspace fetch failed and views should show an error. */
  loadError: boolean;
}

export type Action =
  | { type: "SET_TENANT"; tenantId: string }
  | { type: "SET_WORKSPACE"; workspace: TenantWorkspace | null }
  | { type: "WORKSPACE_LOAD_FAILED" }
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
      notification: NotificationItem;
    }
  | {
      type: "LEAVE_REQUEST_CANCELLED";
      leaveRequest: LeaveRequest;
      activity: ActivityItem;
      notification: NotificationItem;
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
  | { type: "NOTIFICATION_UNREAD"; id: string }
  | { type: "ALL_NOTIFICATIONS_READ"; tenantId: string }
  | { type: "TENANT_UPDATED"; tenant: Tenant }
  | { type: "DEPARTMENT_ADDED"; department: Department }
  | { type: "DEPARTMENT_UPDATED"; department: Department }
  | { type: "DEPARTMENT_DELETED"; id: string }
  | { type: "BRANCH_ADDED"; branch: Branch }
  | { type: "BRANCH_UPDATED"; branch: Branch }
  | { type: "CUSTOM_HOLIDAY_ADDED"; holiday: CustomHoliday }
  | { type: "CUSTOM_HOLIDAY_DELETED"; id: string }
  | { type: "LEAVE_REVIEWER_ADDED"; reviewer: LeaveReviewer }
  | { type: "LEAVE_REVIEWER_DELETED"; id: string };

export const initialState: AppState = {
  tenantId: "",
  currentTenant: null,
  employees: [],
  departments: [],
  branches: [],
  leaveRequests: [],
  payrollRuns: [],
  payslips: [],
  activity: [],
  notifications: [],
  customHolidays: [],
  leaveReviewers: [],
  ready: false,
  loadError: false,
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
        branches: [],
        leaveRequests: [],
        payrollRuns: [],
        payslips: [],
        activity: [],
        notifications: [],
        customHolidays: [],
        leaveReviewers: [],
        ready: false,
        loadError: false,
      };

    case "SET_WORKSPACE":
      if (!action.workspace) return { ...state, currentTenant: null, ready: true, loadError: false };
      return { ...state, ...action.workspace, ready: true, loadError: false };

    case "WORKSPACE_LOAD_FAILED":
      return { ...state, ready: false, loadError: true };

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
        notifications: [action.notification, ...state.notifications],
      };
    }

    case "LEAVE_REQUEST_CANCELLED":
      return {
        ...state,
        leaveRequests: state.leaveRequests.map((request) =>
          request.id === action.leaveRequest.id ? action.leaveRequest : request
        ),
        activity: [action.activity, ...state.activity],
        notifications: [action.notification, ...state.notifications],
      };

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

    case "NOTIFICATION_UNREAD":
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === action.id ? { ...n, read: false } : n
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

    case "DEPARTMENT_ADDED":
      return { ...state, departments: [...state.departments, action.department] };

    case "DEPARTMENT_UPDATED":
      return {
        ...state,
        departments: state.departments.map((d) =>
          d.id === action.department.id ? action.department : d
        ),
      };

    case "DEPARTMENT_DELETED":
      return { ...state, departments: state.departments.filter((d) => d.id !== action.id) };

    case "BRANCH_ADDED":
      return { ...state, branches: [...state.branches, action.branch] };

    case "BRANCH_UPDATED":
      return {
        ...state,
        branches: state.branches.map((b) => (b.id === action.branch.id ? action.branch : b)),
      };

    case "CUSTOM_HOLIDAY_ADDED":
      return {
        ...state,
        customHolidays: [...state.customHolidays, action.holiday].sort((a, b) =>
          a.date.localeCompare(b.date)
        ),
      };

    case "CUSTOM_HOLIDAY_DELETED":
      return { ...state, customHolidays: state.customHolidays.filter((h) => h.id !== action.id) };

    case "LEAVE_REVIEWER_ADDED":
      return { ...state, leaveReviewers: [...state.leaveReviewers, action.reviewer] };

    case "LEAVE_REVIEWER_DELETED":
      return { ...state, leaveReviewers: state.leaveReviewers.filter((r) => r.id !== action.id) };

    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  setTenant: (tenantId: string) => void;
  reloadWorkspace: () => void;
  addEmployee: (employee: Employee) => Promise<Employee>;
  updateEmployee: (id: string, updates: Partial<Employee>) => Promise<void>;
  updateEmployeePhoto: (employeeId: string, photoUrl: string) => Promise<void>;
  toggleOnboardingStep: (employeeId: string, stepId: string) => Promise<void>;
  addLeaveRequest: (input: CreateLeaveRequestInput) => Promise<void>;
  decideLeaveRequest: (
    id: string,
    status: Extract<LeaveStatus, "approved" | "rejected">,
    decisionNote?: string
  ) => Promise<void>;
  cancelLeaveRequest: (id: string) => Promise<void>;
  startPayrollRun: (runId: string) => Promise<void>;
  setPayrollRunBranch: (runId: string, branchId: string | null) => Promise<void>;
  completePayrollRun: (runId: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markNotificationUnread: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  updateTenantProfile: (data: Parameters<typeof updateTenantProfileAction>[0]) => Promise<void>;
  updateTenantPayrollSettings: (data: Parameters<typeof updateTenantPayrollSettingsAction>[0]) => Promise<void>;
  patchTenantLogo: (logoUrl: string | null) => void;
  addDepartment: (data: { name: string; description?: string; headId?: string }) => Promise<void>;
  updateDepartment: (
    id: string,
    data: { name?: string; description?: string; headId?: string | null }
  ) => Promise<void>;
  deleteDepartment: (id: string) => Promise<void>;
  addBranch: (data: {
    name: string;
    code?: string;
    address?: string;
    city?: string;
    isDefault?: boolean;
  }) => Promise<Branch>;
  updateBranch: (
    id: string,
    data: {
      name?: string;
      code?: string | null;
      address?: string | null;
      city?: string | null;
      isDefault?: boolean;
      isActive?: boolean;
    }
  ) => Promise<void>;
  deactivateBranch: (id: string) => Promise<void>;
  addCustomHoliday: (data: { name: string; date: string; recurring: boolean }) => Promise<void>;
  deleteCustomHoliday: (id: string) => Promise<void>;
  addLeaveReviewer: (data: {
    reviewerEmployeeId: string;
    scope: "all" | "department" | "employee";
    scopeId?: string;
    label?: string;
  }) => Promise<void>;
  deleteLeaveReviewer: (id: string) => Promise<void>;
}

const AppContext = React.createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(reducer, initialState);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    if (!state.tenantId) return;
    let active = true;
    getTenantWorkspace()
      .then((workspace) => {
        if (active) dispatch({ type: "SET_WORKSPACE", workspace });
      })
      .catch((err) => {
        console.error("[AppProvider] workspace fetch failed:", err);
        if (active) dispatch({ type: "WORKSPACE_LOAD_FAILED" });
      });
    return () => {
      active = false;
    };
    // reloadKey lets the error UI retry the workspace fetch.
  }, [state.tenantId, reloadKey]);

  const value = React.useMemo<AppContextValue>(
    () => ({
      state,
      setTenant: (tenantId) => dispatch({ type: "SET_TENANT", tenantId }),
      reloadWorkspace: () => setReloadKey((k) => k + 1),
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
      updateEmployeePhoto: async (employeeId, photoUrl) => {
        const employee = await updateEmployeePhotoRecord(employeeId, photoUrl);
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
      decideLeaveRequest: async (id, status, decisionNote) => {
        const result = await decideLeaveRequestRecord(id, status, decisionNote);
        dispatch({
          type: "LEAVE_REQUEST_DECIDED",
          leaveRequest: result.leaveRequest,
          leaveBalance: result.leaveBalance,
          activity: result.activity,
          notification: result.notification,
        });
      },
      cancelLeaveRequest: async (id) => {
        const result = await cancelLeaveRequestRecord(id);
        dispatch({
          type: "LEAVE_REQUEST_CANCELLED",
          leaveRequest: result.leaveRequest,
          activity: result.activity,
          notification: result.notification,
        });
      },
      startPayrollRun: async (runId) => {
        const payrollRun = await startPayrollRunRecord(runId);
        dispatch({ type: "PAYROLL_RUN_STARTED", payrollRun });
      },
      setPayrollRunBranch: async (runId, branchId) => {
        const payrollRun = await setPayrollRunBranchAction(runId, branchId);
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
      markNotificationRead: (id) => {
        dispatch({ type: "NOTIFICATION_READ", id });
        return markNotificationReadRecord(id);
      },
      markNotificationUnread: (id) => {
        dispatch({ type: "NOTIFICATION_UNREAD", id });
        return markNotificationUnreadRecord(id);
      },
      markAllNotificationsRead: async () => {
        await markAllNotificationsReadRecord();
        dispatch({ type: "ALL_NOTIFICATIONS_READ", tenantId: state.tenantId });
      },
      updateTenantProfile: async (data) => {
        const updated = await updateTenantProfileAction(data);
        dispatch({ type: "TENANT_UPDATED", tenant: updated });
      },
      updateTenantPayrollSettings: async (data) => {
        const updated = await updateTenantPayrollSettingsAction(data);
        dispatch({ type: "TENANT_UPDATED", tenant: updated });
      },
      patchTenantLogo: (logoUrl) => {
        if (state.currentTenant) {
          dispatch({ type: "TENANT_UPDATED", tenant: { ...state.currentTenant, logoUrl: logoUrl ?? undefined } });
        }
      },
      addDepartment: async (data) => {
        const department = await createDepartmentRecord(data);
        dispatch({ type: "DEPARTMENT_ADDED", department });
      },
      updateDepartment: async (id, data) => {
        const department = await updateDepartmentRecord(id, data);
        dispatch({ type: "DEPARTMENT_UPDATED", department });
      },
      deleteDepartment: async (id) => {
        await deleteDepartmentRecord(id);
        dispatch({ type: "DEPARTMENT_DELETED", id });
      },
      addBranch: async (data) => {
        const branch = await createBranchRecord(data);
        dispatch({ type: "BRANCH_ADDED", branch });
        return branch;
      },
      updateBranch: async (id, data) => {
        const branch = await updateBranchRecord(id, data);
        dispatch({ type: "BRANCH_UPDATED", branch });
      },
      deactivateBranch: async (id) => {
        const branch = await deactivateBranchRecord(id);
        dispatch({ type: "BRANCH_UPDATED", branch });
      },
      addCustomHoliday: async (data) => {
        const result = await createCustomHolidayAction(data);
        if (result.success) dispatch({ type: "CUSTOM_HOLIDAY_ADDED", holiday: result.holiday });
        else throw new Error(result.error);
      },
      deleteCustomHoliday: async (id) => {
        const result = await deleteCustomHolidayAction(id);
        if (result.success) dispatch({ type: "CUSTOM_HOLIDAY_DELETED", id });
        else throw new Error(result.error);
      },
      addLeaveReviewer: async (data) => {
        const result = await createLeaveReviewerAction(data);
        if (result.success) dispatch({ type: "LEAVE_REVIEWER_ADDED", reviewer: result.reviewer });
        else throw new Error(result.error);
      },
      deleteLeaveReviewer: async (id) => {
        const result = await deleteLeaveReviewerAction(id);
        if (result.success) dispatch({ type: "LEAVE_REVIEWER_DELETED", id });
        else throw new Error(result.error);
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
