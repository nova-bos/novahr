"use client";

import { Check } from "lucide-react";
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
import { useEmployees } from "@/lib/store/hooks";
import { useRoleGuard } from "@/lib/auth/use-role-guard";
import { formatDate } from "@/lib/format";

const CONTACT_EMAIL = "mtshwenewesley@gmail.com";

export default function BillingPage() {
  const allowed = useRoleGuard(["hr"]);
  const { isTrial, trialExpired, daysLeft, trialEndsAt } = usePlan();
  const employees = useEmployees();
  const activeCount = employees.filter((e) => e.status !== "terminated").length;

  if (!allowed) return null;

  const trialCopy = !isTrial
    ? "Your subscription is active."
    : trialExpired
      ? "Your free trial has ended. Choose a plan to continue."
      : trialEndsAt
        ? `Your free trial ends on ${formatDate(trialEndsAt)} (${daysLeft} ${daysLeft === 1 ? "day" : "days"} left).`
        : "You are on a free trial.";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Billing" description={trialCopy} />

      <div className="grid gap-4 lg:grid-cols-3">
        {PRICING_TIERS.map((tier) => {
          const fits = tier.maxEmployees === null || activeCount <= tier.maxEmployees;
          return (
            <Card key={tier.id} className={tier.highlighted ? "border-primary/50" : undefined}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>{tier.name}</CardTitle>
                  {tier.highlighted ? <Badge>Most popular</Badge> : null}
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
                <Button
                  className="mt-auto w-full"
                  variant={tier.highlighted ? "default" : "outline"}
                  asChild
                >
                  <a
                    href={`mailto:${CONTACT_EMAIL}?subject=NovaHR%20${tier.name}%20plan&body=Hi,%20we%27d%20like%20to%20subscribe%20to%20the%20${tier.name}%20plan.`}
                  >
                    Choose {tier.name}
                  </a>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How billing works</CardTitle>
          <CardDescription>
            Subscriptions are activated within one business day. We&apos;ll send an invoice with
            EFT details; card payments and debit orders are coming soon. Email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
              {CONTACT_EMAIL}
            </a>{" "}
            with any billing questions.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
