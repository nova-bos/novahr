import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const TRUST_POINTS = [
  "SA payroll compliant",
  "POPIA ready",
  "Free 14-day trial",
];

// A faint grid, masked to fade out at the edges, gives the hero quiet structure
// without a photo. It uses the theme border colour, so it adapts to light/dark.
const GRID_MASK = "radial-gradient(ellipse 60% 60% at 50% 42%, #000 25%, transparent 78%)";

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      {/* Background: brand wash + structural grid (no imagery) */}
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        {/* Soft brand gradient, strongest at the top behind the headline */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.07] via-primary/[0.02] to-transparent" />
        {/* Structural grid, faded toward the edges */}
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
          <Badge variant="secondary" className="h-auto px-3 py-1 text-xs">
            South African HR &amp; Payroll Platform
          </Badge>

          <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Modern HR &amp; payroll for growing South African businesses.
          </h1>

          <p className="mx-auto max-w-xl text-lg text-muted-foreground text-balance">
            NovaHR handles employee management, leave tracking, and payroll so
            your HR team can focus on your people, not spreadsheets.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/signup">Get started free</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            {TRUST_POINTS.map((point, i) => (
              <span key={point} className="flex items-center gap-x-4">
                {i > 0 && (
                  <span aria-hidden="true" className="hidden text-border sm:inline">
                    &middot;
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
                  {point}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
