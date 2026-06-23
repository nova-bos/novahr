"use server";

import type { Prisma } from "@prisma/client";
import { runAsTenant } from "@/lib/db-context";
import { formatMonthYear } from "@/lib/format";
import { sendPayslipEmail } from "@/lib/email";
import { buildPayslip, incrementPeriod } from "./calculator";
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

export async function startPayrollRunRecord(tenantId: string, runId: string): Promise<PayrollRun> {
  return runAsTenant(tenantId, async (tx) => {
    const [run, payslips] = await Promise.all([
      tx.payrollRun.update({ where: { id: runId }, data: { status: "processing" } }),
      tx.payslip.findMany({ where: { runId } }),
    ]);
    return mapPayrollRun(run, payslips.map((p) => p.id));
  });
}

export async function completePayrollRunRecord(
  tenantId: string,
  runId: string
): Promise<{
  payrollRun: PayrollRun;
  payslips: Payslip[];
  nextRun?: PayrollRun;
  activity: ActivityItem;
  notification: NotificationItem;
}> {
  const { payrollRun, activity, notification, nextRun, newPayslips, eligible } = await runAsTenant(
    tenantId,
    async (tx) => {
      const run = await tx.payrollRun.findUniqueOrThrow({ where: { id: runId } });
      const tenant = await tx.tenant.findUniqueOrThrow({ where: { id: run.tenantId } });
      const employeeRows = await tx.employee.findMany({
        where: { tenantId: run.tenantId },
        include: { leaveBalances: true },
      });
      const employees = employeeRows.map(mapEmployee);

      const payDateStr = toDateOnly(run.payDate);
      const eligible = employees.filter((e) => e.status !== "terminated" && e.startDate <= payDateStr);

      const totalAnnualPayroll = sum(eligible, (e) => e.salary.annualGross);
      const isSDLLiable = totalAnnualPayroll >= 500_000;

      const newPayslips = eligible.map((e) => buildPayslip(e, run.id, run.period, payDateStr, { isSDLLiable }));

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

      const payrollRun = await tx.payrollRun.update({
        where: { id: run.id },
        data: {
          status: "completed",
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
          message: `processed payroll for ${formatMonthYear(run.period)}`,
          actor: `${tenant.name} HR`,
        },
      });

      const notification = await tx.notificationItem.create({
        data: {
          tenantId: run.tenantId,
          title: "Payslips published",
          description: `${formatMonthYear(run.period)} payslips have been generated for ${newPayslips.length} employees.`,
          type: "success",
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

  return {
    payrollRun: mapPayrollRun(payrollRun, newPayslips.map((p) => p.id)),
    payslips: newPayslips,
    nextRun: nextRun ? mapPayrollRun(nextRun, []) : undefined,
    activity: mapActivityItem(activity),
    notification: mapNotificationItem(notification),
  };
}
