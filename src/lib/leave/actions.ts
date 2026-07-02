"use server";

import { prisma } from "@/lib/prisma";
import { runAsTenant } from "@/lib/db-context";
import { requireEmployeeScope, requireRole } from "@/lib/auth/require";
import { leaveTypeLabel } from "@/lib/format";
import { DEFAULT_LEAVE_TOTALS } from "@/lib/config/leave";
import { workingDaysBetween } from "./business-days";
import { sendLeaveRequestEmail, sendLeaveDecisionEmail } from "@/lib/email";
import type { ActivityItem, LeaveRequest, LeaveStatus, LeaveType, NotificationItem } from "@/lib/types";
import { mapActivityItem, mapLeaveRequest, mapNotificationItem } from "../workspace/mappers";

export interface CreateLeaveRequestInput {
  employeeId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  documentUrl?: string;
}

export async function createLeaveRequestRecord(
  input: CreateLeaveRequestInput
): Promise<{ leaveRequest: LeaveRequest; activity: ActivityItem; notification: NotificationItem }> {
  const session = await requireEmployeeScope(input.employeeId);
  const tenantId = session.tenantId;

  // Never trust a client-calculated day count: recompute working days
  // (weekends and SA public holidays excluded) from the date range.
  const days = workingDaysBetween(input.startDate, input.endDate);
  if (days <= 0) {
    throw new Error("The selected dates contain no working days.");
  }

  const dayWord = days > 1 ? "days" : "day";

  const result = await runAsTenant(tenantId, async (tx) => {
    const employee = await tx.employee.findUniqueOrThrow({ where: { id: input.employeeId } });
    const actor = `${employee.firstName} ${employee.lastName}`;
    const label = leaveTypeLabel(input.type).toLowerCase();

    const leaveRequest = await tx.leaveRequest.create({
      data: {
        tenantId,
        employeeId: input.employeeId,
        type: input.type,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        days,
        reason: input.reason,
        documentUrl: input.documentUrl,
      },
    });

    const activity = await tx.activityItem.create({
      data: {
        tenantId,
        type: "leave_request",
        message: `requested ${days} ${dayWord} of ${label}`,
        actor,
        employeeId: input.employeeId,
      },
    });

    const notification = await tx.notificationItem.create({
      data: {
        tenantId,
        title: "Leave request awaiting approval",
        description: `${actor} requested ${days} ${dayWord} of ${label}.`,
        type: "warning",
      },
    });

    return { leaveRequest, activity, notification, actor };
  });

  const hrUsers = await prisma.user.findMany({
    where: { tenantId, role: { in: ["hr", "manager"] } },
    select: { email: true },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  void sendLeaveRequestEmail({
    recipientEmails: hrUsers.map((u) => u.email),
    employeeName: result.actor,
    leaveType: input.type,
    days,
    startDate: input.startDate,
    endDate: input.endDate,
    reason: input.reason,
    appUrl,
  });

  return {
    leaveRequest: mapLeaveRequest(result.leaveRequest),
    activity: mapActivityItem(result.activity),
    notification: mapNotificationItem(result.notification),
  };
}

export async function decideLeaveRequestRecord(
  id: string,
  status: Extract<LeaveStatus, "approved" | "rejected">,
  decisionNote?: string
): Promise<{
  leaveRequest: LeaveRequest;
  leaveBalance?: { employeeId: string; type: LeaveType; used: number };
  activity: ActivityItem;
}> {
  const session = await requireRole("hr", "manager");
  const tenantId = session.tenantId;
  const decidedBy = session.name;

  const inner = await runAsTenant(tenantId, async (tx) => {
    const target = await tx.leaveRequest.findUniqueOrThrow({ where: { id } });
    if (target.status !== "pending") {
      throw new Error("This request has already been decided.");
    }

    const employee = await tx.employee.findUniqueOrThrow({ where: { id: target.employeeId } });

    // Managers may only decide requests from their direct reports, never
    // their own. HR can decide any request in the tenant.
    if (session.role === "manager") {
      if (target.employeeId === session.employeeId) {
        throw new Error("You cannot decide your own leave request.");
      }
      if (employee.managerId !== session.employeeId) {
        throw new Error("You can only decide requests from your direct reports.");
      }
    }

    const actor = `${employee.firstName} ${employee.lastName}`;
    const label = leaveTypeLabel(target.type as LeaveType).toLowerCase();

    const leaveRequest = await tx.leaveRequest.update({
      where: { id },
      data: { status, decidedBy, decidedOn: new Date(), decisionNote },
    });

    // Upsert so approvals work even when the employee predates a leave type
    // and has no balance row yet.
    const leaveBalance =
      status === "approved"
        ? await tx.leaveBalance.upsert({
            where: { employeeId_type: { employeeId: target.employeeId, type: target.type } },
            update: { used: { increment: target.days } },
            create: {
              employeeId: target.employeeId,
              type: target.type,
              total: DEFAULT_LEAVE_TOTALS[target.type as LeaveType] ?? target.days,
              used: target.days,
            },
          })
        : undefined;

    const activity = await tx.activityItem.create({
      data: {
        tenantId,
        type: status === "approved" ? "leave_approved" : "leave_rejected",
        message: `${label} request was ${status}`,
        actor,
        employeeId: target.employeeId,
      },
    });

    return {
      leaveRequest,
      leaveBalance,
      activity,
      recipientEmail: employee.email,
      employeeName: actor,
      leaveType: target.type as LeaveType,
      days: target.days,
      startDate: target.startDate.toISOString().slice(0, 10),
      endDate: target.endDate.toISOString().slice(0, 10),
      employeeId: target.employeeId,
    };
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  void sendLeaveDecisionEmail({
    recipientEmail: inner.recipientEmail,
    employeeName: inner.employeeName,
    leaveType: inner.leaveType,
    days: inner.days,
    startDate: inner.startDate,
    endDate: inner.endDate,
    status,
    decidedBy,
    decisionNote,
    appUrl,
  });

  return {
    leaveRequest: mapLeaveRequest(inner.leaveRequest),
    leaveBalance: inner.leaveBalance
      ? { employeeId: inner.employeeId, type: inner.leaveType, used: inner.leaveBalance.used }
      : undefined,
    activity: mapActivityItem(inner.activity),
  };
}
