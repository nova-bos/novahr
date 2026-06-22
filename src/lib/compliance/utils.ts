/**
 * Compliance utility functions for PAYE, UIF, and SDL return tracking.
 */

/**
 * Returns the due date for a compliance return: the 7th of the month following the period.
 * period is in "YYYY-MM" format.
 */
export function getComplianceDueDate(period: string): Date {
  const [year, month] = period.split("-").map(Number);
  // Month is 0-based in Date constructor, so +1 moves to next month
  return new Date(year, month, 7);
}

/**
 * Returns true if the given due date has passed.
 */
export function isOverdue(dueDate: Date): boolean {
  return dueDate < new Date();
}

/**
 * Formats a period string like "2024-11" into "Nov 2024".
 */
export function formatPeriod(period: string): string {
  const [year, month] = period.split("-").map(Number);
  const d = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat("en-ZA", { month: "short", year: "numeric" }).format(d);
}

/**
 * Calculates SDL at 1% of total gross payroll.
 */
export function calculateSdl(totalGross: number): number {
  return Math.round(totalGross * 0.01 * 100) / 100;
}

/**
 * Returns the current South African tax year string, e.g. "2025/2026".
 * The SA tax year runs from 1 March to 28/29 February.
 */
export function getCurrentTaxYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-based
  if (month >= 3) {
    return `${year}/${year + 1}`;
  }
  return `${year - 1}/${year}`;
}
