"use client";

import * as React from "react";
import { Loader2, Users, ShieldCheck, Mail } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usePlan } from "@/lib/plan/use-plan";
import { useRoleGuard } from "@/lib/auth/use-role-guard";
import { formatDate } from "@/lib/format";
import { createSubscription, cancelSubscription } from "@/lib/billing/actions";
import { PLATFORM_FEE, MEMBER_FEE } from "@/lib/billing/calculator";

const SALES_EMAIL = "sales@novabos.co.za";

export default function BillingPage() {
  const allowed = useRoleGuard(["hr"]);
  const searchParams = useSearchParams();
  const {
    isTrial,
    isSubscribed,
    isEnterprise,
    subscriptionStatus,
    currentPeriodEnd,
    trialExpired,
    daysLeft,
    trialEndsAt,
    activeMemberCount,
    monthlyAmount,
    enterpriseThreshold,
  } = usePlan();

  const [subscribeLoading, setSubscribeLoading] = React.useState(false);
  const [cancelLoading, setCancelLoading] = React.useState(false);
  const [confirmCancel, setConfirmCancel] = React.useState(false);

  React.useEffect(() => {
    if (searchParams.get("success") === "1") {
      toast.success("Subscription activated. Welcome to NovaHR!");
    }
    const err = searchParams.get("error");
    if (err) {
      const messages: Record<string, string> = {
        missing_reference: "Payment reference missing. Please try again.",
        payment_failed: "Payment was not completed. Please try again.",
        missing_tenant: "Could not identify your account after payment. Contact support.",
        verification_failed: "Payment verification failed. Contact support if you were charged.",
      };
      toast.error(messages[err] ?? `Payment error: ${err}`);
    }
  }, [searchParams]);

  if (!allowed) return null;

  const memberCharge = activeMemberCount * MEMBER_FEE;

  // Treat a canceled subscription whose period has already ended like a trial:
  // show the subscribe button so the user can reactivate.
  const canceledAndExpired =
    subscriptionStatus === "canceled" &&
    currentPeriodEnd != null &&
    new Date(currentPeriodEnd) <= new Date();

  const showSubscribeFlow = isTrial || canceledAndExpired;

  async function handleSubscribe() {
    setSubscribeLoading(true);
    try {
      const result = await createSubscription();
      if ("error" in result) {
        toast.error(result.error);
      } else {
        window.location.href = result.url;
      }
    } finally {
      setSubscribeLoading(false);
    }
  }

  async function handleCancel() {
    setCancelLoading(true);
    try {
      const result = await cancelSubscription();
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Subscription cancelled. You have access until your billing period ends.");
        setConfirmCancel(false);
        window.location.reload();
      }
    } finally {
      setCancelLoading(false);
    }
  }

  const headerDescription = isEnterprise
    ? `Your organisation has ${activeMemberCount} active members. Enterprise pricing applies.`
    : isSubscribed
      ? `Subscription active. ${activeMemberCount} active ${activeMemberCount === 1 ? "member" : "members"}.`
      : trialExpired
        ? "Your free trial has ended. Contact us to activate your subscription."
        : trialEndsAt
          ? `Free trial: ${daysLeft} ${daysLeft === 1 ? "day" : "days"} remaining.`
          : "You are on a free trial.";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Billing" description={headerDescription} />

      {/* Subscription status alert for past_due */}
      {subscriptionStatus === "past_due" && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
          <span className="text-destructive">
            Your last payment failed. Re-authorise your card to restore full access.
          </span>
          <Button variant="destructive" size="sm" onClick={handleSubscribe} disabled={subscribeLoading}>
            {subscribeLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Update payment
          </Button>
        </div>
      )}

      {/* Enterprise state */}
      {isEnterprise ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Enterprise</CardTitle>
                <CardDescription>
                  Your organisation has {activeMemberCount} active members, above the {enterpriseThreshold}-member threshold for standard billing. Contact our sales team for custom pricing.
                </CardDescription>
              </div>
              <Badge variant="secondary">Enterprise</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <a href={`mailto:${SALES_EMAIL}`}>
                <Mail className="mr-2 size-4" />
                Contact Sales
              </a>
            </Button>
          </CardContent>
        </Card>
      ) : isSubscribed && !canceledAndExpired ? (
        /* Subscribed state */
        <>
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <ShieldCheck className="size-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>{subscriptionStatus === "canceled" ? "Subscription cancelled" : "Subscription active"}</CardTitle>
                    <CardDescription>
                      {subscriptionStatus === "canceled"
                        ? currentPeriodEnd
                          ? `Access continues until ${formatDate(currentPeriodEnd)}, then reverts to free trial.`
                          : "Your subscription has been cancelled."
                        : currentPeriodEnd
                          ? `Renews on ${formatDate(currentPeriodEnd)}`
                          : "Active subscription"}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant={subscriptionStatus === "canceled" ? "secondary" : "default"}>
                  {subscriptionStatus === "canceled" ? "Cancelled" : "Active"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">Current billing</p>
                <div className="flex flex-col gap-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Platform fee</span>
                    <span>R{PLATFORM_FEE}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{activeMemberCount} {activeMemberCount === 1 ? "member" : "members"} x R{MEMBER_FEE}</span>
                    <span>R{memberCharge}</span>
                  </div>
                  <div className="mt-2 flex justify-between border-t pt-2 font-semibold">
                    <span>Monthly total</span>
                    <span>R{monthlyAmount.toLocaleString("en-ZA")}</span>
                  </div>
                </div>
                {currentPeriodEnd && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Next invoice on {formatDate(currentPeriodEnd)} will be based on your active member count on that date.
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                To update your payment method, email{" "}
                <a href={`mailto:${SALES_EMAIL}`} className="text-primary hover:underline">{SALES_EMAIL}</a>.
              </p>

              {subscriptionStatus !== "canceled" && (
                <div className="border-t pt-4 mt-2">
                  {confirmCancel ? (
                    <div className="flex flex-col gap-2">
                      <p className="text-sm text-muted-foreground">
                        Are you sure? You will keep access until {currentPeriodEnd ? formatDate(currentPeriodEnd) : "your period ends"}, then your account reverts to the free trial.
                      </p>
                      <div className="flex gap-2">
                        <Button variant="destructive" size="sm" onClick={handleCancel} disabled={cancelLoading}>
                          {cancelLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                          Yes, cancel subscription
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setConfirmCancel(false)} disabled={cancelLoading}>
                          Keep subscription
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmCancel(true)}
                      className="text-sm text-foreground/60 underline underline-offset-2 hover:text-foreground/80 transition-colors"
                    >
                      Cancel subscription
                    </button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        /* Trial / reactivation state */
        <>
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Users className="size-5 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle>
                      {canceledAndExpired ? "Subscription ended" : trialExpired ? "Trial ended" : "Free trial"}
                    </CardTitle>
                    <CardDescription>
                      {canceledAndExpired
                        ? "Your subscription has ended. Resubscribe to restore full access."
                        : trialExpired
                          ? "Your 14-day free trial has ended."
                          : trialEndsAt
                            ? `Your trial ends on ${formatDate(trialEndsAt)}.`
                            : "Explore everything NovaHR has to offer."}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant={canceledAndExpired || trialExpired ? "destructive" : "secondary"}>
                  {canceledAndExpired ? "Ended" : trialExpired ? "Expired" : `${daysLeft} ${daysLeft === 1 ? "day" : "days"} left`}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">Your subscription price</p>
                <div className="flex flex-col gap-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Platform fee</span>
                    <span>R{PLATFORM_FEE}/month</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{activeMemberCount} {activeMemberCount === 1 ? "member" : "members"} x R{MEMBER_FEE}</span>
                    <span>R{memberCharge}/month</span>
                  </div>
                  <div className="mt-2 flex justify-between border-t pt-2 font-semibold">
                    <span>Estimated monthly total</span>
                    <span>R{monthlyAmount.toLocaleString("en-ZA")}/month</span>
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Based on your current {activeMemberCount} active {activeMemberCount === 1 ? "member" : "members"}. Your actual invoice will be calculated from the member count on your billing date.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Button onClick={handleSubscribe} disabled={subscribeLoading} className="w-fit">
                  {subscribeLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  Subscribe now
                </Button>
                <p className="text-xs text-muted-foreground">
                  You will be redirected to Paystack to complete payment securely. Questions? Email{" "}
                  <a href={`mailto:${SALES_EMAIL}`} className="text-primary hover:underline">{SALES_EMAIL}</a>.
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* How billing works */}
      <Card>
        <CardHeader>
          <CardTitle>How billing works</CardTitle>
          <CardDescription>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <p>
                NovaHR charges a flat platform fee of R{PLATFORM_FEE}/month plus R{MEMBER_FEE} per active member. Your invoice is calculated once on your renewal date using a snapshot of your active members at that moment.
              </p>
              <p>
                Members added or removed during the month do not affect your current invoice. The price you see at the start of a billing period is the price you pay for that period.
              </p>
              <p>
                Organisations with {enterpriseThreshold} or more active members are moved to Enterprise pricing. Contact{" "}
                <a href={`mailto:${SALES_EMAIL}`} className="text-primary hover:underline">{SALES_EMAIL}</a>{" "}
                with any billing questions.
              </p>
            </div>
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
