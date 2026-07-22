"use server";

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
 * Strips compensation, banking, tax and personal identifiers from an
 * employee record. Non-privileged users get this shape for everyone except
 * themselves (and, for managers, their direct reports).
 */
function sanitizeEmployee(employee: Employee): Employee {
  return {
    ...employee,
    salary: {
      annualGross: 0,
      currency: employee.salary.currency,
      payFrequency: employee.salary.payFrequency,
    },
    bankDetails: { bank: "", accountNumber: "", branchCode: "", accountType: "Cheque", validated: false, validatedAt: null },
    taxNumber: "",
    idNumber: "",
    dateOfBirth: undefined,
    address: "",
    emergencyContact: { name: "", relationship: "", phone: "" },
    leaveBalances: [],
    onboarding: undefined,
  };
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
    const [tenant, payrollSettings, employeeRows, departmentRows, leaveRequestRows, payrollRunRows, payslipRows, activityRows, notificationRows, customHolidayRows, leaveReviewerRows] =
      await Promise.all([
        tx.tenant.findUnique({ where: { id: tenantId } }),
        tx.payrollSettings.findUnique({ where: { tenantId }, select: { payslipLogoUrl: true } }),
        tx.employee.findMany({ where: { tenantId }, include: { leaveBalances: true } }),
        tx.department.findMany({ where: { tenantId } }),
        tx.leaveRequest.findMany({ where: { tenantId } }),
        tx.payrollRun.findMany({ where: { tenantId } }),
        tx.payslip.findMany({ where: { tenantId } }),
        tx.activityItem.findMany({ where: { tenantId }, orderBy: { timestamp: "desc" }, take: 100 }),
        tx.notificationItem.findMany({ where: { tenantId }, orderBy: { timestamp: "desc" }, take: 100 }),
        tx.customHoliday.findMany({ where: { tenantId }, orderBy: { date: "asc" } }),
        tx.leaveReviewer.findMany({ where: { tenantId } }),
      ]);

    if (!tenant) return null;

    const isPrivileged = session.role === "hr" || session.role === "exco";

    let employees = employeeRows.map(mapEmployee);
    let leaveRequests = leaveRequestRows.map(mapLeaveRequest);
    let payslips = payslipRows.map(mapPayslip);

    if (!isPrivileged) {
      const visibleIds = new Set<string>();
      if (session.employeeId) visibleIds.add(session.employeeId);
      if (session.role === "manager" && session.employeeId) {
        for (const e of employees) {
          if (e.managerId === session.employeeId) visibleIds.add(e.id);
        }
      }

      employees = employees.map((e) => (visibleIds.has(e.id) ? e : sanitizeEmployee(e)));
      leaveRequests = leaveRequests.filter((r) => visibleIds.has(r.employeeId));
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
