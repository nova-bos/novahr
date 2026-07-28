import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const TRUST_POINTS = [
  "SARS-aligned PAYE, UIF & SDL",
  "POPIA ready",
  "Free 14-day trial",
];

// A faint grid, masked to fade out at the edges, gives the hero quiet structure
// without a photo. It uses the theme border colour, so it adapts to light/dark.
const GRID_MASK = "radial-gradient(ellipse 60% 60% at 50% 40%, #000 25%, transparent 78%)";

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      {/* Background: brand wash + structural grid (no imagery) */}
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.07] via-primary/[0.02] to-transparent" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
            backgroundSize: "34px 34px",
            maskImage: GRID_MASK,
            WebkitMaskImage: GRID_MASK,
            opacity: 0.5,
          }}
        />
      </div>

      <div className="container mx-auto max-w-6xl px-4">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 py-20 text-center lg:py-28">
          <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            HR and payroll that runs itself, built for South African teams.
          </h1>

          <p className="mx-auto max-w-2xl text-lg text-muted-foreground text-balance">
            NovaHR brings employees, leave, payroll, and SARS compliance into one
            place. Run payroll in minutes, pay salaries straight to the bank, and
            keep your records audit-ready, without the spreadsheets.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/signup">Get started free</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/#how-it-works">See how it works</Link>
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {TRUST_POINTS.map((point) => (
              <span key={point} className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
                {point}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
