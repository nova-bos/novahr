"use client";

import * as React from "react";
import { Check, ChevronDown, ChevronUp, ExternalLink, Loader2, ShieldCheck } from "lucide-react";
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
import { PRICING_TIERS } from "@/lib/marketing/pricing";
import { usePlan } from "@/lib/plan/use-plan";
import { getPlanDisplayName } from "@/lib/config/plans";
import { useEmployees } from "@/lib/store/hooks";
import { useRoleGuard } from "@/lib/auth/use-role-guard";
import { formatDate } from "@/lib/format";
import { createCheckoutSession, createPortalSession } from "@/lib/billing/actions";

const SALES_EMAIL = "sales@novabos.co.za";

export default function BillingPage() {
  const allowed = useRoleGuard(["hr"]);
  const {
    plan,
    isTrial,
    isSubscribed,
    subscriptionStatus,
    currentPeriodEnd,
    trialExpired,
    daysLeft,
    trialEndsAt,
  } = usePlan();

  const employees = useEmployees();
  const activeCount = employees.filter((e) => e.status !== "terminated").length;
  const searchParams = useSearchParams();

  const [loadingTier, setLoadingTier] = React.useState<string | null>(null);
  const [portalLoading, setPortalLoading] = React.useState(false);
  const [showChangePlan, setShowChangePlan] = React.useState(false);

  React.useEffect(() => {
    if (searchParams.get("success") === "1") {
      toast.success("Subscription activated. Welcome to NovaHR!");
    } else if (searchParams.get("error")) {
      const code = searchParams.get("error");
      const messages: Record<string, string> = {
        missing_reference: "Payment reference not found. Please try again.",
        payment_failed: "Payment was not completed. Please try again.",
        missing_tenant: "Could not link payment to your account. Contact support.",
        verification_failed: "Could not verify payment. Contact support if this persists.",
      };
      toast.error(messages[code ?? ""] ?? "Something went wrong with your payment.");
    }
  }, [searchParams]);

  if (!allowed) return null;

  const headerDescription = isSubscribed
    ? `Your subscription is active. Current plan: ${getPlanDisplayName(plan)}.`
    : trialExpired
      ? "Your free trial has ended. Choose a plan to continue."
      : trialEndsAt
        ? `Your free trial ends on ${formatDate(trialEndsAt)} (${daysLeft} ${daysLeft === 1 ? "day" : "days"} left).`
        : "You are on a free trial.";

  async function handleChoosePlan(tierId: string) {
    setLoadingTier(tierId);
    try {
      const result = await createCheckoutSession(tierId as "starter" | "growth" | "scale");
      if ("error" in result) {
        toast.error(result.error);
      } else {
        window.location.href = result.url;
      }
    } finally {
      setLoadingTier(null);
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

  const pricingGrid = (
    <div className="grid gap-4 lg:grid-cols-3">
      {PRICING_TIERS.map((tier) => {
        const fits = tier.maxEmployees === null || activeCount <= tier.maxEmployees;
        const isLoading = loadingTier === tier.id;
        const isCurrent = isSubscribed && plan === tier.id;
        return (
          <Card key={tier.id} className={tier.highlighted ? "border-primary/50" : undefined}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>{tier.name}</CardTitle>
                <div className="flex items-center gap-2">
                  {isCurrent ? <Badge variant="secondary">Current plan</Badge> : null}
                  {tier.highlighted && !isCurrent ? <Badge>Most popular</Badge> : null}
                </div>
              </div>
              <CardDescription>{tier.tagline}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div>
                <span className="text-3xl font-semibold tracking-tight">R{tier.monthlyPrice}</span>
                <span className="text-sm text-muted-foreground"> / month</span>
              </div>
              <ul className="flex flex-col gap-2 text-sm">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              {!fits ? (
                <p className="text-xs text-muted-foreground">
                  You have {activeCount} active employees, above this plan&apos;s limit.
                </p>
              ) : null}
              {isCurrent ? (
                <Button
                  className="mt-auto w-full"
                  variant="outline"
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                >
                  {portalLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  Manage subscription
                </Button>
              ) : (
                <Button
                  className="mt-auto w-full"
                  variant={tier.highlighted ? "default" : "outline"}
                  disabled={!fits || isLoading || loadingTier !== null}
                  onClick={() => handleChoosePlan(tier.id)}
                >
                  {isLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  {isLoading ? "Redirecting..." : isCurrent ? "Current plan" : `Choose ${tier.name}`}
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Billing" description={headerDescription} />

      {subscriptionStatus === "past_due" && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
          <span className="flex items-center gap-2 text-destructive">
            Your last payment failed. Update your billing details to restore full access.
          </span>
          <Button variant="destructive" size="sm" onClick={handleManageSubscription} disabled={portalLoading}>
            {portalLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Update payment
          </Button>
        </div>
      )}

      {isSubscribed ? (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <ShieldCheck className="size-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>{getPlanDisplayName(plan)} plan</CardTitle>
                    <CardDescription>
                      {currentPeriodEnd
                        ? `Renews on ${formatDate(currentPeriodEnd)}`
                        : "Active subscription"}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="default" className="shrink-0">Active</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button variant="outline" onClick={handleManageSubscription} disabled={portalLoading}>
                {portalLoading ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <ExternalLink className="mr-2 size-4" />
                )}
                Manage subscription
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowChangePlan((v) => !v)}
              >
                {showChangePlan ? (
                  <ChevronUp className="mr-2 size-4" />
                ) : (
                  <ChevronDown className="mr-2 size-4" />
                )}
                {showChangePlan ? "Hide plans" : "Change plan"}
              </Button>
            </CardContent>
          </Card>

          {showChangePlan ? pricingGrid : null}
        </>
      ) : (
        pricingGrid
      )}

      <Card>
        <CardHeader>
          <CardTitle>How billing works</CardTitle>
          <CardDescription>
            {isSubscribed
              ? `Your ${getPlanDisplayName(plan)} plan renews monthly in ZAR via Paystack. Use "Manage subscription" to update your card, view invoices, or cancel. Email `
              : "Click a plan above to pay securely via Paystack. You will be redirected to the Paystack hosted checkout and returned here once payment is confirmed. All amounts are in South African Rand (ZAR) and billed monthly. Email "}
            <a href={`mailto:${SALES_EMAIL}`} className="text-primary hover:underline">
              {SALES_EMAIL}
            </a>
            {" "}with any billing questions.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
