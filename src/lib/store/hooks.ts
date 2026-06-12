"use client";

import * as React from "react";
import { useApp } from "./app-provider";
import { getDepartmentsByTenant, getPayrollConfig, getTenant, leavePolicies, tenants } from "../data";
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

export function useCurrentTenant(): Tenant {
  return getTenant(useTenantId());
}

export function useTenants(): Tenant[] {
  return tenants;
}

export function useEmployees(): Employee[] {
  const { state } = useApp();
  return React.useMemo(
    () => state.employees.filter((e) => e.tenantId === state.tenantId),
    [state.employees, state.tenantId]
  );
}

export function useEmployee(id: string | undefined): Employee | undefined {
  const { state } = useApp();
  return React.useMemo(() => state.employees.find((e) => e.id === id), [state.employees, id]);
}

export function useDepartments(): Department[] {
  return getDepartmentsByTenant(useTenantId());
}

export function useLeaveRequests(): LeaveRequest[] {
  const { state } = useApp();
  return React.useMemo(
    () =>
      state.leaveRequests
        .filter((r) => r.tenantId === state.tenantId)
        .sort((a, b) => b.appliedOn.localeCompare(a.appliedOn)),
    [state.leaveRequests, state.tenantId]
  );
}

export function usePayrollRuns(): PayrollRun[] {
  const { state } = useApp();
  return React.useMemo(
    () =>
      state.payrollRuns
        .filter((r) => r.tenantId === state.tenantId)
        .sort((a, b) => a.period.localeCompare(b.period)),
    [state.payrollRuns, state.tenantId]
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
    const items = state.activity
      .filter((a) => a.tenantId === state.tenantId)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return limit ? items.slice(0, limit) : items;
  }, [state.activity, state.tenantId, limit]);
}

export function useNotifications(): NotificationItem[] {
  const { state } = useApp();
  return React.useMemo(
    () =>
      state.notifications
        .filter((n) => n.tenantId === state.tenantId)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [state.notifications, state.tenantId]
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
