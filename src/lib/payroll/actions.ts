"use server";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatMonthYear } from "@/lib/format";
import { buildPayslip, incrementPeriod } from "./calculator";
import type { ActivityItem, NotificationItem, PayrollRun, Payslip } from "@/lib/types";
import {
  mapActivityItem,
  mapEmployee,
  mapNotificationItem,
  mapPayrollRun,
  toDateOnly,
} from "../workspace/mappers";

const PAYROLL_OWNER: Record<string, string> = {
  novatech: "Werner Botha",
  apex: "Thandiwe Mokoena",
  horizon: "Annelie Joubert",
};

function sum<T>(items: T[], selector: (item: T) => number): number {
  return items.reduce((acc, item) => acc + selector(item), 0);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function startPayrollRunRecord(runId: string): Promise<PayrollRun> {
  const [run, payslips] = await Promise.all([
    prisma.payrollRun.update({ where: { id: runId }, data: { status: "processing" } }),
    prisma.payslip.findMany({ where: { runId } }),
  ]);
  return mapPayrollRun(run, payslips.map((p) => p.id));
}

export async function completePayrollRunRecord(runId: string): Promise<{
  payrollRun: PayrollRun;
  payslips: Payslip[];
  nextRun?: PayrollRun;
  activity: ActivityItem;
  notification: NotificationItem;
}> {
  const run = await prisma.payrollRun.findUniqueOrThrow({ where: { id: runId } });
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: run.tenantId } });
  const employeeRows = await prisma.employee.findMany({
    where: { tenantId: run.tenantId },
    include: { leaveBalances: true },
  });
  const employees = employeeRows.map(mapEmployee);

  const payDateStr = toDateOnly(run.payDate);
  const eligible = employees.filter((e) => e.status !== "terminated" && e.startDate <= payDateStr);
  const newPayslips = eligible.map((e) => buildPayslip(e, run.id, run.period, payDateStr));

  const totalGross = round2(sum(newPayslips, (p) => p.grossPay));
  const totalDeductions = round2(sum(newPayslips, (p) => p.totalDeductions));
  const totalNet = round2(sum(newPayslips, (p) => p.netPay));
  const totalPaye = round2(sum(newPayslips, (p) => p.paye));
  const totalUif = round2(sum(newPayslips, (p) => p.uif));

  const nextPeriod = incrementPeriod(run.period);
  const nextPayDate = `${nextPeriod}-${String(tenant.payDay).padStart(2, "0")}`;
  const nextRunId = `${run.tenantId}-run-${nextPeriod}`;
  const nextRunExists = await prisma.payrollRun.findUnique({ where: { id: nextRunId } });
  const nextEligibleCount = employees.filter(
    (e) => e.status !== "terminated" && e.startDate <= nextPayDate
  ).length;

  const result = await prisma.$transaction(async (tx) => {
    await tx.payslip.createMany({
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
        actor: PAYROLL_OWNER[run.tenantId] ?? "Payroll Team",
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

    return { payrollRun, activity, notification, nextRun };
  });

  return {
    payrollRun: mapPayrollRun(result.payrollRun, newPayslips.map((p) => p.id)),
    payslips: newPayslips,
    nextRun: result.nextRun ? mapPayrollRun(result.nextRun, []) : undefined,
    activity: mapActivityItem(result.activity),
    notification: mapNotificationItem(result.notification),
  };
}
