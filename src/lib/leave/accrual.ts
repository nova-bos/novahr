import type { LeaveType } from "@/lib/types";

/**
 * BCEA section 22 sick-leave entitlement for the first 6 months of service.
 *
 * During the first 6 calendar months a new employee may only take 1 day of
 * sick leave per 26 working days worked (BCEA s.22(2)). After 6 months the
 * full 36-month cycle of 30 working days (for a 5-day week) applies.
 *
 * Returns the number of sick leave days the employee is entitled to use as of
 * `asOf`. Callers should compare this to the employee's current sick leave
 * balance to determine how many days remain available.
 *
 * @param startDate ISO date string of the employee's start date.
 * @param cycleDays The full sick-leave cycle entitlement (default 30 for a
 *   five-day-week employee under the BCEA).
 * @param asOf Date to evaluate against (defaults to today).
 */
export function sickLeaveEntitlement(params: {
  startDate: string;
  cycleDays?: number;
  asOf?: Date;
}): number {
  const { startDate, cycleDays = 30 } = params;
  const asOf = params.asOf ?? new Date();
  const months = completedMonths(new Date(startDate), asOf);
  if (months >= 6) {
    // Past the first 6 months: full 36-month cycle entitlement.
    return cycleDays;
  }
  // First 6 months: 1 day per 26 working days.
  // Working days = months * ~21.67 (261 / 12). We use 26-day periods.
  const workingDaysApprox = months * (261 / 12);
  const periodsCompleted = Math.floor(workingDaysApprox / 26);
  return Math.min(cycleDays, periodsCompleted);
}

export type LeaveAccrualMethod = "upfront" | "accrual";

// Leave types that accrue monthly under the accrual method. In SA only annual
// leave is earned pro-rata over the year: sick leave runs on a 36-month cycle
// and family/maternity/parental leave are fixed statutory blocks, so those are
// always allocated in full regardless of the method.
export const ACCRUING_LEAVE_TYPES: readonly LeaveType[] = ["annual"];

/**
 * Whole calendar months completed between `start` and `asOf`. The monthly
 * anniversary (same day-of-month as the start date) must be reached to count,
 * so an employee who started on the 15th earns the month on the 15th.
 */
export function completedMonths(start: Date, asOf: Date): number {
  let months =
    (asOf.getFullYear() - start.getFullYear()) * 12 + (asOf.getMonth() - start.getMonth());
  if (asOf.getDate() < start.getDate()) months -= 1;
  return Math.max(0, months);
}

/**
 * The leave entitlement earned to date for one balance.
 *
 * - "upfront": the full annual `total` is available immediately.
 * - "accrual": annual leave is earned evenly across twelve months
 *   (total * min(monthsWorked, 12) / 12), reaching the full amount after a year.
 *   Non-accruing leave types are always returned in full.
 *
 * Result is capped at `total`, floored at 0, and rounded to one decimal so the
 * displayed balance is not a noisy fraction.
 */
export function accruedEntitlement(params: {
  type: LeaveType;
  total: number;
  method: LeaveAccrualMethod;
  startDate: string;
  asOf?: Date;
}): number {
  const { type, total, method, startDate } = params;
  if (method === "upfront" || total <= 0 || !ACCRUING_LEAVE_TYPES.includes(type)) {
    return total;
  }
  const asOf = params.asOf ?? new Date();
  const months = Math.min(12, completedMonths(new Date(startDate), asOf));
  const earned = (total * months) / 12;
  return Math.min(total, Math.round(earned * 10) / 10);
}
