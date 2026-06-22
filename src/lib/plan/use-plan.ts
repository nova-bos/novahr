"use client";

import { useApp } from "@/lib/store/app-provider";
import { canAccess, daysLeftInTrial, isTrialExpired } from ".";
import type { PlanFeature } from ".";

export function usePlan() {
  const { state } = useApp();
  const plan = state.currentTenant?.plan ?? "trial";
  const trialEndsAt = state.currentTenant?.trialEndsAt;

  return {
    plan,
    can: (feature: PlanFeature) => canAccess(plan, feature),
    isTrial: plan === "trial",
    isHr: plan === "hr",
    isHrPayroll: plan === "hr_payroll",
    trialExpired: isTrialExpired(trialEndsAt),
    daysLeft: daysLeftInTrial(trialEndsAt),
    trialEndsAt,
  };
}
