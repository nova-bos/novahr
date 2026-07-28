import type { TenantPlan } from "@/lib/types";

export type PlanFeature =
  | "payrollRuns"
  | "compliance"
  | "bankExports"
  | "deductionTypes"
  | "payrollSettings"
  | "payrollReports"
  | "payrollProfiles";

export function canAccess(plan: TenantPlan | undefined, _feature: PlanFeature): boolean {
  if (!plan || plan === "trial") return true;
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
