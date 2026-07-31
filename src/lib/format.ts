import type { EmploymentType } from "@/lib/types";
import { EMPLOYMENT_TYPE_LABELS } from "@/lib/config/employee-options";

export function formatCurrency(
  amount: number,
  currency = "ZAR",
  opts?: { cents?: boolean }
): string {
  const prefix = currency === "ZAR" ? "R" : currency;
  const cents = opts?.cents ?? true;
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  }).format(amount);
  return `${prefix} ${formatted}`;
}

export function formatCurrencyCompact(amount: number, currency = "ZAR"): string {
  const prefix = currency === "ZAR" ? "R" : currency;
  const abs = Math.abs(amount);
  // Drop a trailing ".0" so whole magnitudes read cleanly, e.g. "R 40K" not "R 40.0K".
  if (abs >= 1_000_000) {
    const n = amount / 1_000_000;
    return `${prefix} ${n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    const n = amount / 1_000;
    return `${prefix} ${n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)}K`;
  }
  return `${prefix} ${amount.toFixed(0)}`;
}

/** Compact currency for SVG chart axis ticks — no space, no trailing .0, so the label stays on one line. */
export function formatAxisCurrency(value: number, currency = "ZAR"): string {
  const prefix = currency === "ZAR" ? "R" : currency;
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    const n = value / 1_000_000;
    return `${prefix}${n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    const n = value / 1_000;
    return `${prefix}${n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)}K`;
  }
  return `${prefix}${value.toFixed(0)}`;
}

export function formatDate(date: string | Date, opts?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...opts,
  }).format(d);
}

export function formatDateLong(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function formatMonthYear(period: string): string {
  const [year, month] = period.split("-").map(Number);
  const d = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat("en-ZA", { month: "long", year: "numeric" }).format(d);
}

export function formatMonthShort(period: string): string {
  const [year, month] = period.split("-").map(Number);
  const d = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat("en-ZA", { month: "short" }).format(d);
}

export function employmentTypeLabel(type: EmploymentType): string {
  return EMPLOYMENT_TYPE_LABELS[type] ?? type;
}

export function leaveTypeLabel(
  type:
    | "annual"
    | "sick"
    | "unpaid"
    | "family"
    | "maternity"
    | "parental"
    | "adoption"
    | "commissioning"
    | "study"
): string {
  switch (type) {
    case "annual":
      return "Annual leave";
    case "sick":
      return "Sick leave";
    case "unpaid":
      return "Unpaid leave";
    case "family":
      return "Family responsibility leave";
    case "maternity":
      return "Maternity leave";
    case "parental":
      return "Parental leave";
    case "adoption":
      return "Adoption leave";
    case "commissioning":
      return "Commissioning parental leave";
    case "study":
      return "Study leave";
  }
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(d);
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function maskAccountNumber(accountNumber: string): string {
  if (accountNumber.length <= 4) return accountNumber;
  return `•••• ${accountNumber.slice(-4)}`;
}

/** Returns the singular or plural form of a word based on count. */
export function plural(n: number, one: string, many = `${one}s`): string {
  return n === 1 ? one : many;
}

export function formatOrdinal(n: number): string {
  const remainder = n % 100;
  if (remainder >= 11 && remainder <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}
