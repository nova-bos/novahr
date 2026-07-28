"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle, Clock, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlan } from "@/lib/plan/use-plan";
import { useAuth } from "@/lib/auth/auth-provider";

const CONTACT_EMAIL = "sales@novabos.co.za";

/**
 * Enforces the 14-day trial and subscription status:
 *
 * - Shows a countdown banner in the final 7 days of a trial.
 * - Shows a full lock screen when the trial has expired and no active subscription exists.
 * - Shows a payment issue banner when a paid subscription is past_due or canceled.
 *
 * The billing page always remains reachable so the customer can resolve issues.
 */
export function TrialGate({ children }: { children: React.ReactNode }) {
  const { isTrial, trialExpired, trialEndsAt, daysLeft, isSubscribed, subscriptionStatus } =
    usePlan();
  const { logout } = useAuth();
  const pathname = usePathname();

  const onBillingPage = pathname === "/billing";

  // Full lock: trial expired with no active subscription.
  if (isTrial && trialExpired && trialEndsAt && !isSubscribed && !onBillingPage) {
    return (
      <div className="flex min-h-[60svh] flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Lock size={20} className="text-primary" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-semibold tracking-tight">Your free trial has ended</h2>
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            Your data is safe. Choose a plan to keep managing your team, payroll and leave with
            NovaHR.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild>
            <Link href="/billing">View plans</Link>
          </Button>
          <Button variant="outline" asChild>
            <a href={`mailto:${CONTACT_EMAIL}?subject=NovaHR%20upgrade`}>Contact sales</a>
          </Button>
          <Button variant="ghost" onClick={() => void logout()}>
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  // Payment issue banner: paid plan but past_due or canceled.
  const hasPaymentIssue =
    !isTrial &&
    (subscriptionStatus === "past_due" || subscriptionStatus === "canceled");

  return (
    <>
      {/* Trial countdown: last 7 days. */}
      {isTrial && !trialExpired && trialEndsAt && daysLeft <= 7 ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-2.5 text-sm">
          <span className="flex items-center gap-2">
            <Clock className="size-4 shrink-0" />
            {daysLeft === 0
              ? "Your trial ends today."
              : `Your trial ends in ${daysLeft} ${daysLeft === 1 ? "day" : "days"}.`}
          </span>
          <Button size="sm" variant="outline" asChild>
            <Link href="/billing">Upgrade</Link>
          </Button>
        </div>
      ) : null}

      {/* Payment issue banner: subscription past_due or canceled. */}
      {hasPaymentIssue && !onBillingPage ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm">
          <span className="flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0 text-destructive" />
            {subscriptionStatus === "past_due"
              ? "Your last payment failed. Please update your billing details to keep your subscription active."
              : "Your subscription has been cancelled. Resubscribe to restore access."}
          </span>
          <Button size="sm" variant="outline" asChild>
            <Link href="/billing">Manage billing</Link>
          </Button>
        </div>
      ) : null}

      {children}
    </>
  );
}
