"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Check, CreditCard, ExternalLink, Loader2 } from "lucide-react";
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

function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return null;
  const variants: Record<
    string,
    {
      label: string;
      variant: "default" | "secondary" | "destructive" | "outline";
    }
  > = {
    active: { label: "Active", variant: "default" },
    trialing: { label: "Trialing", variant: "secondary" },
    past_due: { label: "Payment failed", variant: "destructive" },
    canceled: { label: "Cancelled", variant: "destructive" },
    incomplete: { label: "Incomplete", variant: "outline" },
  };
  const cfg = variants[status];
  if (!cfg) return <Badge variant="outline">{status}</Badge>;
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

export default function BillingPage() {
  const allowed = useRoleGuard(["hr"]);
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    plan,
    isTrial,
    trialExpired,
    daysLeft,
    trialEndsAt,
    isSubscribed,
    subscriptionStatus,
    currentPeriodEnd,
  } = usePlan();

  const employees = useEmployees();
  const activeCount = employees.filter((e) => e.status !== "terminated").length;

  const [loadingTier, setLoadingTier] = React.useState<string | null>(null);
  const [loadingPortal, setLoadingPortal] = React.useState(false);

  // Show success toast when returning from Stripe Checkout.
  React.useEffect(() => {
    if (searchParams.get("success") === "1") {
      toast.success("Subscription activated. Welcome to NovaHR!");
      router.replace("/billing");
    }
  }, [searchParams, router]);

  if (!allowed) return null;

  const trialCopy = !isTrial
    ? "Your subscription is active."
    : trialExpired
      ? "Your free trial has ended. Choose a plan to continue."
      : trialEndsAt
        ? `Your free trial ends on ${formatDate(trialEndsAt)} (${daysLeft} ${daysLeft === 1 ? "day" : "days"} left).`
        : "You are on a free trial.";

  const handleSubscribe = async (tierId: "starter" | "growth" | "scale") => {
    setLoadingTier(tierId);
    try {
      const result = await createCheckoutSession(tierId);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        window.location.href = result.url;
      }
    } finally {
      setLoadingTier(null);
    }
  };

  const handleManage = async () => {
    setLoadingPortal(true);
    try {
      const result = await createPortalSession();
      if ("error" in result) {
        toast.error(result.error);
      } else {
        window.location.href = result.url;
      }
    } finally {
      setLoadingPortal(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Billing"
        description={`${trialCopy} Current plan: ${getPlanDisplayName(plan)}.`}
      />

      {/* Active subscription summary */}
      {isSubscribed && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CreditCard className="size-5 text-muted-foreground" />
                <div>
                  <CardTitle className="text-base">
                    {getPlanDisplayName(plan)} plan
                  </CardTitle>
                  {currentPeriodEnd ? (
                    <CardDescription>
                      Renews on {formatDate(currentPeriodEnd)}
                    </CardDescription>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={subscriptionStatus} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleManage()}
                  disabled={loadingPortal}
                >
                  {loadingPortal ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <ExternalLink className="mr-2 size-4" />
                  )}
                  Manage subscription
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Payment failed alert */}
      {subscriptionStatus === "past_due" && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
          <span className="flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0 text-destructive" />
            Your last payment failed. Please update your billing details to restore full access.
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => void handleManage()}
            disabled={loadingPortal}
          >
            {loadingPortal ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Update payment
          </Button>
        </div>
      )}

      {/* Pricing cards */}
      <div className="grid gap-4 lg:grid-cols-3">
        {PRICING_TIERS.map((tier) => {
          const fits = tier.maxEmployees === null || activeCount <= tier.maxEmployees;
          const isCurrentPlan = plan === tier.id && isSubscribed;
          const isLoading = loadingTier === tier.id;

          return (
            <Card
              key={tier.id}
              className={tier.highlighted ? "border-primary/50" : undefined}
            >
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>{tier.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    {isCurrentPlan ? (
                      <Badge variant="secondary">Current plan</Badge>
                    ) : null}
                    {tier.highlighted && !isCurrentPlan ? (
                      <Badge>Most popular</Badge>
                    ) : null}
                  </div>
                </div>
                <CardDescription>{tier.tagline}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div>
                  <span className="text-3xl font-semibold tracking-tight">
                    R{tier.monthlyPrice}
                  </span>
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

                {isCurrentPlan ? (
                  <Button
                    className="mt-auto w-full"
                    variant="outline"
                    onClick={() => void handleManage()}
                    disabled={loadingPortal}
                  >
                    {loadingPortal ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : null}
                    Manage subscription
                  </Button>
                ) : (
                  <Button
                    className="mt-auto w-full"
                    variant={tier.highlighted ? "default" : "outline"}
                    onClick={() => void handleSubscribe(tier.id)}
                    disabled={isLoading || loadingPortal || !fits}
                  >
                    {isLoading ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : null}
                    {isLoading ? "Redirecting..." : `Choose ${tier.name}`}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How billing works</CardTitle>
          <CardDescription>
            Subscriptions are billed monthly in ZAR via Stripe. Your card is charged automatically
            on the renewal date. Email{" "}
            <a href={`mailto:${SALES_EMAIL}`} className="text-primary hover:underline">
              {SALES_EMAIL}
            </a>{" "}
            with any billing questions.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
