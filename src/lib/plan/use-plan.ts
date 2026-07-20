"use client";

import * as React from "react";
import { useApp } from "@/lib/store/app-provider";
import { canAccess, daysLeftInTrial, isTrialExpired } from ".";
import type { PlanFeature } from ".";

export function usePlan() {
  const { state } = useApp();
  const plan = state.currentTenant?.plan ?? "trial";
  const trialEndsAt = state.currentTenant?.trialEndsAt;

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
      isHr: plan === "hr",
      isHrPayroll: plan === "hr_payroll",
      trialExpired: isTrialExpired(trialEndsAt),
      daysLeft: daysLeftInTrial(trialEndsAt),
      trialEndsAt,
    }),
    [plan, trialEndsAt, can],
  );
}
