"use client";

import Link from "next/link";
import { ArrowRight, Building2, CalendarClock, ClipboardList, Users, Wallet } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTenants } from "@/lib/store/hooks";
import { employees, getDepartmentsByTenant, leaveRequests } from "@/lib/data";
import { calculateMonthlyPayroll } from "@/lib/payroll-calc";
import { formatCurrencyCompact, formatDateLong } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DashboardHeader } from "./dashboard-header";
import { StatCardGrid, type StatItem } from "./stat-card-grid";

export function ExcoDashboard() {
  const tenants = useTenants();

  const activeEmployees = employees.filter((e) => e.status !== "terminated");
  const onLeaveToday = employees.filter((e) => e.status === "on_leave").length;
  const groupPayroll = activeEmployees.reduce(
    (sum, e) => sum + calculateMonthlyPayroll(e).grossPay,
    0
  );
  const pendingApprovals = leaveRequests.filter((r) => r.status === "pending").length;

  const tenantSummaries = tenants.map((tenant) => {
    const tenantEmployees = employees.filter(
      (e) => e.tenantId === tenant.id && e.status !== "terminated"
    );
    const payroll = tenantEmployees.reduce(
      (sum, e) => sum + calculateMonthlyPayroll(e).grossPay,
      0
    );
    return {
      tenant,
      headcount: tenantEmployees.length,
      departments: getDepartmentsByTenant(tenant.id).length,
      payroll,
    };
  });

  const stats: StatItem[] = [
    {
      label: "Group headcount",
      value: activeEmployees.length.toString(),
      detail: `Across ${tenants.length} companies`,
      icon: Users,
      iconClassName: "bg-info/10 text-info",
    },
    {
      label: "Group payroll",
      value: formatCurrencyCompact(groupPayroll),
      detail: "Gross, per month",
      icon: Wallet,
      iconClassName: "bg-primary/10 text-primary",
    },
    {
      label: "Pending approvals",
      value: pendingApprovals.toString(),
      detail: "Leave requests awaiting decision",
      icon: ClipboardList,
      iconClassName: "bg-warning/10 text-warning",
    },
    {
      label: "On leave today",
      value: onLeaveToday.toString(),
      detail: "Across the group",
      icon: CalendarClock,
      iconClassName: "bg-success/10 text-success",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader subtitle={`Here's how the group is performing today, ${formatDateLong(new Date())}.`} />
      <StatCardGrid stats={stats} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Group overview</CardTitle>
            <CardDescription>Headcount and payroll cost by company</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col">
              {tenantSummaries.map(({ tenant, headcount, departments, payroll }, index) => (
                <Link
                  key={tenant.id}
                  href="/tenants"
                  className={cn(
                    "flex items-center gap-3 py-3 transition-colors hover:bg-muted/40",
                    index !== tenantSummaries.length - 1 && "border-b border-border/60"
                  )}
                >
                  <Avatar size="sm">
                    <AvatarFallback className="text-white" style={{ backgroundColor: tenant.color }}>
                      {tenant.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">{tenant.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {tenant.industry} · {departments} departments
                    </span>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
                    <span className="text-sm font-medium tabular-nums">{headcount} employees</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatCurrencyCompact(payroll)} / mo
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
          <CardFooter className="border-t-0 bg-transparent p-(--card-spacing) pt-0">
            <Button asChild variant="outline" className="w-full">
              <Link href="/tenants">
                View all companies
                <ArrowRight />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Group reporting</CardTitle>
            <CardDescription>Drill into workforce and payroll trends</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Link
              href="/reports"
              className="group flex items-center gap-3 rounded-lg border border-border/70 p-3 transition-colors hover:border-primary/40 hover:bg-primary/[0.03]"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Wallet className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Payroll reports</p>
                <p className="truncate text-xs text-muted-foreground">Cost trends across the group</p>
              </div>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/reports"
              className="group flex items-center gap-3 rounded-lg border border-border/70 p-3 transition-colors hover:border-primary/40 hover:bg-primary/[0.03]"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-info/10 text-info">
                <Users className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Workforce reports</p>
                <p className="truncate text-xs text-muted-foreground">Headcount and demographics</p>
              </div>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/tenants"
              className="group flex items-center gap-3 rounded-lg border border-border/70 p-3 transition-colors hover:border-primary/40 hover:bg-primary/[0.03]"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning">
                <Building2 className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Company profiles</p>
                <p className="truncate text-xs text-muted-foreground">Manage tenants in the group</p>
              </div>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
