export function formatCurrency(amount: number, currency = "ZAR"): string {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(amount)
    .replace("ZAR", "R")
    .replace(/ /g, " ");
}

export function formatCurrencyCompact(amount: number, currency = "ZAR"): string {
  const prefix = currency === "ZAR" ? "R" : currency;
  if (Math.abs(amount) >= 1_000_000) {
    return `${prefix} ${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(amount) >= 1_000) {
    return `${prefix} ${(amount / 1_000).toFixed(1)}K`;
  }
  return `${prefix} ${amount.toFixed(0)}`;
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

export function employmentTypeLabel(type: "full_time" | "part_time" | "contract"): string {
  switch (type) {
    case "full_time":
      return "Full-time";
    case "part_time":
      return "Part-time";
    case "contract":
      return "Contract";
  }
}

export function leaveTypeLabel(type: "annual" | "sick" | "unpaid" | "family"): string {
  switch (type) {
    case "annual":
      return "Annual leave";
    case "sick":
      return "Sick leave";
    case "unpaid":
      return "Unpaid leave";
    case "family":
      return "Family responsibility leave";
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
