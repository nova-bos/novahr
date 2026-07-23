"use server";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { runAsTenant } from "@/lib/db-context";
import { requireEmployeeScope, requireUser } from "@/lib/auth/require";
import { leaveTypeLabel } from "@/lib/format";
import { DEFAULT_LEAVE_TOTALS } from "@/lib/config/leave";
import { sendLeaveRequestEmail, sendLeaveDecisionEmail } from "@/lib/email";
import type { ActivityItem, DaySelection, LeaveRequest, LeaveStatus, LeaveType, NotificationItem } from "@/lib/types";
import { mapActivityItem, mapLeaveRequest, mapNotificationItem } from "../workspace/mappers";

export interface CreateLeaveRequestInput {
  employeeId: string;
  type: LeaveType;
  daySelections: DaySelection[];
  reason: string;
  // Storage object path in the private "leave-documents" bucket, not a URL.
  documentPath?: string;
}

export async function createLeaveRequestRecord(
  input: CreateLeaveRequestInput
): Promise<{ leaveRequest: LeaveRequest; activity: ActivityItem; notification: NotificationItem }> {
  const session = await requireEmployeeScope(input.employeeId);
  const tenantId = session.tenantId;

  if (input.daySelections.length === 0) {
    throw new Error("Please select at least one day.");
  }

  const sorted = [...input.daySelections].sort((a, b) => a.date.localeCompare(b.date));
  const startDate = sorted[0].date;
  const endDate = sorted[sorted.length - 1].date;
  const days = input.daySelections.reduce((sum, d) => sum + (d.type === "full" ? 1.0 : 0.5), 0);

  const dayWord = days > 1 ? "days" : "day";

  const result = await runAsTenant(tenantId, async (tx) => {
    const employee = await tx.employee.findFirstOrThrow({
      where: { id: input.employeeId, tenantId },
    });
    const actor = `${employee.firstName} ${employee.lastName}`;
    const label = leaveTypeLabel(input.type).toLowerCase();

    const leaveRequest = await tx.leaveRequest.create({
      data: {
        tenantId,
        employeeId: input.employeeId,
        type: input.type,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        days,
        daySelections: input.daySelections as unknown as Prisma.InputJsonValue,
        reason: input.reason,
        documentUrl: input.documentPath,
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

    // Broadcast to managers and HR: a request needs review.
    const notification = await tx.notificationItem.create({
      data: {
        tenantId,
        title: "Leave request awaiting approval",
        description: `${actor} requested ${days} ${dayWord} of ${label}.`,
        type: "warning",
        audienceRole: "manager",
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
    startDate,
    endDate,
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
  notification: NotificationItem;
}> {
  const session = await requireUser();
  const tenantId = session.tenantId;
  const decidedBy = session.name;

  const inner = await runAsTenant(tenantId, async (tx) => {
    const target = await tx.leaveRequest.findFirstOrThrow({ where: { id, tenantId } });

    if (target.status === "cancelled") {
      throw new Error("Cancelled leave requests cannot be decided.");
    }

    if (target.status === status) {
      throw new Error(`This leave request is already ${status}.`);
    }

    const previousStatus = target.status;

    const employee = await tx.employee.findFirstOrThrow({
      where: { id: target.employeeId, tenantId },
    });

    const isPrivileged = session.role === "hr" || session.role === "exco";
    const isManager = session.role === "manager";

    if (!isPrivileged) {
      if (target.employeeId === session.employeeId) {
        throw new Error("You cannot decide your own leave request.");
      }

      if (isManager) {
        if (employee.managerId !== session.employeeId) {
          throw new Error("You can only decide requests from your direct reports.");
        }
      } else {
        // Check if user is a configured leave reviewer covering this request
        const reviewer = session.employeeId
          ? await tx.leaveReviewer.findFirst({
              where: {
                tenantId,
                reviewerEmployeeId: session.employeeId,
                OR: [
                  { scope: "all" },
                  { scope: "employee", scopeId: target.employeeId },
                  { scope: "department", scopeId: employee.department },
                ],
              },
            })
          : null;

        if (!reviewer) {
          throw new Error("You are not authorised to decide this leave request.");
        }
      }
    }

    const actor = `${employee.firstName} ${employee.lastName}`;
    const label = leaveTypeLabel(target.type as LeaveType).toLowerCase();

    // Read the current balance once so we can validate and floor writes.
    const existingBalance = await tx.leaveBalance.findUnique({
      where: { employeeId_type: { employeeId: target.employeeId, type: target.type } },
    });
    const balanceUsed = existingBalance?.used ?? 0;

    // No hard balance cap on approval: a reviewer may approve leave that exceeds
    // the available balance (e.g. advancing annual leave), which shows as a
    // negative balance. The approver is warned in the UI before confirming.

    // Compare-and-swap the status transition so two approvers (or a double click)
    // cannot both adjust the balance.
    const cas = await tx.leaveRequest.updateMany({
      where: { id, tenantId, status: previousStatus },
      data: { status, decidedBy, decidedOn: new Date(), decisionNote },
    });
    if (cas.count === 0) {
      throw new Error("This request was already updated by someone else.");
    }
    const leaveRequest = await tx.leaveRequest.findFirstOrThrow({ where: { id, tenantId } });

    let leaveBalance;
    if (status === "approved") {
      // Approving (from pending or reversed rejected): increment balance.
      leaveBalance = await tx.leaveBalance.upsert({
        where: { employeeId_type: { employeeId: target.employeeId, type: target.type } },
        update: { used: { increment: target.days } },
        create: {
          employeeId: target.employeeId,
          type: target.type,
          total: DEFAULT_LEAVE_TOTALS[target.type as LeaveType] ?? target.days,
          used: target.days,
        },
      });
    } else if (previousStatus === "approved") {
      // Revoking a prior approval: give the days back, floored at zero so the
      // balance can never go negative from inconsistent data.
      leaveBalance = await tx.leaveBalance.upsert({
        where: { employeeId_type: { employeeId: target.employeeId, type: target.type } },
        update: { used: Math.max(0, balanceUsed - target.days) },
        create: {
          employeeId: target.employeeId,
          type: target.type,
          total: DEFAULT_LEAVE_TOTALS[target.type as LeaveType] ?? 0,
          used: 0,
        },
      });
    }

    const actionVerb =
      status === "approved"
        ? previousStatus === "rejected"
          ? "approved (overriding earlier decline)"
          : "approved"
        : previousStatus === "approved"
          ? "declined (revoking earlier approval)"
          : "declined";

    const activity = await tx.activityItem.create({
      data: {
        tenantId,
        type: status === "approved" ? "leave_approved" : "leave_rejected",
        message: `${label} request was ${actionVerb}`,
        actor,
        employeeId: target.employeeId,
      },
    });

    // Broadcast notification: visible to the approver and other HR/managers.
    const notification = await tx.notificationItem.create({
      data: {
        tenantId,
        title: status === "approved" ? "Leave approved" : "Leave declined",
        description:
          status === "approved"
            ? `${actor}'s ${label} request was approved by ${decidedBy}.`
            : `${actor}'s ${label} request was not approved by ${decidedBy}.`,
        type: status === "approved" ? "success" : "warning",
        audienceRole: "manager",
      },
    });

    // Personal notification: only the requesting employee sees this.
    await tx.notificationItem.create({
      data: {
        tenantId,
        title: status === "approved" ? "Your leave request was approved" : "Your leave request was not approved",
        description:
          status === "approved"
            ? `Your ${label} request has been approved.`
            : `Your ${label} request was not approved. Contact your manager for details.`,
        type: status === "approved" ? "success" : "warning",
        recipientEmployeeId: target.employeeId,
      },
    });

    return {
      leaveRequest,
      leaveBalance,
      activity,
      notification,
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
    notification: mapNotificationItem(inner.notification),
  };
}

/**
 * Lets an employee withdraw their own future leave request while it is still
 * pending. Withdrawal is intentionally a terminal state, preserving the
 * request and its audit trail instead of deleting it.
 */
export async function cancelLeaveRequestRecord(id: string): Promise<{
  leaveRequest: LeaveRequest;
  activity: ActivityItem;
  notification: NotificationItem;
}> {
  const session = await requireUser();
  const tenantId = session.tenantId;

  if (!session.employeeId) {
    throw new Error("Only the employee who submitted this request can cancel it.");
  }

  const today = new Date().toISOString().slice(0, 10);

  const result = await runAsTenant(tenantId, async (tx) => {
    const target = await tx.leaveRequest.findFirstOrThrow({ where: { id, tenantId } });

    if (target.employeeId !== session.employeeId) {
      throw new Error("You can only cancel your own leave requests.");
    }

    if (target.status !== "pending") {
      throw new Error("Only pending leave requests can be cancelled.");
    }

    if (target.startDate.toISOString().slice(0, 10) <= today) {
      throw new Error("Leave can only be cancelled before its start date.");
    }

    // The status guard makes this safe if a reviewer approves at the same time.
    const cancelledOn = new Date();
    const cas = await tx.leaveRequest.updateMany({
      where: { id, tenantId, employeeId: session.employeeId, status: "pending" },
      data: { status: "cancelled", cancelledBy: session.name, cancelledOn },
    });
    if (cas.count === 0) {
      throw new Error("This request was already updated by someone else.");
    }

    const [leaveRequest, employee] = await Promise.all([
      tx.leaveRequest.findFirstOrThrow({ where: { id, tenantId } }),
      tx.employee.findFirstOrThrow({ where: { id: target.employeeId, tenantId } }),
    ]);
    const employeeName = `${employee.firstName} ${employee.lastName}`;
    const label = leaveTypeLabel(target.type as LeaveType).toLowerCase();

    const activity = await tx.activityItem.create({
      data: {
        tenantId,
        type: "leave_cancelled",
        message: `cancelled their ${label} leave request`,
        actor: employeeName,
        employeeId: target.employeeId,
      },
    });

    // Reviewers who were waiting to decide no longer need to act.
    await tx.notificationItem.create({
      data: {
        tenantId,
        title: "Leave request cancelled",
        description: `${employeeName} cancelled their pending ${label} leave request.`,
        type: "info",
        audienceRole: "manager",
      },
    });

    // Return the requester's notification so the client state stays correctly scoped.
    const notification = await tx.notificationItem.create({
      data: {
        tenantId,
        title: "Leave request cancelled",
        description: `Your pending ${label} leave request has been cancelled.`,
        type: "info",
        recipientEmployeeId: target.employeeId,
      },
    });

    return { leaveRequest, activity, notification };
  });

  return {
    leaveRequest: mapLeaveRequest(result.leaveRequest),
    activity: mapActivityItem(result.activity),
    notification: mapNotificationItem(result.notification),
  };
}

export async function requestLeaveDocumentationRecord(leaveRequestId: string): Promise<void> {
  const session = await requireUser();
  const tenantId = session.tenantId;

  await runAsTenant(tenantId, async (tx) => {
    const target = await tx.leaveRequest.findFirstOrThrow({ where: { id: leaveRequestId, tenantId } });
    const employee = await tx.employee.findFirstOrThrow({ where: { id: target.employeeId, tenantId } });
    const label = leaveTypeLabel(target.type as LeaveType).toLowerCase();
    const startDate = target.startDate.toISOString().slice(0, 10);
    const endDate = target.endDate.toISOString().slice(0, 10);

    await tx.notificationItem.create({
      data: {
        tenantId,
        title: "Supporting documents requested",
        description: `Please upload supporting documentation for your ${label} request (${startDate} to ${endDate}).`,
        type: "warning",
        recipientEmployeeId: target.employeeId,
      },
    });

    void (async () => {
      try {
        const { Resend } = await import("resend");
        const key = process.env.RESEND_API_KEY;
        if (!key) return;
        const client = new Resend(key);
        const from = process.env.RESEND_FROM ?? "NovaHR <noreply@novahr.co.za>";
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://novahr-five.vercel.app";
        await client.emails.send({
          from,
          to: employee.email,
          subject: "Supporting documents required for your leave request",
          html: `<p>Hi ${employee.firstName},</p>
<p>Your reviewer has requested supporting documentation for your <strong>${label}</strong> leave request from <strong>${startDate}</strong> to <strong>${endDate}</strong>.</p>
<p>Please log in and attach the relevant documents to your leave request.</p>
<p><a href="${appUrl}/leave">View my leave requests</a></p>
<p>The NovaHR team</p>`,
        });
      } catch (err) {
        console.error("[leave] supporting-documents email failed:", err instanceof Error ? err.message : err);
      }
    })();
  });
}
