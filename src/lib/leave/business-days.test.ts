import { describe, expect, it } from "vitest";
import {
  isSaPublicHoliday,
  isWeekend,
  isWorkingDay,
  publicHolidaysForYear,
  workingDaysBetween,
} from "./business-days";

describe("isWeekend", () => {
  it("flags Saturdays and Sundays", () => {
    expect(isWeekend("2026-07-04")).toBe(true); // Saturday
    expect(isWeekend("2026-07-05")).toBe(true); // Sunday
    expect(isWeekend("2026-07-06")).toBe(false); // Monday
  });
});

describe("isSaPublicHoliday", () => {
  it("recognises fixed holidays", () => {
    expect(isSaPublicHoliday("2026-06-16")).toBe(true); // Youth Day
    expect(isSaPublicHoliday("2026-12-25")).toBe(true); // Christmas
    expect(isSaPublicHoliday("2026-07-01")).toBe(false);
  });

  it("recognises movable Easter holidays", () => {
    expect(isSaPublicHoliday("2026-04-03")).toBe(true); // Good Friday 2026
    expect(isSaPublicHoliday("2026-04-06")).toBe(true); // Family Day 2026
    expect(isSaPublicHoliday("2027-03-26")).toBe(true); // Good Friday 2027
  });

  it("includes the Monday observance when a holiday falls on a Sunday", () => {
    expect(isSaPublicHoliday("2026-08-09")).toBe(true); // Women's Day (Sunday)
    expect(isSaPublicHoliday("2026-08-10")).toBe(true); // observed Monday
    expect(isSaPublicHoliday("2027-03-22")).toBe(true); // Human Rights Day observed
  });
});

describe("isWorkingDay", () => {
  it("is false on weekends and holidays, true on normal weekdays", () => {
    expect(isWorkingDay("2026-07-06")).toBe(true); // Monday
    expect(isWorkingDay("2026-07-04")).toBe(false); // Saturday
    expect(isWorkingDay("2026-06-16")).toBe(false); // Youth Day (Tuesday)
  });
});

describe("workingDaysBetween", () => {
  it("counts a full working week as 5 days", () => {
    // Mon 6 Jul to Fri 10 Jul 2026, no holidays
    expect(workingDaysBetween("2026-07-06", "2026-07-10")).toBe(5);
  });

  it("excludes weekends inside the range", () => {
    // Wed 1 Jul to Tue 7 Jul 2026 spans one weekend
    expect(workingDaysBetween("2026-07-01", "2026-07-07")).toBe(5);
  });

  it("excludes public holidays inside the range", () => {
    // Mon 15 Jun to Wed 17 Jun 2026 includes Youth Day (Tue 16th)
    expect(workingDaysBetween("2026-06-15", "2026-06-17")).toBe(2);
  });

  it("returns 0 for a weekend-only range", () => {
    expect(workingDaysBetween("2026-07-04", "2026-07-05")).toBe(0);
  });

  it("returns 0 for an inverted range", () => {
    expect(workingDaysBetween("2026-07-10", "2026-07-06")).toBe(0);
  });

  it("counts a single working day as 1", () => {
    expect(workingDaysBetween("2026-07-01", "2026-07-01")).toBe(1);
  });

  it("handles the December holiday cluster", () => {
    // Mon 14 Dec to Fri 18 Dec 2026 includes Day of Reconciliation (Wed 16th)
    expect(workingDaysBetween("2026-12-14", "2026-12-18")).toBe(4);
  });
});

describe("publicHolidaysForYear", () => {
  it("returns 12 statutory holidays for 2026 plus the observed Monday", () => {
    const holidays = publicHolidaysForYear(2026);
    expect(holidays).toHaveLength(13);
    expect(holidays.every((h) => h.date.startsWith("2026-"))).toBe(true);
  });

  it("returns an empty list for uncovered years", () => {
    expect(publicHolidaysForYear(2031)).toEqual([]);
  });
});
