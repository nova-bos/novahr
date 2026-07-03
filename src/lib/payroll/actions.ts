"use server";

import type { Prisma } from "@prisma/client";
import { runAsTenant } from "@/lib/db-context";
import { requireRole } from "@/lib/auth/require";
import { formatMonthYear } from "@/lib/format";
import { sendPayslipEmail } from "@/lib/email";
import { STATUTORY_DEFAULTS, buildPayslip, incrementPeriod } from "./calculator";
import type { ActivityItem, NotificationItem, PayrollRun, Payslip } from "@/lib/types";
import {
  mapActivityItem,
  mapEmployee,
  mapNotificationItem,
  mapPayrollRun,
  toDateOnly,
} from "../workspace/mappers";

function sum<T>(items: T[], selector: (item: T) => number): number {
  return items.reduce((acc, item) => acc + selector(item), 0);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function startPayrollRunRecord(runId: string): Promise<PayrollRun> {
  const session = await requireRole("hr");
  return runAsTenant(session.tenantId, async (tx) => {
    const owned = await tx.payrollRun.findFirst({
      where: { id: runId, tenantId: session.tenantId },
      select: { id: true },
    });
    if (!owned) throw new Error("Payroll run not found.");
    const [run, payslips] = await Promise.all([
      tx.payrollRun.update({ where: { id: runId }, data: { status: "processing" } }),
      tx.payslip.findMany({ where: { runId } }),
    ]);
    return mapPayrollRun(run, payslips.map((p) => p.id));
  });
}

export async function completePayrollRunRecord(
  runId: string
): Promise<{
  payrollRun: PayrollRun;
  payslips: Payslip[];
  nextRun?: PayrollRun;
  activity: ActivityItem;
  notification: NotificationItem;
}> {
  const session = await requireRole("hr");
  const tenantId = session.tenantId;
  const { payrollRun, activity, notification, nextRun, newPayslips, eligible } = await runAsTenant(
    tenantId,
    async (tx) => {
      const run = await tx.payrollRun.findFirstOrThrow({ where: { id: runId, tenantId } });
      const tenant = await tx.tenant.findUniqueOrThrow({ where: { id: run.tenantId } });
      const [employeeRows, payrollProfiles] = await Promise.all([
        tx.employee.findMany({
          where: { tenantId: run.tenantId },
          include: { leaveBalances: true },
        }),
        tx.payrollProfile.findMany({
          where: { tenantId: run.tenantId },
          select: { employeeId: true, medicalAidDependants: true },
        }),
      ]);

      // Medical aid dependants live on the payroll profile; feed them into the
      // calculator so the s6A medical aid tax credit is applied to PAYE.
      const dependantsByEmployee = new Map(
        payrollProfiles.map((p) => [p.employeeId, p.medicalAidDependants])
      );
      const employees = employeeRows.map(mapEmployee).map((e) =>
        e.salary.medicalAid != null
          ? {
              ...e,
              salary: {
                ...e.salary,
                medicalAidDependants: dependantsByEmployee.get(e.id) ?? 0,
              },
            }
          : e
      );

      const payDateStr = toDateOnly(run.payDate);
      const eligible = employees.filter((e) => e.status !== "terminated" && e.startDate <= payDateStr);

      const totalAnnualPayroll = sum(eligible, (e) => e.salary.annualGross);
      const isSDLLiable = totalAnnualPayroll >= 500_000;

      // Per-tenant statutory configuration; falls back to statutory defaults
      // when the tenant has never opened payroll settings.
      const tenantSettings = await tx.payrollSettings.findUnique({
        where: { tenantId: run.tenantId },
        select: {
          uifEnabled: true,
          uifEmployeeRate: true,
          uifEmployerRate: true,
          uifCeiling: true,
          sdlEnabled: true,
          sdlRate: true,
        },
      });
      const statutory = tenantSettings
        ? {
            uifEnabled: tenantSettings.uifEnabled,
            uifEmployeeRate: tenantSettings.uifEmployeeRate,
            uifEmployerRate: tenantSettings.uifEmployerRate,
            uifCeiling: tenantSettings.uifCeiling,
            sdlEnabled: tenantSettings.sdlEnabled,
            sdlRate: tenantSettings.sdlRate,
          }
        : STATUTORY_DEFAULTS;

      const newPayslips = eligible.map((e) =>
        buildPayslip(e, run.id, run.period, payDateStr, { isSDLLiable, statutory })
      );

      const totalGross = round2(sum(newPayslips, (p) => p.grossPay));
      const totalDeductions = round2(sum(newPayslips, (p) => p.totalDeductions));
      const totalNet = round2(sum(newPayslips, (p) => p.netPay));
      const totalPaye = round2(sum(newPayslips, (p) => p.paye));
      const totalUif = round2(sum(newPayslips, (p) => p.uif));

      const nextPeriod = incrementPeriod(run.period);
      const nextPayDate = `${nextPeriod}-${String(tenant.payDay).padStart(2, "0")}`;
      const nextRunId = `${run.tenantId}-run-${nextPeriod}`;
      const nextRunExists = await tx.payrollRun.findUnique({ where: { id: nextRunId } });
      const nextEligibleCount = employees.filter(
        (e) => e.status !== "terminated" && e.startDate <= nextPayDate
      ).length;

      await tx.payslip.createMany({
        skipDuplicates: true,
        data: newPayslips.map((p) => ({
          id: p.id,
          tenantId: p.tenantId,
          runId: p.runId,
          employeeId: p.employeeId,
          period: p.period,
          payDate: new Date(p.payDate),
          basicSalary: p.basicSalary,
          earnings: p.earnings as unknown as Prisma.InputJsonValue,
          deductions: p.deductions as unknown as Prisma.InputJsonValue,
          grossPay: p.grossPay,
          totalDeductions: p.totalDeductions,
          netPay: p.netPay,
          paye: p.paye,
          uif: p.uif,
        })),
      });

      // Normalize payslip line items into the PayrollItem table for structured querying.
      const STATUTORY_LABELS = new Set(["paye", "uif", "unpaid leave", "sdl"]);
      const payrollItemsData = newPayslips.flatMap((p) => {
        const items: Prisma.PayrollItemCreateManyInput[] = [];
        // Basic salary as an earning
        items.push({
          tenantId: p.tenantId,
          payslipId: p.id,
          employeeId: p.employeeId,
          itemType: "earning",
          category: "basic",
          label: "Basic Salary",
          isStatutory: false,
          isEmployer: false,
          amount: p.basicSalary,
        });
        // Additional earnings (allowances)
        for (const earning of p.earnings as { label: string; amount: number }[]) {
          items.push({
            tenantId: p.tenantId,
            payslipId: p.id,
            employeeId: p.employeeId,
            itemType: "earning",
            category: "allowance",
            label: earning.label,
            isStatutory: false,
            isEmployer: false,
            amount: earning.amount,
          });
        }
        // Deductions
        for (const deduction of p.deductions as { label: string; amount: number }[]) {
          const isStatutory = STATUTORY_LABELS.has(deduction.label.toLowerCase());
          items.push({
            tenantId: p.tenantId,
            payslipId: p.id,
            employeeId: p.employeeId,
            itemType: "deduction",
            category: isStatutory ? "statutory" : "voluntary",
            label: deduction.label,
            isStatutory,
            isEmployer: false,
            amount: deduction.amount,
          });
        }
        return items;
      });

      if (payrollItemsData.length > 0) {
        await tx.payrollItem.createMany({ data: payrollItemsData, skipDuplicates: true });
      }

      // Check if approval is required before completing
      const payrollSettingsRow = await tx.payrollSettings.findUnique({
        where: { tenantId: run.tenantId },
        select: { requireApproval: true, approvalUserId: true },
      });
      const needsApproval = payrollSettingsRow?.requireApproval && payrollSettingsRow?.approvalUserId;
      const runStatus = needsApproval ? "awaiting_approval" : "completed";

      const payrollRun = await tx.payrollRun.update({
        where: { id: run.id },
        data: {
          status: runStatus,
          totalGross,
          totalDeductions,
          totalNet,
          totalPaye,
          totalUif,
          employeeCount: newPayslips.length,
          processedOn: new Date(),
        },
      });

      const activity = await tx.activityItem.create({
        data: {
          tenantId: run.tenantId,
          type: "payroll_run",
          message: needsApproval
            ? `processed payroll for ${formatMonthYear(run.period)} (awaiting approval)`
            : `processed payroll for ${formatMonthYear(run.period)}`,
          actor: `${tenant.name} HR`,
        },
      });

      const notification = await tx.notificationItem.create({
        data: {
          tenantId: run.tenantId,
          title: needsApproval ? "Payroll awaiting approval" : "Payslips published",
          description: needsApproval
            ? `${formatMonthYear(run.period)} payroll for ${newPayslips.length} employees is awaiting sign-off.`
            : `${formatMonthYear(run.period)} payslips have been generated for ${newPayslips.length} employees.`,
          type: needsApproval ? "warning" : "success",
        },
      });

      const nextRun = nextRunExists
        ? undefined
        : await tx.payrollRun.create({
            data: {
              id: nextRunId,
              tenantId: run.tenantId,
              period: nextPeriod,
              label: `${formatMonthYear(nextPeriod)} Payroll`,
              payDate: new Date(nextPayDate),
              status: "scheduled",
              employeeCount: nextEligibleCount,
            },
          });

      return { payrollRun, activity, notification, nextRun, newPayslips, eligible };
    }
  );

  // Only send payslip emails if the run went straight to completed (no approval required)
  if (payrollRun.status === "completed") {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    for (const payslip of newPayslips) {
      const emp = eligible.find((e) => e.id === payslip.employeeId);
      if (!emp) continue;
      void sendPayslipEmail({
        recipientEmail: emp.email,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        period: payslip.period,
        netPay: payslip.netPay,
        appUrl,
      });
    }
  }

  return {
    payrollRun: mapPayrollRun(payrollRun, newPayslips.map((p) => p.id)),
    payslips: newPayslips,
    nextRun: nextRun ? mapPayrollRun(nextRun, []) : undefined,
    activity: mapActivityItem(activity),
    notification: mapNotificationItem(notification),
  };
}
