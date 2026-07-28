import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PRICING_TIERS } from "@/lib/marketing/pricing";
import { cn } from "@/lib/utils";

export function PricingSection() {
  return (
    <section id="pricing" className="scroll-mt-20">
      <div className="text-center">
        <h2 className="text-3xl font-bold">Simple, transparent pricing</h2>
        <p className="mt-3 text-muted-foreground">
          No setup fees. No per-payslip charges. Cancel any time.
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-3">
        {PRICING_TIERS.map((tier) => (
          <div
            key={tier.id}
            className={cn(
              "flex flex-col rounded-xl border bg-card p-6",
              tier.highlighted && "ring-2 ring-primary"
            )}
          >
            {tier.highlighted && (
              <Badge variant="default" className="mb-3 w-fit">
                Most popular
              </Badge>
            )}

            <h3 className="text-xl font-bold">{tier.name}</h3>

            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-4xl font-bold">
                R{tier.monthlyPrice}
              </span>
              <span className="text-sm text-muted-foreground">/month</span>
            </div>

            <p className="mt-1 text-sm text-muted-foreground">{tier.tagline}</p>

            <Separator className="my-4" />

            <ul className="flex flex-1 flex-col gap-2">
              {tier.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm">
                  <CheckCircle2
                    className="mt-0.5 size-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              className="mt-6 w-full"
              variant={tier.highlighted ? "default" : "outline"}
              asChild
            >
              <Link href="/signup">Get started</Link>
            </Button>
          </div>
        ))}
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        All plans include a 14-day free trial. No credit card required.
      </p>
    </section>
  );
}
