"use client";

import * as React from "react";
import { useApp } from "@/lib/store/app-provider";
import { canAccess, daysLeftInTrial, isTrialExpired } from ".";
import type { PlanFeature } from ".";

export function usePlan() {
  const { state } = useApp();
  const plan = state.currentTenant?.plan ?? "trial";
  const trialEndsAt = state.currentTenant?.trialEndsAt;
  const subscriptionStatus = state.currentTenant?.subscriptionStatus ?? null;
  const currentPeriodEnd = state.currentTenant?.currentPeriodEnd ?? null;

  // A subscription is active when Stripe reports it as active or trialing.
  const isSubscribed =
    subscriptionStatus === "active" || subscriptionStatus === "trialing";

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
      isSubscribed,
      subscriptionStatus,
      currentPeriodEnd,
      trialExpired: isTrialExpired(trialEndsAt),
      daysLeft: daysLeftInTrial(trialEndsAt),
      trialEndsAt,
    }),
    [plan, can, isSubscribed, subscriptionStatus, currentPeriodEnd, trialEndsAt],
  );
}
