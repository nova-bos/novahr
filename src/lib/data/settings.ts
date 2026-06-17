import type { LeavePolicy, PayFrequency } from "../types";

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

export interface PayrollConfig {
  tenantId: string;
  payeReferenceNumber: string;
  uifReferenceNumber: string;
  sdlReferenceNumber: string;
  taxYear: string;
  uifEnabled: boolean;
  sdlEnabled: boolean;
  defaultPensionPct: number;
}

export const payrollConfigs: PayrollConfig[] = [
  {
    tenantId: "novatech",
    payeReferenceNumber: "7480123456",
    uifReferenceNumber: "U123456789",
    sdlReferenceNumber: "L123456789",
    taxYear: "2025/2026",
    uifEnabled: true,
    sdlEnabled: true,
    defaultPensionPct: 7.5,
  },
  {
    tenantId: "apex",
    payeReferenceNumber: "7470987654",
    uifReferenceNumber: "U987654321",
    sdlReferenceNumber: "L987654321",
    taxYear: "2025/2026",
    uifEnabled: true,
    sdlEnabled: true,
    defaultPensionPct: 7.5,
  },
  {
    tenantId: "horizon",
    payeReferenceNumber: "7460456789",
    uifReferenceNumber: "U456789123",
    sdlReferenceNumber: "L456789123",
    taxYear: "2025/2026",
    uifEnabled: true,
    sdlEnabled: true,
    defaultPensionPct: 7.5,
  },
];

/**
 * Falls back to sensible defaults for tenants that don't have a configured
 * entry yet (e.g. a brand-new signup) - this is global static config until
 * it becomes tenant-configurable in a later phase.
 */
export function getPayrollConfig(tenantId: string): PayrollConfig {
  const config = payrollConfigs.find((c) => c.tenantId === tenantId);
  if (config) return config;

  return {
    tenantId,
    payeReferenceNumber: "",
    uifReferenceNumber: "",
    sdlReferenceNumber: "",
    taxYear: "2025/2026",
    uifEnabled: true,
    sdlEnabled: true,
    defaultPensionPct: 7.5,
  };
}
