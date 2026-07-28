import type { TenantPlan } from "@/lib/types";

// Features gated behind the hr_payroll plan.
// During "trial" all features are unlocked.
// On "hr" plan only HR features are available.
// On "hr_payroll" plan everything is available.

const PAYROLL_FEATURES = [
  "payrollRuns",       // Create and process payroll runs
  "compliance",        // PAYE/UIF/SDL return tracking
  "bankExports",       // EFT CSV generation
  "deductionTypes",    // Configurable earning and deduction types
  "payrollSettings",   // SDL/UIF rate configuration
  "payrollReports",    // YTD analytics and payroll reports
  "payrollProfiles",   // Per-employee tax and medical aid profiles
] as const;

export type PlanFeature = (typeof PAYROLL_FEATURES)[number];

export function canAccess(plan: TenantPlan | undefined, feature: PlanFeature): boolean {
  if (!plan) return false;
  if (plan === "trial") return true;
  if (plan === "hr_payroll") return true;
  // Paystack subscription plans have full access
  if (plan === "starter" || plan === "growth" || plan === "scale") return true;
  // "hr" plan: everything except payroll features
  return !(PAYROLL_FEATURES as readonly string[]).includes(feature);
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
