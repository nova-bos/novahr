"use server";

import { runAsTenant } from "@/lib/db-context";
import { requireRole } from "@/lib/auth/require";
import { mapPayrollRun } from "@/lib/workspace/mappers";
import { sendPayslipEmail } from "@/lib/email";
import { mapEmployee } from "@/lib/workspace/mappers";
import { generateEmp201FromRunAction } from "@/lib/compliance/actions";
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
