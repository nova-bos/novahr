import type { TenantPlan } from "@/lib/types";

export const PLAN_DISPLAY: Record<TenantPlan, string> = {
  trial: "Free Trial",
  subscribed: "NovaHR",
  enterprise: "Enterprise",
};

export function getPlanDisplayName(plan: TenantPlan | undefined): string {
  if (!plan) return "Unknown";
  return PLAN_DISPLAY[plan] ?? plan;
}
