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

  const isSubscribed = plan === "subscribed" || plan === "enterprise";

  // True when the subscription is locked and the user should see a paywall.
  // Mirrors the server-side requireActiveSubscription grace logic.
  const subscriptionLocked = React.useMemo(() => {
    if (!isSubscribed || plan === "enterprise") return false;
    if (subscriptionStatus === "expired") return true;
    if (subscriptionStatus === "past_due") {
      const GRACE_MS = 3 * 24 * 60 * 60 * 1000;
      if (!currentPeriodEnd) return false;
      return Date.now() - new Date(currentPeriodEnd).getTime() > GRACE_MS;
    }
    if (subscriptionStatus === "canceled") {
      if (!currentPeriodEnd) return true;
      return new Date(currentPeriodEnd) <= new Date();
    }
    return false;
  }, [isSubscribed, plan, subscriptionStatus, currentPeriodEnd]);

  return React.useMemo(
    () => ({
      plan,
      can,
      isTrial: plan === "trial",
      isSubscribed,
      isEnterprise,
      subscriptionStatus,
      subscriptionLocked,
      currentPeriodEnd,
      trialExpired: isTrialExpired(trialEndsAt),
      daysLeft: daysLeftInTrial(trialEndsAt),
      trialEndsAt,
      activeMemberCount,
      monthlyAmount,
      enterpriseThreshold: ENTERPRISE_THRESHOLD,
    }),
    [plan, trialEndsAt, subscriptionStatus, subscriptionLocked, currentPeriodEnd, activeMemberCount, monthlyAmount, isEnterprise, isSubscribed, can],
  );
}
