import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="py-24 text-center lg:py-32">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6">
        <Badge variant="secondary" className="text-xs px-3 py-1 h-auto">
          South African HR &amp; Payroll Platform
        </Badge>

        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Modern HR &amp; payroll for growing South African businesses.
        </h1>

        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          NovaHR handles employee management, leave tracking, and payroll so
          your HR team can focus on your people &mdash; not spreadsheets.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" asChild>
            <Link href="/signup">Get started free</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
            SA payroll compliant
          </span>
          <span aria-hidden="true" className="hidden sm:inline">·</span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
            POPIA ready
          </span>
          <span aria-hidden="true" className="hidden sm:inline">·</span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
            Free to start
          </span>
        </div>

        <div className="w-full rounded-2xl border bg-card shadow-xl p-4 max-w-3xl mx-auto mt-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border bg-background p-3 text-left">
              <p className="text-xs text-muted-foreground">Employees</p>
              <p className="mt-1 text-2xl font-bold">40</p>
            </div>
            <div className="rounded-xl border bg-background p-3 text-left">
              <p className="text-xs text-muted-foreground">Monthly payroll</p>
              <p className="mt-1 text-2xl font-bold">R 2.4M</p>
            </div>
            <div className="rounded-xl border bg-background p-3 text-left">
              <p className="text-xs text-muted-foreground">Pending leave</p>
              <p className="mt-1 text-2xl font-bold">3</p>
            </div>
            <div className="rounded-xl border bg-background p-3 text-left">
              <p className="text-xs text-muted-foreground">Active runs</p>
              <p className="mt-1 text-2xl font-bold">2</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
