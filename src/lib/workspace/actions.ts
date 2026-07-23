"use server";

import type { Prisma } from "@prisma/client";
import { runAsTenant } from "@/lib/db-context";
import { requireUser } from "@/lib/auth/require";
import type {
  ActivityItem,
  CustomHoliday,
  Department,
  Employee,
  LeaveRequest,
  LeaveReviewer,
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
import { projectEmployees } from "./employee-projection";
import { accruedEntitlement } from "@/lib/leave/accrual";

export interface TenantWorkspace {
  currentTenant: Tenant;
  employees: Employee[];
  departments: Department[];
  leaveRequests: LeaveRequest[];
  payrollRuns: PayrollRun[];
  payslips: Payslip[];
  activity: ActivityItem[];
  notifications: NotificationItem[];
  customHolidays: CustomHoliday[];
  leaveReviewers: LeaveReviewer[];
}

/**
 * Tenants visible to the signed-in user. Users belong to exactly one tenant,
 * so this returns a single-element array.
 */
export async function getAllTenants(): Promise<Tenant[]> {
  const session = await requireUser();
  const [row, settings] = await runAsTenant(session.tenantId, (tx) =>
    Promise.all([
      tx.tenant.findUnique({ where: { id: session.tenantId } }),
      tx.payrollSettings.findUnique({ where: { tenantId: session.tenantId }, select: { payslipLogoUrl: true } }),
    ])
  );
  return row ? [mapTenant(row, settings?.payslipLogoUrl)] : [];
}

/**
 * Loads everything `AppProvider` needs for the signed-in user's tenant in one
 * round trip, scoped by role:
 *
 * - hr / exco: the full workspace.
 * - manager: full records for themselves and direct reports, sanitized
 *   records for everyone else; only their own and their reports' payslips.
 * - employee: their own full record, sanitized directory entries for
 *   colleagues, and only their own payslips and leave requests.
 */
export async function getTenantWorkspace(): Promise<TenantWorkspace | null> {
  const session = await requireUser();
  const tenantId = session.tenantId;

  return runAsTenant(tenantId, async (tx) => {
    // Determine privilege level before building scoped queries.
    const isPrivilegedEarly = session.role === "hr" || session.role === "exco";
    const isManagerEarly = session.role === "manager";

    // Notifications are scoped per-user. Only load what the signed-in user
    // is permitted to see, based on audienceRole and recipientEmployeeId.
    let notifWhere: Prisma.NotificationItemWhereInput;
    if (isPrivilegedEarly) {
      // HR and exco see all broadcast notifications (recipientEmployeeId = null)
      // plus their own personal ones.
      notifWhere = {
        tenantId,
        OR: [
          { recipientEmployeeId: null },
          ...(session.employeeId ? [{ recipientEmployeeId: session.employeeId }] : []),
        ],
      };
    } else if (isManagerEarly) {
      // Managers see only explicit manager-audience broadcasts plus their own personal ones.
      // Notifications with audienceRole=null are HR-internal and must not leak to managers.
      notifWhere = {
        tenantId,
        OR: [
          { recipientEmployeeId: null, audienceRole: "manager" },
          ...(session.employeeId ? [{ recipientEmployeeId: session.employeeId }] : []),
        ],
      };
    } else {
      // Employees only see their personal notifications.
      notifWhere = session.employeeId
        ? { tenantId, recipientEmployeeId: session.employeeId }
        : { tenantId, id: "__never__" };
    }

    const [tenant, payrollSettings, leavePolicy, employeeRows, departmentRows, leaveRequestRows, payrollRunRows, payslipRows, activityRows, notificationRows, customHolidayRows, leaveReviewerRows] =
      await Promise.all([
        tx.tenant.findUnique({ where: { id: tenantId } }),
        tx.payrollSettings.findUnique({ where: { tenantId }, select: { payslipLogoUrl: true } }),
        tx.tenantLeavePolicy.findUnique({ where: { tenantId }, select: { leaveAccrualMethod: true } }),
        tx.employee.findMany({ where: { tenantId }, include: { leaveBalances: true } }),
        tx.department.findMany({ where: { tenantId } }),
        tx.leaveRequest.findMany({ where: { tenantId } }),
        tx.payrollRun.findMany({ where: { tenantId } }),
        tx.payslip.findMany({ where: { tenantId } }),
        tx.activityItem.findMany({ where: { tenantId }, orderBy: { timestamp: "desc" }, take: 100 }),
        tx.notificationItem.findMany({ where: notifWhere, orderBy: { timestamp: "desc" }, take: 100 }),
        tx.customHoliday.findMany({ where: { tenantId }, orderBy: { date: "asc" } }),
        // LeaveReviewers are HR-admin configuration; non-privileged users have no use for them.
        isPrivilegedEarly
          ? tx.leaveReviewer.findMany({ where: { tenantId } })
          : Promise.resolve([]),
      ]);

    if (!tenant) return null;

    const isPrivileged = isPrivilegedEarly;

    const accrualMethod = leavePolicy?.leaveAccrualMethod ?? "accrual";
    const asOf = new Date();
    let employees: Employee[] = employeeRows.map(mapEmployee).map((employee) => ({
      ...employee,
      leaveBalances: employee.leaveBalances.map((b) => ({
        ...b,
        accrued: accruedEntitlement({
          type: b.type,
          total: b.total,
          method: accrualMethod,
          startDate: employee.startDate,
          asOf,
        }),
      })),
    }));
    let leaveRequests = leaveRequestRows.map(mapLeaveRequest);
    let payslips = payslipRows.map(mapPayslip);

    if (!isPrivileged) {
      // Role-based projection: strip each colleague's record down to what this
      // viewer may see before it leaves the server (see employee-projection.ts).
      const projection = projectEmployees(employees, session);
      employees = projection.employees;
      leaveRequests = leaveRequests.filter((r) => projection.visibleEmployeeIds.has(r.employeeId));
      payslips = payslips.filter((p) => p.employeeId === session.employeeId);
    }

    const payslipIdsByRun = new Map<string, string[]>();
    for (const row of payslips) {
      const ids = payslipIdsByRun.get(row.runId) ?? [];
      ids.push(row.id);
      payslipIdsByRun.set(row.runId, ids);
    }

    let payrollRuns = payrollRunRows.map((run) => mapPayrollRun(run, payslipIdsByRun.get(run.id) ?? []));
    if (!isPrivileged) {
      // Company-wide payroll totals are only for HR and exco eyes.
      payrollRuns = payrollRuns.map((run) => ({
        ...run,
        totalGross: 0,
        totalDeductions: 0,
        totalNet: 0,
        totalPaye: 0,
        totalUif: 0,
      }));
    }

    const customHolidays: CustomHoliday[] = customHolidayRows.map((r) => ({
      id: r.id,
      tenantId: r.tenantId,
      name: r.name,
      date: r.date,
      recurring: r.recurring,
    }));

    const leaveReviewers: LeaveReviewer[] = leaveReviewerRows.map((r) => ({
      id: r.id,
      tenantId: r.tenantId,
      reviewerEmployeeId: r.reviewerEmployeeId,
      scope: r.scope as "all" | "department" | "employee",
      scopeId: r.scopeId ?? undefined,
      label: r.label ?? undefined,
    }));

    return {
      currentTenant: mapTenant(tenant, payrollSettings?.payslipLogoUrl),
      employees,
      departments: departmentRows.map(mapDepartment),
      leaveRequests,
      payrollRuns,
      payslips,
      activity: activityRows.map(mapActivityItem),
      notifications: notificationRows.map(mapNotificationItem),
      customHolidays,
      leaveReviewers,
    };
  });
}
