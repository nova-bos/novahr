import type { LeavePolicy, PayFrequency } from "@/lib/types";

export const leavePolicies: LeavePolicy[] = [
  {
    type: "annual",
    label: "Annual Leave",
    annualDays: 18,
    description: "Standard paid leave accrued for rest and personal time, exceeding the BCEA minimum of 15 days.",
    requiresApproval: true,
    paid: true,
  },
  {
    type: "sick",
    label: "Sick Leave",
    annualDays: 10,
    description: "Paid leave for illness or injury. Medical certificates required for absences longer than 2 days.",
    requiresApproval: true,
    paid: true,
  },
  {
    type: "family",
    label: "Family Responsibility Leave",
    annualDays: 3,
    description: "Paid leave for the birth, illness or death of an immediate family member, as per the BCEA.",
    requiresApproval: true,
    paid: true,
  },
  {
    type: "unpaid",
    label: "Unpaid Leave",
    annualDays: 5,
    description: "Discretionary leave without pay for circumstances outside other leave categories.",
    requiresApproval: true,
    paid: false,
  },
];

export const payFrequencyOptions: { value: PayFrequency; label: string; description: string }[] = [
  {
    value: "monthly",
    label: "Monthly",
    description: "Salaries paid once a month, typically on the 25th or last business day.",
  },
  {
    value: "biweekly",
    label: "Bi-weekly",
    description: "Salaries paid every two weeks, common for hourly and shift-based teams.",
  },
  {
    value: "weekly",
    label: "Weekly",
    description: "Salaries paid every week, common in warehousing and field operations.",
  },
];
