import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  employmentTypeLabel,
  formatCurrency,
  formatCurrencyCompact,
  formatDate,
  formatDateLong,
  formatMonthShort,
  formatMonthYear,
  formatOrdinal,
  formatRelativeTime,
  getInitials,
  leaveTypeLabel,
  maskAccountNumber,
} from "./format";

describe("formatCurrency", () => {
  it("formats a positive amount in ZAR with two decimals", () => {
    expect(formatCurrency(1234.5)).toBe("R 1,234.50");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("R 0.00");
  });

  it("formats negative amounts", () => {
    expect(formatCurrency(-500)).toBe("R -500.00");
  });

  it("omits cents when cents is false", () => {
    expect(formatCurrency(40_000, "ZAR", { cents: false })).toBe("R 40,000");
    expect(formatCurrency(28_077.88, "ZAR", { cents: false })).toBe("R 28,078");
  });

  it("keeps cents by default", () => {
    expect(formatCurrency(40_000)).toBe("R 40,000.00");
  });
});

describe("formatCurrencyCompact", () => {
  it("formats millions with an M suffix", () => {
    expect(formatCurrencyCompact(1_500_000)).toBe("R 1.5M");
  });

  it("formats thousands with a K suffix", () => {
    expect(formatCurrencyCompact(2_500)).toBe("R 2.5K");
  });

  it("formats amounts under 1000 with no suffix", () => {
    expect(formatCurrencyCompact(500)).toBe("R 500");
  });

  it("drops a trailing .0 for whole magnitudes", () => {
    expect(formatCurrencyCompact(40_000)).toBe("R 40K");
    expect(formatCurrencyCompact(1_000_000)).toBe("R 1M");
  });

  it("uses the given currency as the prefix for non-ZAR currencies", () => {
    expect(formatCurrencyCompact(2_500, "USD")).toBe("USD 2.5K");
  });
});

describe("formatDate / formatDateLong", () => {
  it("formats a date string as 'D Mon YYYY'", () => {
    expect(formatDate("2026-06-15")).toBe("15 Jun 2026");
  });

  it("formats a date string as 'D Month YYYY'", () => {
    expect(formatDateLong("2026-06-15")).toBe("15 June 2026");
  });

  it("accepts a Date object", () => {
    expect(formatDate(new Date(2026, 5, 15))).toBe("15 Jun 2026");
  });
});

describe("formatMonthYear / formatMonthShort", () => {
  it("formats a YYYY-MM period as 'Month YYYY'", () => {
    expect(formatMonthYear("2026-06")).toBe("June 2026");
  });

  it("formats a YYYY-MM period as a short month name", () => {
    expect(formatMonthShort("2026-06")).toBe("Jun");
  });

  it("handles December correctly", () => {
    expect(formatMonthYear("2026-12")).toBe("December 2026");
  });
});

describe("employmentTypeLabel", () => {
  it("maps each employment type to its label", () => {
    expect(employmentTypeLabel("full_time")).toBe("Full-time (permanent)");
    expect(employmentTypeLabel("part_time")).toBe("Part-time");
    expect(employmentTypeLabel("contract")).toBe("Fixed-term contract");
    expect(employmentTypeLabel("temporary")).toBe("Temporary");
    expect(employmentTypeLabel("learnership")).toBe("Learnership");
  });
});

describe("leaveTypeLabel", () => {
  it("maps each leave type to its label", () => {
    expect(leaveTypeLabel("annual")).toBe("Annual leave");
    expect(leaveTypeLabel("sick")).toBe("Sick leave");
    expect(leaveTypeLabel("unpaid")).toBe("Unpaid leave");
    expect(leaveTypeLabel("family")).toBe("Family responsibility leave");
  });
});

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'Just now' for timestamps less than 30 seconds ago", () => {
    expect(formatRelativeTime("2026-06-15T11:59:45Z")).toBe("Just now");
  });

  it("returns minutes ago for timestamps under an hour", () => {
    expect(formatRelativeTime("2026-06-15T11:45:00Z")).toBe("15m ago");
  });

  it("returns hours ago for timestamps under a day", () => {
    expect(formatRelativeTime("2026-06-15T08:00:00Z")).toBe("4h ago");
  });

  it("returns 'Yesterday' exactly one day ago", () => {
    expect(formatRelativeTime("2026-06-14T12:00:00Z")).toBe("Yesterday");
  });

  it("returns days ago for timestamps under a week", () => {
    expect(formatRelativeTime("2026-06-12T12:00:00Z")).toBe("3d ago");
  });

  it("falls back to a formatted date a week or more ago", () => {
    expect(formatRelativeTime("2026-06-01T12:00:00Z")).toBe(formatDate("2026-06-01T12:00:00Z"));
  });
});

describe("getInitials", () => {
  it("uppercases the first letter of each name", () => {
    expect(getInitials("aisha", "patel")).toBe("AP");
  });
});

describe("maskAccountNumber", () => {
  it("masks all but the last 4 digits", () => {
    expect(maskAccountNumber("62847193015")).toBe("•••• 3015");
  });

  it("returns short account numbers unmasked", () => {
    expect(maskAccountNumber("1234")).toBe("1234");
    expect(maskAccountNumber("123")).toBe("123");
  });
});

describe("formatOrdinal", () => {
  it("handles 1st/2nd/3rd", () => {
    expect(formatOrdinal(1)).toBe("1st");
    expect(formatOrdinal(2)).toBe("2nd");
    expect(formatOrdinal(3)).toBe("3rd");
  });

  it("handles the 11th-13th special cases", () => {
    expect(formatOrdinal(11)).toBe("11th");
    expect(formatOrdinal(12)).toBe("12th");
    expect(formatOrdinal(13)).toBe("13th");
  });

  it("handles the 21st-23rd cases", () => {
    expect(formatOrdinal(21)).toBe("21st");
    expect(formatOrdinal(22)).toBe("22nd");
    expect(formatOrdinal(23)).toBe("23rd");
  });

  it("handles teens in higher decades (111th-113th)", () => {
    expect(formatOrdinal(111)).toBe("111th");
    expect(formatOrdinal(112)).toBe("112th");
    expect(formatOrdinal(113)).toBe("113th");
  });

  it("falls back to 'th' for everything else", () => {
    expect(formatOrdinal(4)).toBe("4th");
    expect(formatOrdinal(101)).toBe("101st");
  });
});
