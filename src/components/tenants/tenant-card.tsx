"use client";

import { toast } from "sonner";
import { Calendar, Check, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { useApp } from "@/lib/store/app-provider";
import { calculateMonthlyPayroll } from "@/lib/payroll/calculator";
import { formatCurrencyCompact, formatOrdinal } from "@/lib/format";
import type { Tenant } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TenantCard({ tenant }: { tenant: Tenant }) {
  const { state, setTenant } = useApp();
  const isActive = state.tenantId === tenant.id;

  const employees = state.employees.filter((e) => e.tenantId === tenant.id);
  const activeEmployees = employees.filter((e) => e.status !== "terminated");
  const departments = state.departments.filter((d) => d.tenantId === tenant.id);
  const monthlyGross = activeEmployees.reduce(
    (sum, e) => sum + calculateMonthlyPayroll(e).grossPay,
    0
  );

  function handleSwitch() {
    setTenant(tenant.id);
    toast.success(`Switched to ${tenant.name}`, {
      description: "Showing data for this workspace.",
    });
  }

  return (
    <Card className={cn(isActive && "border-primary/50 ring-1 ring-primary/15")}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className="flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: tenant.color }}
            >
              {tenant.initials}
            </span>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold">{tenant.name}</p>
              <p className="text-xs text-muted-foreground">{tenant.industry}</p>
            </div>
          </div>
          {isActive && (
            <Badge
              variant="outline"
              className="border-transparent bg-success/10 font-medium text-success"
            >
              Active
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5">
          <div className="rounded-xl border border-border/70 p-2 sm:p-3 text-center">
            <p className="text-lg font-semibold tabular-nums">{activeEmployees.length}</p>
            <p className="text-xs text-muted-foreground">Employees</p>
          </div>
          <div className="rounded-xl border border-border/70 p-2 sm:p-3 text-center">
            <p className="text-lg font-semibold tabular-nums">{departments.length}</p>
            <p className="text-xs text-muted-foreground">Departments</p>
          </div>
          <div className="rounded-xl border border-border/70 p-2 sm:p-3 text-center">
            <p className="text-lg font-semibold tabular-nums">
              {formatCurrencyCompact(monthlyGross)}
            </p>
            <p className="text-xs text-muted-foreground leading-tight">Monthly payroll</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <MapPin className="size-3.5" />
            {tenant.city}
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="size-3.5" />
            Pays employees on the {formatOrdinal(tenant.payDay)}
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          variant={isActive ? "outline" : "default"}
          className="w-full"
          disabled={isActive}
          onClick={handleSwitch}
        >
          {isActive ? (
            <>
              <Check className="size-4" />
              Current workspace
            </>
          ) : (
            "Switch to workspace"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
