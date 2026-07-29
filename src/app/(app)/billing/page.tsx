"use client";

import * as React from "react";
import { ExternalLink, Loader2, Users, ShieldCheck, Mail } from "lucide-react";
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
import { createPortalSession, createSubscription } from "@/lib/billing/actions";
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

  const [portalLoading, setPortalLoading] = React.useState(false);
  const [subscribeLoading, setSubscribeLoading] = React.useState(false);

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

  async function handleManageSubscription() {
    setPortalLoading(true);
    try {
      const result = await createPortalSession();
      if ("error" in result) {
        toast.error(result.error);
      } else {
        window.open(result.url, "_blank", "noopener,noreferrer");
      }
    } finally {
      setPortalLoading(false);
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
            Your last payment failed. Update your billing details to restore full access.
          </span>
          <Button variant="destructive" size="sm" onClick={handleManageSubscription} disabled={portalLoading}>
            {portalLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
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
      ) : isSubscribed ? (
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
                    <CardTitle>Subscription active</CardTitle>
                    <CardDescription>
                      {currentPeriodEnd ? `Renews on ${formatDate(currentPeriodEnd)}` : "Active subscription"}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="default">Active</Badge>
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
              <Button variant="outline" onClick={handleManageSubscription} disabled={portalLoading} className="w-fit">
                {portalLoading ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <ExternalLink className="mr-2 size-4" />
                )}
                Manage subscription
              </Button>
              <p className="text-xs text-muted-foreground">
                To update your payment method or cancel, email{" "}
                <a href={`mailto:${SALES_EMAIL}`} className="text-primary hover:underline">{SALES_EMAIL}</a>.
              </p>
            </CardContent>
          </Card>
        </>
      ) : (
        /* Trial state */
        <>
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Users className="size-5 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle>{trialExpired ? "Trial ended" : "Free trial"}</CardTitle>
                    <CardDescription>
                      {trialExpired
                        ? "Your 14-day free trial has ended."
                        : trialEndsAt
                          ? `Your trial ends on ${formatDate(trialEndsAt)}.`
                          : "Explore everything NovaHR has to offer."}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant={trialExpired ? "destructive" : "secondary"}>
                  {trialExpired ? "Expired" : `${daysLeft} ${daysLeft === 1 ? "day" : "days"} left`}
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
