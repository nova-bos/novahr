"use server";

import { prisma } from "@/lib/prisma";
import { runAsTenant } from "@/lib/db-context";
import type {
  ActivityItem,
  Department,
  Employee,
  LeaveRequest,
  NotificationItem,
  PayrollRun,
  Payslip,
  Tenant,
} from "@/lib/types";
import {
  mapActivityItem,
  mapDepartment,
  mapEmployee,
  mapLeaveRequest,
  mapNotificationItem,
  mapPayrollRun,
  mapPayslip,
  mapTenant,
} from "./mappers";

export interface TenantWorkspace {
  currentTenant: Tenant;
  employees: Employee[];
  departments: Department[];
  leaveRequests: LeaveRequest[];
  payrollRuns: PayrollRun[];
  payslips: Payslip[];
  activity: ActivityItem[];
  notifications: NotificationItem[];
}

export async function getAllTenants(): Promise<Tenant[]> {
  const rows = await prisma.tenant.findMany({ orderBy: { name: "asc" } });
  return rows.map(mapTenant);
}

/**
 * Loads everything `AppProvider` needs for a tenant in one round trip. Returns
 * `null` if the tenant doesn't exist (shouldn't happen for a signed-in user).
 */
export async function getTenantWorkspace(tenantId: string): Promise<TenantWorkspace | null> {
  return runAsTenant(tenantId, async (tx) => {
    const [tenant, employeeRows, departmentRows, leaveRequestRows, payrollRunRows, payslipRows, activityRows, notificationRows] =
      await Promise.all([
        tx.tenant.findUnique({ where: { id: tenantId } }),
        tx.employee.findMany({ where: { tenantId }, include: { leaveBalances: true } }),
        tx.department.findMany({ where: { tenantId } }),
        tx.leaveRequest.findMany({ where: { tenantId } }),
        tx.payrollRun.findMany({ where: { tenantId } }),
        tx.payslip.findMany({ where: { tenantId } }),
        tx.activityItem.findMany({ where: { tenantId } }),
        tx.notificationItem.findMany({ where: { tenantId } }),
      ]);

    if (!tenant) return null;

    const payslipIdsByRun = new Map<string, string[]>();
    for (const row of payslipRows) {
      const ids = payslipIdsByRun.get(row.runId) ?? [];
      ids.push(row.id);
      payslipIdsByRun.set(row.runId, ids);
    }

    return {
      currentTenant: mapTenant(tenant),
      employees: employeeRows.map(mapEmployee),
      departments: departmentRows.map(mapDepartment),
      leaveRequests: leaveRequestRows.map(mapLeaveRequest),
      payrollRuns: payrollRunRows.map((run) => mapPayrollRun(run, payslipIdsByRun.get(run.id) ?? [])),
      payslips: payslipRows.map(mapPayslip),
      activity: activityRows.map(mapActivityItem),
      notifications: notificationRows.map(mapNotificationItem),
    };
  });
}
