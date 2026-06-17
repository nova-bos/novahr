import { ArrowRight, CalendarRange, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STEPS = [
  {
    icon: Users,
    title: "Add your first employee",
    description: "Start building your team. Add their personal details, role, and compensation.",
    href: "/employees/new",
    cta: "Add employee",
  },
  {
    icon: CalendarRange,
    title: "Review leave policies",
    description: "Check the default leave entitlements — annual, sick, and family responsibility leave.",
    href: "/settings?tab=leave",
    cta: "View policies",
  },
  {
    icon: Wallet,
    title: "Run your first payroll",
    description: "Once you've added employees, run payroll to generate payslips automatically.",
    href: "/payroll",
    cta: "Go to payroll",
  },
];

export function GettingStartedCard() {
  return (
    <Card className="border-dashed bg-muted/20">
      <CardHeader>
        <CardTitle className="text-lg">Welcome to NovaHR 👋</CardTitle>
        <p className="text-sm text-muted-foreground">
          Your workspace is ready. Follow these steps to get your company set up.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step) => (
            <div
              key={step.title}
              className="flex flex-col gap-3 rounded-xl border bg-background p-4"
            >
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                <step.icon className="size-4 text-primary" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">{step.title}</p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
              <Button asChild size="sm" variant="outline" className="w-full justify-between">
                <Link href={step.href}>
                  {step.cta}
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
