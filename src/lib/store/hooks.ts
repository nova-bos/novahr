"use client";

import * as React from "react";
import { useApp } from "./app-provider";
import { useAuth } from "@/lib/auth/auth-provider";
import { isNotificationVisibleTo } from "@/lib/notifications/visibility";
import { leavePolicies } from "@/lib/config/leave";
import { getPayrollConfig } from "@/lib/config/payroll";
import type {
  ActivityItem,
  Branch,
  CustomHoliday,
  Department,
  Employee,
  LeaveRequest,
  LeaveReviewer,
  NotificationItem,
  PayrollRun,
  Payslip,
  Tenant,
} from "../types";

/** True once the workspace has finished loading (success or empty tenant). */
export function useWorkspaceReady(): boolean {
  const { state } = useApp();
  return state.ready;
}

/** True when the workspace fetch failed. */
export function useWorkspaceError(): boolean {
  const { state } = useApp();
  return state.loadError;
}

export function useReloadWorkspace(): () => void {
  const { reloadWorkspace } = useApp();
  return reloadWorkspace;
}

export function useTenantId(): string {
  return useApp().state.tenantId;
}

/**
 * The DB-backed tenant for the current `tenantId`. `AuthGuard` keeps the
 * loading screen up until this is populated, so callers can treat it as
 * non-null.
 */
export function useCurrentTenant(): Tenant {
  const tenant = useApp().state.currentTenant;
  if (!tenant) throw new Error("currentTenant accessed before it finished loading");
  return tenant;
}

export function useTenants(): Tenant[] {
  const { state } = useApp();
  return React.useMemo(
    () => (state.currentTenant ? [state.currentTenant] : []),
    [state.currentTenant]
  );
}

export function useEmployees(): Employee[] {
  return useApp().state.employees;
}

export function useEmployee(id: string | undefined): Employee | undefined {
  const { state } = useApp();
  return React.useMemo(() => state.employees.find((e) => e.id === id), [state.employees, id]);
}

export function useDepartments(): Department[] {
  return useApp().state.departments;
}

/** All branches for the tenant, including deactivated ones. */
export function useBranches(): Branch[] {
  return useApp().state.branches;
}

/** Active branches only. The branch selector/filter hides entirely when empty. */
export function useActiveBranches(): Branch[] {
  const { state } = useApp();
  return React.useMemo(() => state.branches.filter((b) => b.isActive), [state.branches]);
}

export function useLeaveRequests(): LeaveRequest[] {
  const { state } = useApp();
  return React.useMemo(
    () => [...state.leaveRequests].sort((a, b) => b.appliedOn.localeCompare(a.appliedOn)),
    [state.leaveRequests]
  );
}

export function usePayrollRuns(): PayrollRun[] {
  const { state } = useApp();
  return React.useMemo(
    () => [...state.payrollRuns].sort((a, b) => a.period.localeCompare(b.period)),
    [state.payrollRuns]
  );
}

export function usePayrollRun(id: string | undefined): PayrollRun | undefined {
  const { state } = useApp();
  return React.useMemo(() => state.payrollRuns.find((r) => r.id === id), [state.payrollRuns, id]);
}

export function usePayslipsByRun(runId: string | undefined): Payslip[] {
  const { state } = useApp();
  return React.useMemo(
    () => state.payslips.filter((p) => p.runId === runId),
    [state.payslips, runId]
  );
}

export function usePayslipsByEmployee(employeeId: string | undefined): Payslip[] {
  const { state } = useApp();
  return React.useMemo(
    () =>
      state.payslips
        .filter((p) => p.employeeId === employeeId)
        .sort((a, b) => b.period.localeCompare(a.period)),
    [state.payslips, employeeId]
  );
}

export function usePayslip(id: string | undefined): Payslip | undefined {
  const { state } = useApp();
  return React.useMemo(() => state.payslips.find((p) => p.id === id), [state.payslips, id]);
}

/** Every payslip the current user can see. Used for year-to-date calculations. */
export function useAllPayslips(): Payslip[] {
  const { state } = useApp();
  return state.payslips;
}

export function useActivity(limit?: number): ActivityItem[] {
  const { state } = useApp();
  return React.useMemo(() => {
    const items = [...state.activity].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return limit ? items.slice(0, limit) : items;
  }, [state.activity, limit]);
}

export function useNotifications(): NotificationItem[] {
  const { state } = useApp();
  const { user } = useAuth();
  return React.useMemo(
    () =>
      state.notifications
        // Guard against optimistic drift: only surface notifications the current
        // user is entitled to, matching the server-side workspace scoping.
        .filter((n) => isNotificationVisibleTo(n, user))
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [state.notifications, user]
  );
}

export function useUnreadNotificationCount(): number {
  return useNotifications().filter((n) => !n.read).length;
}

export function useLeavePolicies() {
  return leavePolicies;
}

export function usePayrollConfig() {
  return getPayrollConfig(useTenantId());
}

export function useCustomHolidays(): CustomHoliday[] {
  return useApp().state.customHolidays;
}

export function useLeaveReviewers(): LeaveReviewer[] {
  return useApp().state.leaveReviewers;
}
