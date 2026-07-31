"use server";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { runAsTenant } from "@/lib/db-context";
import { requireRole, requireActiveSubscription } from "@/lib/auth/require";
import { formatMonthYear } from "@/lib/format";
import { sendPayslipEmail, sendPayrollApprovalRequestEmail } from "@/lib/email";
import { generateEmp201FromRunAction } from "@/lib/compliance/actions";
import { STATUTORY_DEFAULTS, buildPayslip, incrementPeriod } from "./calculator";
import { reverseRunCompletion } from "./run-reversal";
import { workingDaysBetween } from "@/lib/leave/business-days";
import { applyRecurringDeductions } from "./recurring-deductions";
import { toInputValue } from "./variable-pay";
import type { ActivityItem, DaySelection, NotificationItem, PayrollRun, Payslip } from "@/lib/types";
import {
  decToNumber,
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

/**
 * Sets (or clears) the branch a scheduled payroll run targets. Null means the
 * run covers the whole company (current behaviour). Only a scheduled run may be
 * retargeted; once processing has started the eligibility set is fixed. The
 * branch, when provided, must belong to the tenant and be active.
 */
export async function setPayrollRunBranchAction(
  runId: string,
  branchId: string | null
): Promise<PayrollRun> {
  const session = await requireRole("hr");
  await requireActiveSubscription(session.tenantId);
  return runAsTenant(session.tenantId, async (tx) => {
    const run = await tx.payrollRun.findFirst({
      where: { id: runId, tenantId: session.tenantId },
    });
    if (!run) throw new Error("Payroll run not found.");
    if (run.status !== "scheduled") {
      throw new Error("The branch can only be changed before the run is started.");
    }
    if (branchId != null) {
      const branch = await tx.branch.findFirst({
        where: { id: branchId, tenantId: session.tenantId, isActive: true },
        select: { id: true },
      });
      if (!branch) throw new Error("Branch not found.");
    }
    const updated = await tx.payrollRun.update({
      where: { id: runId },
      data: { branchId },
    });
    const payslips = await tx.payslip.findMany({ where: { runId, tenantId: session.tenantId }, select: { id: true } });
    return mapPayrollRun(updated, payslips.map((p) => p.id));
  });
}

export async function startPayrollRunRecord(runId: string): Promise<PayrollRun> {
  const session = await requireRole("hr");
  await requireActiveSubscription(session.tenantId);
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
  await requireActiveSubscription(session.tenantId);
  const tenantId = session.tenantId;
  const { payrollRun, activity, notification, nextRun, newPayslips, eligible } = await runAsTenant(
    tenantId,
    async (tx) => {
      const run = await tx.payrollRun.findFirstOrThrow({ where: { id: runId, tenantId } });
      // Idempotency guard: only a run that is scheduled or processing may be
      // completed. Re-completing an already-processed run would recompute and
      // re-apply recurring deductions, taking loan/garnishee instalments twice.
      if (run.status !== "scheduled" && run.status !== "processing") {
        throw new Error("This payroll run has already been processed.");
      }
      const tenant = await tx.tenant.findUniqueOrThrow({ where: { id: run.tenantId } });
      // Branch scoping for eligibility. When the run targets a branch, only that
      // branch's employees are included; a null-branch run stays company-wide
      // (exactly today's behaviour). A branch-scoped admin is additionally
      // constrained to their own branch, inside the tenant boundary.
      const branchFilter =
        run.branchId != null
          ? { branchId: run.branchId }
          : session.branchScopeId
            ? { branchId: session.branchScopeId }
            : {};
      const [employeeRows, payrollProfiles] = await Promise.all([
        tx.employee.findMany({
          where: { tenantId: run.tenantId, ...branchFilter },
          include: { leaveBalances: true },
        }),
        tx.payrollProfile.findMany({
          where: { tenantId: run.tenantId },
          select: { employeeId: true, medicalAidDependants: true, medicalAidScheme: true },
        }),
      ]);

      // Medical scheme membership and dependants live on the payroll profile.
      // Feed them into the calculator so the s6A medical aid tax credit applies,
      // whether the contribution runs through payroll or is paid privately (a
      // scheme name on the profile is treated as proof of membership).
      const profileByEmployee = new Map(payrollProfiles.map((p) => [p.employeeId, p]));
      const employees = employeeRows.map(mapEmployee).map((e) => {
        const profile = profileByEmployee.get(e.id);
        const isMember =
          (profile?.medicalAidScheme != null && profile.medicalAidScheme.trim() !== "") ||
          e.salary.medicalAid != null;
        if (!isMember) return e;
        return {
          ...e,
          salary: {
            ...e.salary,
            medicalAidDependants: profile?.medicalAidDependants ?? 0,
            isMedicalAidMember: true,
          },
        };
      });

      const payDateStr = toDateOnly(run.payDate);
      const eligible = employees.filter((e) => e.status !== "terminated" && e.startDate <= payDateStr);

      if (eligible.length === 0) {
        throw new Error("There are no eligible employees for this payroll run. Add employees and try again.");
      }

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
            uifCeiling: tenantSettings.uifCeiling.toNumber(),
            sdlEnabled: tenantSettings.sdlEnabled,
            sdlRate: tenantSettings.sdlRate,
          }
        : STATUTORY_DEFAULTS;

      // Approved unpaid leave inside this period reduces the pay base. A
      // request can straddle month boundaries, so only the working days that
      // fall inside the run's period count against this payslip.
      const [periodYear, periodMonth] = run.period.split("-").map(Number);
      const periodStart = new Date(Date.UTC(periodYear, periodMonth - 1, 1));
      const periodEnd = new Date(Date.UTC(periodYear, periodMonth, 0));
      const unpaidRequests = await tx.leaveRequest.findMany({
        where: {
          tenantId: run.tenantId,
          type: "unpaid",
          status: "approved",
          startDate: { lte: periodEnd },
          endDate: { gte: periodStart },
        },
        select: { employeeId: true, startDate: true, endDate: true, daySelections: true },
      });
      const periodStartKey = toDateOnly(periodStart);
      const periodEndKey = toDateOnly(periodEnd);
      const unpaidDaysByEmployee = new Map<string, number>();
      for (const r of unpaidRequests) {
        // Prefer the exact selected days (supports half-days and non-contiguous
        // dates); only count those that fall inside this run's period. Fall back
        // to a working-day span for legacy rows without daySelections.
        const selections = Array.isArray(r.daySelections)
          ? (r.daySelections as unknown as DaySelection[])
          : null;
        let days: number;
        if (selections && selections.length > 0) {
          days = selections.reduce((sum, sel) => {
            if (sel.date >= periodStartKey && sel.date <= periodEndKey) {
              return sum + (sel.type === "full" ? 1 : 0.5);
            }
            return sum;
          }, 0);
        } else {
          const overlapStart = r.startDate > periodStart ? r.startDate : periodStart;
          const overlapEnd = r.endDate < periodEnd ? r.endDate : periodEnd;
          days = workingDaysBetween(toDateOnly(overlapStart), toDateOnly(overlapEnd));
        }
        if (days > 0) {
          unpaidDaysByEmployee.set(
            r.employeeId,
            (unpaidDaysByEmployee.get(r.employeeId) ?? 0) + days
          );
        }
      }

      // Variable-pay inputs captured against this run (Phase 4). Grouped per
      // employee and mapped to the plain values the calculator consumes.
      const variableInputRows = await tx.payrollInput.findMany({
        where: { tenantId: run.tenantId, payrollRunId: run.id },
      });
      const inputsByEmployee = new Map<string, ReturnType<typeof toInputValue>[]>();
      for (const row of variableInputRows) {
        const value = toInputValue({
          componentType: row.componentType,
          label: row.label,
          amount: decToNumber(row.amount),
          taxTreatment: row.taxTreatment,
          quantity: row.quantity != null ? decToNumber(row.quantity) : null,
          rate: row.rate != null ? decToNumber(row.rate) : null,
        });
        const arr = inputsByEmployee.get(row.employeeId) ?? [];
        arr.push(value);
        inputsByEmployee.set(row.employeeId, arr);
      }

      const newPayslips = eligible.map((e) =>
        buildPayslip(e, run.id, run.period, payDateStr, {
          isSDLLiable,
          statutory,
          unpaidLeaveDays: unpaidDaysByEmployee.get(e.id) ?? 0,
          inputs: inputsByEmployee.get(e.id) ?? [],
        })
      );

      // Apply recurring post-tax deductions (loans, garnishees) after tax is
      // computed. Each instalment reduces net pay and the outstanding balance;
      // balances are persisted below and flagged settled when they reach zero.
      const activeDeductions = await tx.employeeDeduction.findMany({
        where: {
          tenantId: run.tenantId,
          status: "active",
          employeeId: { in: eligible.map((e) => e.id) },
        },
      });
      const deductionsByEmployee = new Map<string, typeof activeDeductions>();
      for (const d of activeDeductions) {
        const arr = deductionsByEmployee.get(d.employeeId) ?? [];
        arr.push(d);
        deductionsByEmployee.set(d.employeeId, arr);
      }
      const deductionUpdates: { id: string; newBalance: number; settled: boolean }[] = [];
      for (const p of newPayslips) {
        const empDeductions = deductionsByEmployee.get(p.employeeId);
        if (!empDeductions?.length) continue;
        const result = applyRecurringDeductions(
          empDeductions.map((d) => ({
            id: d.id,
            kind: d.kind,
            description: d.description,
            monthlyAmount: decToNumber(d.monthlyAmount),
            balance: decToNumber(d.balance),
          })),
          { grossRemuneration: p.grossPay }
        );
        if (result.total <= 0) continue;
        p.deductions = [...p.deductions, ...result.lines];
        p.totalDeductions = round2(p.totalDeductions + result.total);
        p.netPay = round2(p.netPay - result.total);
        const descriptionById = new Map(empDeductions.map((d) => [d.id, d.description]));
        const closing: { label: string; balance: number }[] = [];
        for (const a of result.applied) {
          deductionUpdates.push({ id: a.id, newBalance: a.newBalance, settled: a.settled });
          if (a.newBalance > 0) {
            closing.push({ label: descriptionById.get(a.id) ?? "Loan", balance: a.newBalance });
          }
        }
        if (closing.length > 0) p.closingBalances = closing;
      }

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
          employerUif: p.employerUif,
          employerSdl: p.employerSdl,
          employerBenefits: p.employerBenefits
            ? (p.employerBenefits as unknown as Prisma.InputJsonValue)
            : undefined,
          closingBalances: p.closingBalances
            ? (p.closingBalances as unknown as Prisma.InputJsonValue)
            : undefined,
          taxableIncomeAnnual: p.taxableIncomeAnnual,
          taxRebateAnnual: p.taxRebateAnnual,
        })),
      });

      // Persist recovered balances and settle any deduction that reached zero.
      for (const u of deductionUpdates) {
        await tx.employeeDeduction.update({
          where: { id: u.id },
          data: {
            balance: u.newBalance,
            ...(u.settled ? { status: "settled", settledAt: new Date() } : {}),
          },
        });
      }

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

      // Broadcast notification for HR: the run summary.
      const notification = await tx.notificationItem.create({
        data: {
          tenantId: run.tenantId,
          title: needsApproval ? "Payroll awaiting approval" : "Payslips published",
          description: needsApproval
            ? `${formatMonthYear(run.period)} payroll for ${newPayslips.length} employees is awaiting sign-off.`
            : `${formatMonthYear(run.period)} payslips have been generated for ${newPayslips.length} employees.`,
          type: needsApproval ? "warning" : "success",
          audienceRole: "hr",
        },
      });

      // Personal payslip notifications: one per employee, only visible to them.
      // Created even when approval is pending so employees are notified once the run completes.
      if (!needsApproval && newPayslips.length > 0) {
        await tx.notificationItem.createMany({
          skipDuplicates: true,
          data: newPayslips.map((p) => ({
            tenantId: run.tenantId,
            title: `Your ${formatMonthYear(run.period)} payslip is ready`,
            description: `Your payslip for ${formatMonthYear(run.period)} has been published. Log in to view it.`,
            type: "success" as const,
            recipientEmployeeId: p.employeeId,
          })),
        });
      }

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
              // Carry the branch forward so a branch's rolling schedule stays on
              // that branch. Null runs stay company-wide as before.
              branchId: run.branchId,
              employeeCount: nextEligibleCount,
            },
          });

      return { payrollRun, activity, notification, nextRun, newPayslips, eligible };
    }
  );

  // Email the designated approver when the run is waiting for sign-off
  if (payrollRun.status === "awaiting_approval") {
    void (async () => {
      try {
        const settings = await prisma.payrollSettings.findUnique({
          where: { tenantId },
          select: { approvalUserId: true },
        });
        if (settings?.approvalUserId) {
          const approver = await prisma.user.findUnique({
            where: { id: settings.approvalUserId },
            select: { email: true, name: true },
          });
          if (approver) {
            const totalNet = newPayslips.reduce((sum, p) => sum + p.netPay, 0);
            await sendPayrollApprovalRequestEmail({
              recipientEmail: approver.email,
              approverName: approver.name,
              period: formatMonthYear(payrollRun.period),
              employeeCount: newPayslips.length,
              totalNet,
              submittedBy: session.name,
              appUrl: process.env.NEXT_PUBLIC_APP_URL,
            });
          }
        }
      } catch (err) {
        console.error("[payroll] approval request email failed", err);
      }
    })();
  }

  // Only send payslip emails if the run went straight to completed (no approval required)
  if (payrollRun.status === "completed") {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    await Promise.allSettled(
      newPayslips.map(async (payslip) => {
        const emp = eligible.find((e) => e.id === payslip.employeeId);
        if (!emp) return;
        await sendPayslipEmail({
          recipientEmail: emp.email,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          period: payslip.period,
          netPay: payslip.netPay,
          appUrl,
        });
      })
    );

    // Roll the run up into the EMP201 (and PAYE/UIF/SDL) compliance records.
    // Best-effort: a compliance hiccup must not fail payroll completion.
    try {
      await generateEmp201FromRunAction(tenantId, runId);
    } catch (err) {
      console.error("EMP201 generation failed for run", runId, err);
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

/**
 * Creates an off-cycle payroll run: an ad-hoc run outside the normal monthly
 * schedule (a bonus run or a correction) that the user can attach variable-pay
 * inputs to (Phase 4's PayrollInput) and finalise independently. It never
 * touches the regular scheduled run for the period, and completing it uses the
 * same completePayrollRunRecord path. runType is set to "off_cycle" so the run
 * is distinguishable in the UI and reporting; regular runs stay untouched.
 */
export async function createOffCyclePayrollRunAction(input: {
  period: string;
  payDate: string;
  reason?: string;
  branchId?: string | null;
}): Promise<PayrollRun> {
  const session = await requireRole("hr");
  await requireActiveSubscription(session.tenantId);
  const tenantId = session.tenantId;

  if (!/^\d{4}-\d{2}$/.test(input.period)) {
    throw new Error("Period must be in YYYY-MM format.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.payDate)) {
    throw new Error("Pay date must be a valid date.");
  }

  return runAsTenant(tenantId, async (tx) => {
    // A branch-scoped admin may only create runs for their own branch. An
    // explicit branch, when given, must belong to the tenant and be active.
    let branchId = input.branchId ?? null;
    if (session.branchScopeId) {
      branchId = session.branchScopeId;
    }
    if (branchId != null) {
      const branch = await tx.branch.findFirst({
        where: { id: branchId, tenantId, isActive: true },
        select: { id: true },
      });
      if (!branch) throw new Error("Branch not found.");
    }

    const reason = input.reason?.trim() || undefined;
    const label = reason
      ? `${formatMonthYear(input.period)} off-cycle: ${reason}`
      : `${formatMonthYear(input.period)} off-cycle run`;

    // A distinct id so an off-cycle run never collides with the regular
    // "{tenant}-run-{period}" scheduled run for the same period.
    const id = `${tenantId}-offcycle-${input.period}-${Date.now().toString(36)}`;

    const run = await tx.payrollRun.create({
      data: {
        id,
        tenantId,
        period: input.period,
        label,
        payDate: new Date(input.payDate),
        status: "scheduled",
        runType: "off_cycle",
        runReason: reason,
        branchId,
      },
    });

    await tx.activityItem.create({
      data: {
        tenantId,
        type: "payroll_run",
        message: `created an off-cycle payroll run for ${formatMonthYear(input.period)}`,
        actor: session.name,
      },
    });

    return mapPayrollRun(run, []);
  });
}

export async function cancelPayrollRunRecord(runId: string): Promise<{
  payrollRun: PayrollRun;
  cancelledPayslipIds: string[];
  activity: ActivityItem;
}> {
  const session = await requireRole("hr");
  const tenantId = session.tenantId;
  return runAsTenant(tenantId, async (tx) => {
    const run = await tx.payrollRun.findFirst({ where: { id: runId, tenantId } });
    if (!run) throw new Error("Payroll run not found.");
    if (run.status !== "completed" && run.status !== "awaiting_approval") {
      throw new Error("Only a completed or awaiting-approval run can be cancelled.");
    }
    // Once the batch is with Netcash the money has moved: block cancellation.
    const exported = await tx.bankExport.findFirst({
      where: { payrollRunId: runId, status: "exported" },
      select: { id: true },
    });
    if (exported) {
      throw new Error(
        "This run was already submitted to Netcash and cannot be cancelled. Reverse the payment with Netcash first."
      );
    }

    const existing = await tx.payslip.findMany({ where: { runId, tenantId }, select: { id: true } });
    const cancelledPayslipIds = existing.map((p) => p.id);

    await reverseRunCompletion(tx, runId, tenantId);

    const updated = await tx.payrollRun.update({
      where: { id: runId },
      data: {
        status: "scheduled",
        totalGross: 0,
        totalDeductions: 0,
        totalNet: 0,
        totalPaye: 0,
        totalUif: 0,
        employeeCount: 0,
        processedOn: null,
        approvedBy: null,
        approvedAt: null,
        approvalNote: null,
      },
    });

    const activity = await tx.activityItem.create({
      data: {
        tenantId,
        type: "payroll_run",
        message: `cancelled the ${formatMonthYear(run.period)} payroll run`,
        actor: session.name,
      },
    });

    return {
      payrollRun: mapPayrollRun(updated, []),
      cancelledPayslipIds,
      activity: mapActivityItem(activity),
    };
  });
}
