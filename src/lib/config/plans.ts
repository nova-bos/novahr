import type { TenantPlan } from "@/lib/types";

export const PLAN_DISPLAY: Record<TenantPlan, string> = {
  trial: "Free Trial",
  starter: "Starter",
  growth: "Growth",
  scale: "Scale",
};

export function getPlanDisplayName(plan: TenantPlan | undefined): string {
  if (!plan) return "Unknown";
  return PLAN_DISPLAY[plan] ?? plan;
}
