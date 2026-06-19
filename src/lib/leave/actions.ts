"use server";

import { prisma } from "@/lib/prisma";
import { runAsTenant } from "@/lib/db-context";
import { leaveTypeLabel } from "@/lib/format";
import { sendLeaveRequestEmail, sendLeaveDecisionEmail } from "@/lib/email";
import type { ActivityItem, LeaveRequest, LeaveStatus, LeaveType, NotificationItem } from "@/lib/types";
import { mapActivityItem, mapLeaveRequest, mapNotificationItem } from "../workspace/mappers";

export interface CreateLeaveRequestInput {
  tenantId: string;
  employeeId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  documentUrl?: string;
}

export async function createLeaveRequestRecord(
  input: CreateLeaveRequestInput
): Promise<{ leaveRequest: LeaveRequest; activity: ActivityItem; notification: NotificationItem }> {
  const dayWord = input.days > 1 ? "days" : "day";

  const result = await runAsTenant(input.tenantId, async (tx) => {
    const employee = await tx.employee.findUniqueOrThrow({ where: { id: input.employeeId } });
    const actor = `${employee.firstName} ${employee.lastName}`;
    const label = leaveTypeLabel(input.type).toLowerCase();

    const leaveRequest = await tx.leaveRequest.create({
      data: {
        tenantId: input.tenantId,
        employeeId: input.employeeId,
        type: input.type,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        days: input.days,
        reason: input.reason,
        documentUrl: input.documentUrl,
      },
    });

    const activity = await tx.activityItem.create({
      data: {
        tenantId: input.tenantId,
        type: "leave_request",
        message: `requested ${input.days} ${dayWord} of ${label}`,
        actor,
        employeeId: input.employeeId,
      },
    });

    const notification = await tx.notificationItem.create({
      data: {
        tenantId: input.tenantId,
        title: "Leave request awaiting approval",
        description: `${actor} requested ${input.days} ${dayWord} of ${label}.`,
        type: "warning",
      },
    });

    return { leaveRequest, activity, notification, actor };
  });

  const hrUsers = await prisma.user.findMany({
    where: { tenantId: input.tenantId, role: { in: ["hr", "manager"] } },
    select: { email: true },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  void sendLeaveRequestEmail({
    recipientEmails: hrUsers.map((u) => u.email),
    employeeName: result.actor,
    leaveType: input.type,
    days: input.days,
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
  tenantId: string,
  id: string,
  status: Extract<LeaveStatus, "approved" | "rejected">,
  decidedBy: string,
  decisionNote?: string
): Promise<{
  leaveRequest: LeaveRequest;
  leaveBalance?: { employeeId: string; type: LeaveType; used: number };
  activity: ActivityItem;
}> {
  const inner = await runAsTenant(tenantId, async (tx) => {
    const target = await tx.leaveRequest.findUniqueOrThrow({ where: { id } });
    const employee = await tx.employee.findUniqueOrThrow({ where: { id: target.employeeId } });
    const actor = `${employee.firstName} ${employee.lastName}`;
    const label = leaveTypeLabel(target.type as LeaveType).toLowerCase();

    const leaveRequest = await tx.leaveRequest.update({
      where: { id },
      data: { status, decidedBy, decidedOn: new Date(), decisionNote },
    });

    const leaveBalance =
      status === "approved"
        ? await tx.leaveBalance.update({
            where: { employeeId_type: { employeeId: target.employeeId, type: target.type } },
            data: { used: { increment: target.days } },
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
