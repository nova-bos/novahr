"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlan } from "@/lib/plan/use-plan";
import { useAuth } from "@/lib/auth/auth-provider";

const CONTACT_EMAIL = "sales@novabos.co.za";

/**
 * Enforces the 14-day trial: shows a countdown banner in the final week and
 * a full lock screen once the trial has expired. The billing page stays
 * reachable so the customer can see their subscription info.
 */
export function TrialGate({ children }: { children: React.ReactNode }) {
  const { isTrial, trialExpired, daysLeft, trialEndsAt, subscriptionLocked, subscriptionStatus } = usePlan();
  const { logout } = useAuth();
  const pathname = usePathname();

  const trialWall = isTrial && trialExpired && trialEndsAt && pathname !== "/billing";
  const subscriptionWall = subscriptionLocked && pathname !== "/billing";

  if (trialWall) {
    return (
      <div className="flex min-h-[60svh] flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Lock size={20} className="text-primary" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-semibold tracking-tight">Your free trial has ended</h2>
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            Your data is safe. Contact sales@novabos.co.za to activate your subscription and keep managing your team, payroll and leave with NovaHR.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild>
            <Link href="/billing">View billing</Link>
          </Button>
          <Button variant="outline" asChild>
            <a href={`mailto:${CONTACT_EMAIL}?subject=NovaHR%20subscription%20activation`}>Contact sales</a>
          </Button>
          <Button variant="ghost" onClick={() => void logout()}>
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  if (subscriptionWall) {
    const isOverdue = subscriptionStatus === "past_due";
    return (
      <div className="flex min-h-[60svh] flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <Lock size={20} className="text-destructive" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-semibold tracking-tight">
            {isOverdue ? "Payment overdue" : "Subscription ended"}
          </h2>
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            {isOverdue
              ? "Your last payment failed. Update your payment method to restore access."
              : "Your subscription has ended. Your data is safe. Resubscribe to continue."}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild>
            <Link href="/billing">{isOverdue ? "Update payment" : "Resubscribe"}</Link>
          </Button>
          <Button variant="ghost" onClick={() => void logout()}>
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {isTrial && !trialExpired && trialEndsAt && daysLeft <= 7 ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-2.5 text-sm">
          <span className="flex items-center gap-2">
            <Clock className="size-4 shrink-0" />
            {daysLeft === 0
              ? "Your trial ends today."
              : `Your trial ends in ${daysLeft} ${daysLeft === 1 ? "day" : "days"}.`}
          </span>
          <Button size="sm" variant="outline" asChild>
            <Link href="/billing">View billing</Link>
          </Button>
        </div>
      ) : null}
      {children}
    </>
  );
}
