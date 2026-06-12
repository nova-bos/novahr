"use client";

import Link from "next/link";
import { CalendarRange, FileBarChart, UserPlus, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const actions = [
  {
    title: "Add employee",
    description: "Start onboarding a new hire",
    href: "/employees/new",
    icon: UserPlus,
  },
  {
    title: "Run payroll",
    description: "Process the next pay run",
    href: "/payroll",
    icon: Wallet,
  },
  {
    title: "Review leave",
    description: "Approve or decline requests",
    href: "/leave",
    icon: CalendarRange,
  },
  {
    title: "View reports",
    description: "Payroll and workforce insights",
    href: "/reports",
    icon: FileBarChart,
  },
];

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group flex flex-col gap-2.5 rounded-xl border border-border/70 p-4 transition-colors hover:border-primary/40 hover:bg-primary/[0.03]"
            >
              <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                <action.icon className="size-4" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{action.title}</p>
                <p className="text-xs text-muted-foreground">{action.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
