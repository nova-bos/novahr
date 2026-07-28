"use client";

import * as React from "react";
import { useApp } from "@/lib/store/app-provider";
import { canAccess, daysLeftInTrial, isTrialExpired } from ".";
import type { PlanFeature } from ".";
import { calculateMonthlyAmount, isEnterpriseTier, ENTERPRISE_THRESHOLD } from "@/lib/billing/calculator";
import { useEmployees } from "@/lib/store/hooks";

export function usePlan() {
  const { state } = useApp();
  const employees = useEmployees();

  const plan = state.currentTenant?.plan ?? "trial";
  const trialEndsAt = state.currentTenant?.trialEndsAt;
  const subscriptionStatus = state.currentTenant?.subscriptionStatus ?? null;
  const currentPeriodEnd = state.currentTenant?.currentPeriodEnd ?? null;

  const activeMemberCount = employees.filter((e) => e.status !== "terminated").length;
  const monthlyAmount = calculateMonthlyAmount(activeMemberCount);
  const isEnterprise = isEnterpriseTier(activeMemberCount);

  // `can` and the returned object must keep stable identities across renders.
  // Several components put `can` in a useEffect dependency array; an unstable
  // reference makes those effects (which call server actions) fire on every
  // render, which turns into an infinite request loop.
  const can = React.useCallback(
    (feature: PlanFeature) => canAccess(plan, feature),
    [plan],
  );

  return React.useMemo(
    () => ({
      plan,
      can,
      isTrial: plan === "trial",
      isSubscribed: plan === "subscribed" || plan === "enterprise",
      isEnterprise,
      subscriptionStatus,
      currentPeriodEnd,
      trialExpired: isTrialExpired(trialEndsAt),
      daysLeft: daysLeftInTrial(trialEndsAt),
      trialEndsAt,
      activeMemberCount,
      monthlyAmount,
      enterpriseThreshold: ENTERPRISE_THRESHOLD,
    }),
    [plan, trialEndsAt, subscriptionStatus, currentPeriodEnd, activeMemberCount, monthlyAmount, isEnterprise, can],
  );
}
