import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const MOCK_ACTIVITY = [
  { color: "bg-success", text: "Lerato approved 5 days annual leave" },
  { color: "bg-info", text: "Thabo joined as Engineering Manager" },
  { color: "bg-primary", text: "Payroll processed for June 2026" },
];

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

        {/* Mock dashboard preview */}
        <div
          className="w-full rounded-2xl border bg-card shadow-xl overflow-hidden max-w-3xl mx-auto mt-4 pointer-events-none select-none"
          aria-hidden="true"
        >
          {/* Titlebar */}
          <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-md bg-primary text-[10px] font-bold text-primary-foreground">
                NT
              </span>
              <span className="text-xs font-medium text-foreground">NovaTech Solutions</span>
            </div>
            <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-medium text-success">
              Live
            </span>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
            <div className="rounded-xl border bg-background p-3 text-left">
              <p className="text-xs text-muted-foreground">Employees</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">14</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">2 on leave today</p>
            </div>
            <div className="rounded-xl border bg-background p-3 text-left">
              <p className="text-xs text-muted-foreground">On leave</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">2</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">Awaiting review: 1</p>
            </div>
            <div className="rounded-xl border bg-background p-3 text-left">
              <p className="text-xs text-muted-foreground">Monthly payroll</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">R 2.4M</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">Gross, current roster</p>
            </div>
            <div className="rounded-xl border bg-background p-3 text-left">
              <p className="text-xs text-muted-foreground">Next pay date</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">Jul 25</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">14 employees</p>
            </div>
          </div>

          {/* Recent activity */}
          <div className="border-t px-4 pb-4 pt-3">
            <p className="mb-2.5 text-xs font-semibold text-foreground">Recent Activity</p>
            <ul className="flex flex-col gap-2">
              {MOCK_ACTIVITY.map((item) => (
                <li key={item.text} className="flex items-center gap-2.5">
                  <span className={`size-1.5 shrink-0 rounded-full ${item.color}`} />
                  <span className="text-xs text-muted-foreground">{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
