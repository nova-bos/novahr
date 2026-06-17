"use client";

import * as React from "react";
import { useApp } from "./app-provider";
import { tenants } from "@/demo/tenants";
import { leavePolicies } from "@/lib/config/leave";
import { getPayrollConfig } from "@/lib/config/payroll";
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
  return tenants;
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

export function useActivity(limit?: number): ActivityItem[] {
  const { state } = useApp();
  return React.useMemo(() => {
    const items = [...state.activity].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return limit ? items.slice(0, limit) : items;
  }, [state.activity, limit]);
}

export function useNotifications(): NotificationItem[] {
  const { state } = useApp();
  return React.useMemo(
    () => [...state.notifications].sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [state.notifications]
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
