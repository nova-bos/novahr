"use client";

import { Briefcase, UserCheck, UserPlus, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useDepartments } from "@/lib/store/hooks";
import { useScopedEmployees } from "@/lib/auth/scope";
import { cn } from "@/lib/utils";

export function EmployeeStats() {
  const employees = useScopedEmployees();
  const departments = useDepartments();

  const active = employees.filter((e) => e.status === "active").length;
  const onboarding = employees.filter((e) => e.status === "probation").length;
  const total = employees.filter((e) => e.status !== "terminated").length;

  const stats = [
    { label: "Total employees", value: total, icon: Users, className: "bg-info/10 text-info" },
    { label: "Active", value: active, icon: UserCheck, className: "bg-success/10 text-success" },
    { label: "Onboarding", value: onboarding, icon: UserPlus, className: "bg-warning/10 text-warning" },
    { label: "Departments", value: departments.length, icon: Briefcase, className: "bg-primary/10 text-primary" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="flex items-center gap-3">
            <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", stat.className)}>
              <stat.icon className="size-4" />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-xl font-semibold tracking-tight tabular-nums">{stat.value}</span>
              <span className="truncate text-xs text-muted-foreground">{stat.label}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
