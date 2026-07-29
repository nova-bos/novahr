"use server";

import { runAsTenant } from "@/lib/db-context";
import { requireRole } from "@/lib/auth/require";
import { formatMonthYear } from "@/lib/format";
import { mapPayrollRun } from "@/lib/workspace/mappers";
import { sendPayslipEmail, sendPayrollRejectedEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { mapEmployee } from "@/lib/workspace/mappers";
import { generateEmp201FromRunAction } from "@/lib/compliance/actions";
import { reverseRunCompletion } from "./run-reversal";
import type { PayrollRun } from "@/lib/types";

export async function approvePayrollRunAction(
  runId: string,
  approvalNote?: string
): Promise<{ payrollRun: PayrollRun }> {
  const session = await requireRole("hr", "exco");
  const result = await runAsTenant(session.tenantId, async (tx) => {
    const run = await tx.payrollRun.findFirstOrThrow({
      where: { id: runId, tenantId: session.tenantId },
    });
    if (run.status !== "awaiting_approval") {
      throw new Error("Run is not awaiting approval.");
    }
    // Verify the current user is the designated approver (if one is set)
    const settings = await tx.payrollSettings.findUnique({ where: { tenantId: session.tenantId } });
    if (settings?.approvalUserId && settings.approvalUserId !== session.id) {
      throw new Error("Only the designated approver can approve this run.");
    }
    // Compare-and-swap the status transition so two approvers (or a double
    // click) cannot both proceed and both dispatch payslip emails.
    const cas = await tx.payrollRun.updateMany({
      where: { id: runId, tenantId: session.tenantId, status: "awaiting_approval" },
      data: {
        status: "completed",
        approvedBy: session.id,
        approvedAt: new Date(),
        approvalNote: approvalNote ?? null,
      },
    });
    if (cas.count === 0) {
      throw new Error("Run is not awaiting approval.");
    }
    const updated = await tx.payrollRun.findFirstOrThrow({
      where: { id: runId, tenantId: session.tenantId },
    });
    const payslips = await tx.payslip.findMany({ where: { runId } });

    // Load every employee for this run in one query rather than per payslip.
    const employeeIds = [...new Set(payslips.map((p) => p.employeeId))];
    const employeeRows = await tx.employee.findMany({
      where: { id: { in: employeeIds }, tenantId: session.tenantId },
      include: { leaveBalances: true },
    });
    const employeeById = new Map(employeeRows.map((e) => [e.id, e]));

    // Send payslip emails now that the run is approved
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    for (const ps of payslips) {
      const empRow = employeeById.get(ps.employeeId);
      if (!empRow) continue;
      const emp = mapEmployee(empRow);
      void sendPayslipEmail({
        recipientEmail: emp.email,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        period: ps.period,
        netPay: ps.netPay.toNumber(),
        appUrl,
      });
    }

    return { payrollRun: mapPayrollRun(updated, payslips.map((p) => p.id)) };
  });

  // Now that the run is completed, roll it up into the EMP201 (and PAYE/UIF/SDL)
  // compliance records. Best-effort: skipped if the approver lacks HR scope.
  try {
    await generateEmp201FromRunAction(session.tenantId, runId);
  } catch (err) {
    console.error("EMP201 generation failed after approval for run", runId, err);
  }

  return result;
}

export async function rejectPayrollApprovalAction(
  runId: string,
  note: string
): Promise<{ payrollRun: PayrollRun }> {
  const session = await requireRole("hr", "exco");
  const result = await runAsTenant(session.tenantId, async (tx) => {
    const owned = await tx.payrollRun.findFirst({
      where: { id: runId, tenantId: session.tenantId },
      select: { id: true, status: true },
    });
    if (!owned) throw new Error("Payroll run not found.");
    if (owned.status !== "awaiting_approval") {
      throw new Error("Only a run awaiting approval can be sent back.");
    }
    // Reverse the completed run so re-running does not double-apply loan and
    // garnishee instalments, then return it to an editable processing state.
    await reverseRunCompletion(tx, runId, session.tenantId);
    const updated = await tx.payrollRun.update({
      where: { id: runId },
      data: {
        status: "processing",
        approvalNote: note,
        totalGross: 0,
        totalDeductions: 0,
        totalNet: 0,
        totalPaye: 0,
        totalUif: 0,
        employeeCount: 0,
        processedOn: null,
      },
    });
    return { payrollRun: mapPayrollRun(updated, []), period: updated.period };
  });

  // Email all HR users so they know to reprocess
  void (async () => {
    try {
      const hrUsers = await prisma.user.findMany({
        where: { tenantId: session.tenantId, role: "hr" },
        select: { email: true },
      });
      const hrEmails = hrUsers.map((u) => u.email).filter(Boolean);
      if (hrEmails.length > 0) {
        await sendPayrollRejectedEmail({
          recipientEmails: hrEmails,
          period: formatMonthYear(result.period),
          rejectedBy: session.name,
          note,
          appUrl: process.env.NEXT_PUBLIC_APP_URL,
        });
      }
    } catch (err) {
      console.error("[payroll] rejection email failed", err);
    }
  })();

  return { payrollRun: result.payrollRun };
}
