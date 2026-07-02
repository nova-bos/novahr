/**
 * Working-day arithmetic for leave requests.
 *
 * BCEA leave entitlements are expressed in working days for a standard
 * five-day week, so weekends and South African public holidays are excluded
 * when counting the length of a leave request.
 *
 * Public holidays follow the Public Holidays Act 36 of 1994: when a holiday
 * falls on a Sunday, the following Monday is also a public holiday. The
 * observed dates below already include those Monday shifts.
 */

export interface PublicHoliday {
  date: string;
  name: string;
}

export const SA_PUBLIC_HOLIDAYS: PublicHoliday[] = [
  // 2026
  { date: "2026-01-01", name: "New Year's Day" },
  { date: "2026-03-21", name: "Human Rights Day" },
  { date: "2026-04-03", name: "Good Friday" },
  { date: "2026-04-06", name: "Family Day" },
  { date: "2026-04-27", name: "Freedom Day" },
  { date: "2026-05-01", name: "Workers' Day" },
  { date: "2026-06-16", name: "Youth Day" },
  { date: "2026-08-09", name: "National Women's Day" },
  { date: "2026-08-10", name: "National Women's Day (observed)" },
  { date: "2026-09-24", name: "Heritage Day" },
  { date: "2026-12-16", name: "Day of Reconciliation" },
  { date: "2026-12-25", name: "Christmas Day" },
  { date: "2026-12-26", name: "Day of Goodwill" },
  // 2027
  { date: "2027-01-01", name: "New Year's Day" },
  { date: "2027-03-21", name: "Human Rights Day" },
  { date: "2027-03-22", name: "Human Rights Day (observed)" },
  { date: "2027-03-26", name: "Good Friday" },
  { date: "2027-03-29", name: "Family Day" },
  { date: "2027-04-27", name: "Freedom Day" },
  { date: "2027-05-01", name: "Workers' Day" },
  { date: "2027-06-16", name: "Youth Day" },
  { date: "2027-08-09", name: "National Women's Day" },
  { date: "2027-09-24", name: "Heritage Day" },
  { date: "2027-12-16", name: "Day of Reconciliation" },
  { date: "2027-12-25", name: "Christmas Day" },
  { date: "2027-12-26", name: "Day of Goodwill" },
  { date: "2027-12-27", name: "Day of Goodwill (observed)" },
  // 2028
  { date: "2028-01-01", name: "New Year's Day" },
  { date: "2028-03-21", name: "Human Rights Day" },
  { date: "2028-04-14", name: "Good Friday" },
  { date: "2028-04-17", name: "Family Day" },
  { date: "2028-04-27", name: "Freedom Day" },
  { date: "2028-05-01", name: "Workers' Day" },
  { date: "2028-06-16", name: "Youth Day" },
  { date: "2028-08-09", name: "National Women's Day" },
  { date: "2028-09-24", name: "Heritage Day" },
  { date: "2028-09-25", name: "Heritage Day (observed)" },
  { date: "2028-12-16", name: "Day of Reconciliation" },
  { date: "2028-12-25", name: "Christmas Day" },
  { date: "2028-12-26", name: "Day of Goodwill" },
];

const HOLIDAY_SET = new Set(SA_PUBLIC_HOLIDAYS.map((h) => h.date));

export function publicHolidaysForYear(year: number): PublicHoliday[] {
  return SA_PUBLIC_HOLIDAYS.filter((h) => h.date.startsWith(`${year}-`));
}

export function isSaPublicHoliday(isoDate: string): boolean {
  return HOLIDAY_SET.has(isoDate);
}

function toUtcDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00Z`);
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function isWeekend(isoDate: string): boolean {
  const day = toUtcDate(isoDate).getUTCDay();
  return day === 0 || day === 6;
}

export function isWorkingDay(isoDate: string): boolean {
  return !isWeekend(isoDate) && !isSaPublicHoliday(isoDate);
}

/**
 * Counts working days (Mon-Fri, excluding SA public holidays) in the
 * inclusive range `startIso` to `endIso`. Returns 0 for an inverted range.
 * A request that covers only weekend/holiday dates counts as 0 days.
 */
export function workingDaysBetween(startIso: string, endIso: string): number {
  const start = toUtcDate(startIso);
  const end = toUtcDate(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return 0;

  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    if (isWorkingDay(toIso(cursor))) count++;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}
