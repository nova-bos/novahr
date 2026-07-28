import type { TenantPlan } from "@/lib/types";

// All paid plans (starter, growth, scale) and trial unlock every feature.
// Feature gating is now purely by subscription status rather than plan tier.

const PAYROLL_FEATURES = [
  "payrollRuns",
  "compliance",
  "bankExports",
  "deductionTypes",
  "payrollSettings",
  "payrollReports",
  "payrollProfiles",
] as const;

export type PlanFeature = (typeof PAYROLL_FEATURES)[number];

export function canAccess(plan: TenantPlan | undefined, _feature: PlanFeature): boolean {
  if (!plan) return false;
  // All plans grant access to all features. Access is controlled by
  // subscription status (via TrialGate) rather than plan tier.
  return true;
}

export function isTrialExpired(trialEndsAt: string | undefined): boolean {
  if (!trialEndsAt) return false;
  return new Date(trialEndsAt) < new Date();
}

export function daysLeftInTrial(trialEndsAt: string | undefined): number {
  if (!trialEndsAt) return 0;
  const diff = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
