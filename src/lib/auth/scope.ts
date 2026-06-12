"use client";

import * as React from "react";
import { useAuth } from "./auth-provider";
import { useEmployee, useEmployees, useLeaveRequests } from "@/lib/store/hooks";
import type { Employee, LeaveRequest } from "@/lib/types";

/**
 * Employees visible to the current user:
 * - HR / Exco: everyone in the tenant
 * - Manager: themselves + direct reports
 * - Employee: themselves only
 */
export function useScopedEmployees(): Employee[] {
  const employees = useEmployees();
  const { user } = useAuth();

  return React.useMemo(() => {
    if (!user) return [];
    if (user.role === "hr" || user.role === "exco") return employees;
    if (user.role === "manager") {
      return employees.filter((e) => e.id === user.employeeId || e.managerId === user.employeeId);
    }
    return employees.filter((e) => e.id === user.employeeId);
  }, [employees, user]);
}

/** Leave requests for everyone in the current user's scope. */
export function useScopedLeaveRequests(): LeaveRequest[] {
  const requests = useLeaveRequests();
  const scopedEmployees = useScopedEmployees();

  return React.useMemo(() => {
    const ids = new Set(scopedEmployees.map((e) => e.id));
    return requests.filter((r) => ids.has(r.employeeId));
  }, [requests, scopedEmployees]);
}

/** The employee record linked to the logged-in demo user, if any. */
export function useCurrentEmployee(): Employee | undefined {
  const { user } = useAuth();
  return useEmployee(user?.employeeId);
}

/** Whether the current user can approve/reject a given employee's leave request. */
export function useCanDecideRequest(): (employeeId: string) => boolean {
  const { user } = useAuth();
  return React.useCallback(
    (employeeId: string) => {
      if (!user) return false;
      if (user.role === "hr") return true;
      if (user.role === "manager") return employeeId !== user.employeeId;
      return false;
    },
    [user]
  );
}
