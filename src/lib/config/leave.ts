import type { LeavePolicy, LeaveType, PayFrequency } from "@/lib/types";

/**
 * South African statutory leave framework (BCEA sections 20 to 27, as read
 * with the Constitutional Court's interim order in Van Wyk v Minister of
 * Employment and Labour, October 2025).
 *
 * Durations are expressed in working days for a five-day week. Statutory
 * family leave (maternity, parental, adoption, commissioning) is unpaid by
 * the employer; employees claim benefits from the UIF for those periods.
 * Under the Van Wyk interim order, parents in a parental relationship may
 * share the combined four months plus ten days between them.
 */
export const leavePolicies: LeavePolicy[] = [
  {
    type: "annual",
    label: "Annual Leave",
    annualDays: 18,
    description:
      "Paid leave for rest and personal time. NovaHR's default of 18 working days exceeds the BCEA section 20 minimum of 21 consecutive days (15 working days) per annual cycle.",
    requiresApproval: true,
    paid: true,
  },
  {
    type: "sick",
    label: "Sick Leave",
    annualDays: 30,
    cycleMonths: 36,
    description:
      "Paid leave for illness or injury: 30 working days per 36-month cycle (BCEA section 22, five-day week). A medical certificate is required for absences longer than 2 consecutive days or frequent short absences.",
    requiresApproval: true,
    paid: true,
  },
  {
    type: "family",
    label: "Family Responsibility Leave",
    annualDays: 3,
    description:
      "Paid leave when a child is sick, or on the death of a spouse, partner, parent, grandparent, child, grandchild or sibling (BCEA section 27). Available after 4 months of service to employees working at least 4 days a week.",
    requiresApproval: true,
    paid: true,
  },
  {
    type: "maternity",
    label: "Maternity Leave",
    annualDays: 88,
    description:
      "At least 4 consecutive months (about 88 working days) for a birthing parent, starting up to 4 weeks before the expected birth (BCEA section 25). Unpaid by the employer; the employee claims maternity benefits from the UIF. Shareable between parents under the Van Wyk interim order.",
    requiresApproval: true,
    paid: false,
  },
  {
    type: "parental",
    label: "Parental Leave",
    annualDays: 10,
    description:
      "10 consecutive days for a parent who is not the birthing parent, from the day the child is born (BCEA section 25A). Unpaid by the employer; claimable from the UIF. Shareable between parents under the Van Wyk interim order.",
    requiresApproval: true,
    paid: false,
  },
  {
    type: "adoption",
    label: "Adoption Leave",
    annualDays: 50,
    description:
      "10 consecutive weeks (about 50 working days) for an adoptive parent of a child under 2 years (BCEA section 25B). If there are two adoptive parents, one takes adoption leave and the other parental leave. Unpaid by the employer; claimable from the UIF.",
    requiresApproval: true,
    paid: false,
  },
  {
    type: "commissioning",
    label: "Commissioning Parental Leave",
    annualDays: 50,
    description:
      "10 consecutive weeks (about 50 working days) for a commissioning parent in a surrogacy agreement (BCEA section 25C). If there are two commissioning parents, one takes commissioning parental leave and the other parental leave. Unpaid by the employer; claimable from the UIF.",
    requiresApproval: true,
    paid: false,
  },
  {
    type: "study",
    label: "Study Leave",
    annualDays: 5,
    description:
      "Paid leave for exams and study days. Not required by the BCEA; NovaHR's default company policy grants 5 working days per year for approved courses.",
    requiresApproval: true,
    paid: true,
  },
  {
    type: "unpaid",
    label: "Unpaid Leave",
    annualDays: 5,
    description:
      "Discretionary leave without pay for circumstances outside other leave categories. Approved unpaid days reduce the month's salary pro rata.",
    requiresApproval: true,
    paid: false,
  },
];

export const DEFAULT_LEAVE_TOTALS: Record<LeaveType, number> = Object.fromEntries(
  leavePolicies.map((policy) => [policy.type, policy.annualDays])
) as Record<LeaveType, number>;

/** Leave types shown by default in the request dialog and balances table. */
export const CORE_LEAVE_TYPES: LeaveType[] = ["annual", "sick", "family"];

/** Statutory family-related leave, grouped separately in pickers. */
export const FAMILY_LEAVE_TYPES: LeaveType[] = [
  "maternity",
  "parental",
  "adoption",
  "commissioning",
];

/** Company-policy leave types. */
export const OTHER_LEAVE_TYPES: LeaveType[] = ["study", "unpaid"];

export function getLeavePolicy(type: LeaveType): LeavePolicy {
  const policy = leavePolicies.find((p) => p.type === type);
  if (!policy) throw new Error(`Unknown leave type: ${type}`);
  return policy;
}

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
