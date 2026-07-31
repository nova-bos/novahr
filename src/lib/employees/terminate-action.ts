"use server";

import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { runAsTenant } from "@/lib/db-context";
import { requireRole, requireActiveSubscription } from "@/lib/auth/require";
import { sendTerminationEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { accruedEntitlement } from "@/lib/leave/accrual";

export interface TerminationInput {
  employeeId: string;
  terminationDate: string;
  reason: "resignation" | "retrenchment" | "dismissal" | "retirement" | "contract_end" | "other";
  noticeDaysServed: number;
  finalPayDate: string;
  notes?: string;
}

export async function terminateEmployeeAction(
  input: TerminationInput
): Promise<{ success: boolean; error?: string }> {
  const session = await requireRole("hr");
  await requireActiveSubscription(session.tenantId);

  const [linkedUser, tenantRow, employeeRow] = await Promise.all([
    prisma.user.findFirst({
      where: { employeeId: input.employeeId, tenantId: session.tenantId },
      select: { id: true },
    }),
    prisma.tenant.findUnique({ where: { id: session.tenantId }, select: { name: true } }),
    prisma.employee.findFirst({
      where: { id: input.employeeId, tenantId: session.tenantId },
      select: { email: true, firstName: true, lastName: true },
    }),
  ]);

  await runAsTenant(session.tenantId, async (tx) => {
    const employee = await tx.employee.findFirstOrThrow({
      where: { id: input.employeeId, tenantId: session.tenantId },
      include: { leaveBalances: true },
    });

    const dailyRate = employee.salaryAnnualGross.toNumber() / 261;
    const noticeDaysOwed = 14;
    const noticePay = Math.max(0, (noticeDaysOwed - input.noticeDaysServed) * dailyRate);
    const annualBalance = employee.leaveBalances.find((b) => b.type === "annual");
    // Pay out earned-but-unused annual leave: the accrued entitlement to date
    // (BCEA section 20), not the full annual allowance.
    const annualEntitlement = annualBalance
      ? accruedEntitlement({
          type: "annual",
          total: annualBalance.total,
          method: "accrual",
          startDate: employee.startDate.toISOString(),
        })
      : 0;
    const remainingAnnual = annualBalance ? Math.max(0, annualEntitlement - annualBalance.used) : 0;
    const leavePayout = remainingAnnual * dailyRate;

    // Set terminated status and record the termination date and reason.
    await tx.employee.update({
      where: { id: input.employeeId },
      data: {
        status: "terminated",
        terminatedAt: new Date(input.terminationDate),
        terminationReason: input.reason,
      },
    });

    // Deactivate payroll profile
    await tx.payrollProfile.updateMany({
      where: { employeeId: input.employeeId },
      data: { status: "inactive" },
    });

    // Write salary history record flagged as termination
    await tx.employeeSalaryHistory.create({
      data: {
        tenantId: session.tenantId,
        employeeId: input.employeeId,
        annualGross: employee.salaryAnnualGross,
        payFrequency: employee.salaryPayFrequency,
        travelAllowance: employee.salaryTravelAllowance,
        housingAllowance: employee.salaryHousingAllowance,
        medicalAid: employee.salaryMedicalAid,
        pensionContribPct: employee.salaryPensionContributionPct,
        effectiveDate: new Date(input.terminationDate),
        changedBy: session.id,
        changeReason: `Termination: ${input.reason.replace(/_/g, " ")}. Notice pay due: R${noticePay.toFixed(2)}. Leave payout: R${leavePayout.toFixed(2)}.${input.notes ? ` Notes: ${input.notes}` : ""}`,
      },
    });

    // Activity log
    await tx.activityItem.create({
      data: {
        tenantId: session.tenantId,
        type: "termination",
        message: `employment terminated (${input.reason.replace(/_/g, " ")})`,
        actor: `${employee.firstName} ${employee.lastName}`,
        employeeId: input.employeeId,
      },
    });

    // Notification: HR only
    await tx.notificationItem.create({
      data: {
        tenantId: session.tenantId,
        title: "Employee terminated",
        description: `${employee.firstName} ${employee.lastName} was terminated on ${input.terminationDate}.`,
        type: "warning",
        audienceRole: "hr",
      },
    });

    // Revoke portal access if the employee had a user account
    if (linkedUser) {
      await tx.user.delete({ where: { id: linkedUser.id } });
    }
  });

  // Revoke Supabase auth after the transaction commits (best-effort)
  if (linkedUser) {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (serviceKey && supabaseUrl) {
      const admin = createSupabaseAdminClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      await admin.auth.admin.deleteUser(linkedUser.id);
    }
  }

  // Notify the employee of their termination
  if (employeeRow) {
    await sendTerminationEmail({
      recipientEmail: employeeRow.email,
      employeeName: `${employeeRow.firstName} ${employeeRow.lastName}`,
      terminationDate: input.terminationDate,
      companyName: tenantRow?.name ?? "your employer",
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
    });
  }

  return { success: true };
}
