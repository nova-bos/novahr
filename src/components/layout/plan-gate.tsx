"use client";

import { Lock } from "lucide-react";
import { usePlan } from "@/lib/plan/use-plan";
import type { PlanFeature } from "@/lib/plan";
import { PLAN_DISPLAY } from "@/lib/config/plans";

interface PlanGateProps {
  feature: PlanFeature;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

function DefaultUpgradePrompt() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 py-16 text-center px-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
        <Lock size={20} className="text-primary" />
      </div>
      <h3 className="text-base font-semibold text-foreground">Plan upgrade required</h3>
      <p className="mt-1.5 text-sm text-muted-foreground max-w-xs">
        This feature is included in the {PLAN_DISPLAY.hr_payroll} plan. Upgrade to unlock payroll runs, compliance tracking, and more.
      </p>
    </div>
  );
}

export function PlanGate({ feature, children, fallback }: PlanGateProps) {
  const { can } = usePlan();
  if (!can(feature)) return <>{fallback ?? <DefaultUpgradePrompt />}</>;
  return <>{children}</>;
}
