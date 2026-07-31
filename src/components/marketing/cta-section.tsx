import Link from "next/link";
import { Button } from "@/components/ui/button";
import { appLink } from "@/lib/marketing/app-link";

export function CtaSection() {
  return (
    <section className="container mx-auto max-w-6xl px-4 py-16 sm:py-20 lg:py-24">
      <div className="relative isolate overflow-hidden rounded-2xl border bg-primary/[0.06] px-6 py-14 text-center sm:px-12">
        <div
          className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 to-transparent"
          aria-hidden="true"
        />
        <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-balance sm:text-4xl">
          Ready to simplify HR and payroll?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground text-balance">
          Set your company up in minutes and run your first pay run today. No credit
          card required for the 14-day trial.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" asChild>
            <Link href={appLink("/signup")}>Get started free</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/#contact">Talk to us</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
