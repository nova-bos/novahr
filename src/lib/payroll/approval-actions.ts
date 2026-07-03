"use server";

import { runAsTenant } from "@/lib/db-context";
import { requireRole } from "@/lib/auth/require";
import { mapPayrollRun } from "@/lib/workspace/mappers";
import { sendPayslipEmail } from "@/lib/email";
import { mapEmployee } from "@/lib/workspace/mappers";
import type { PayrollRun } from "@/lib/types";

export async function approvePayrollRunAction(
  runId: string,
  approvalNote?: string
): Promise<{ payrollRun: PayrollRun }> {
  const session = await requireRole("hr", "exco");
  return runAsTenant(session.tenantId, async (tx) => {
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
    const updated = await tx.payrollRun.update({
      where: { id: runId },
      data: {
        status: "completed",
        approvedBy: session.id,
        approvedAt: new Date(),
        approvalNote: approvalNote ?? null,
      },
    });
    const payslips = await tx.payslip.findMany({ where: { runId } });

    // Send payslip emails now that the run is approved
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    for (const ps of payslips) {
      const empRow = await tx.employee.findUnique({
        where: { id: ps.employeeId },
        include: { leaveBalances: true },
      });
      if (!empRow) continue;
      const emp = mapEmployee(empRow);
      void sendPayslipEmail({
        recipientEmail: emp.email,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        period: ps.period,
        netPay: ps.netPay,
        appUrl,
      });
    }

    return { payrollRun: mapPayrollRun(updated, payslips.map((p) => p.id)) };
  });
}

export async function rejectPayrollApprovalAction(
  runId: string,
  note: string
): Promise<{ payrollRun: PayrollRun }> {
  const session = await requireRole("hr", "exco");
  return runAsTenant(session.tenantId, async (tx) => {
    const owned = await tx.payrollRun.findFirst({
      where: { id: runId, tenantId: session.tenantId },
      select: { id: true },
    });
    if (!owned) throw new Error("Payroll run not found.");
    const updated = await tx.payrollRun.update({
      where: { id: runId },
      data: { status: "processing", approvalNote: note },
    });
    const payslips = await tx.payslip.findMany({ where: { runId } });
    return { payrollRun: mapPayrollRun(updated, payslips.map((p) => p.id)) };
  });
}
