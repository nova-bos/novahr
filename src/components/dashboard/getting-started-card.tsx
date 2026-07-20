"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Circle, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  useCurrentTenant,
  useDepartments,
  useEmployees,
  usePayrollRuns,
  useTenantId,
} from "@/lib/store/hooks";
import { getPayrollSettingsAction } from "@/lib/settings/actions";

// Module-level caches survive SPA navigation (component unmounts/remounts).
// _payrollCache: tenantId -> whether payrollConfiguredAt is set.
// _dismissedSet: tenantIds that have been dismissed this session.
const _payrollCache = new Map<string, boolean>();
const _dismissedSet = new Set<string>();

export function GettingStartedCard() {
  const tenant = useCurrentTenant();
  const tenantId = useTenantId();
  const employees = useEmployees();
  const departments = useDepartments();
  const payrollRuns = usePayrollRuns();

  // Default to hidden (true) so SSR and first client render agree.
  // The effect corrects this after hydration using localStorage.
  const [dismissed, setDismissed] = React.useState(true);

  React.useEffect(() => {
    if (_dismissedSet.has(tenantId)) return;
    const stored = localStorage.getItem(`novahr:gs-dismissed:${tenantId}`) === "1";
    if (stored) {
      _dismissedSet.add(tenantId);
      return;
    }
    setDismissed(false);
  }, [tenantId]);

  function dismiss() {
    _dismissedSet.add(tenantId);
    setDismissed(true);
    localStorage.setItem(`novahr:gs-dismissed:${tenantId}`, "1");
  }

  // Start from cache so returning users never see a null/unchecked flash.
  // Only fetch when the cache is empty or shows false (might have changed).
  const [payrollConfigured, setPayrollConfigured] = React.useState<boolean | null>(
    () => (_payrollCache.has(tenantId) ? (_payrollCache.get(tenantId) ?? null) : null)
  );
  React.useEffect(() => {
    if (_payrollCache.get(tenantId) === true) return;
    let active = true;
    getPayrollSettingsAction(tenantId)
      .then((s) => {
        if (!active) return;
        const val = Boolean(s.payrollConfiguredAt);
        _payrollCache.set(tenantId, val);
        setPayrollConfigured(val);
      })
      .catch(() => {
        if (!active) return;
        _payrollCache.set(tenantId, false);
        setPayrollConfigured(false);
      });
    return () => {
      active = false;
    };
  }, [tenantId]);

  const hasCompletedPayroll = payrollRuns.some((r) => r.status === "completed");

  if (dismissed) return null;
  if (payrollConfigured === null) return null;

  const steps = [
    {
      id: "company-profile",
      label: "Company profile",
      description: "Set your legal name, registration number, and company details.",
      // legalName is copied from the company name at sign-up, so it is a poor
      // signal. The registration number is blank until the user fills it in.
      complete: Boolean(tenant.registrationNumber?.trim()),
      href: "/settings",
      linkLabel: "Go",
    },
    {
      id: "add-departments",
      label: "Add departments",
      description: "Set up your organisation structure before adding employees.",
      complete: departments.length > 0,
      href: "/settings?tab=departments",
      linkLabel: "Go",
    },
    {
      id: "payroll-settings",
      label: "Configure payroll settings",
      description: "Review SDL, UIF rates, and pay cycle before running payroll.",
      complete: payrollConfigured === true,
      href: "/settings?tab=payroll",
      linkLabel: "Go",
    },
    {
      id: "add-employee",
      label: "Add first employee",
      description: "Add personal details, job info, and salary for your first team member.",
      complete: employees.length > 0,
      href: "/employees/new",
      linkLabel: "Go",
    },
    {
      id: "run-payroll",
      label: "Run first payroll",
      description: "Process your first payroll run to generate payslips automatically.",
      complete: hasCompletedPayroll,
      href: "/payroll",
      linkLabel: "Go",
    },
  ] as const;

  const completedCount = steps.filter((s) => s.complete).length;
  const allComplete = completedCount === steps.length;

  if (allComplete) {
    return null;
  }

  const progressPercent = Math.round((completedCount / steps.length) * 100);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>Getting started</CardTitle>
            <CardDescription>
              Complete these steps to get your workspace fully configured.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="secondary" className="tabular-nums">
              {completedCount} of {steps.length}
            </Badge>
            <Button
              size="icon"
              variant="ghost"
              className="size-6 text-muted-foreground hover:text-foreground"
              onClick={dismiss}
              aria-label="Dismiss getting started guide"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border">
          {steps.map((step) => (
            <li
              key={step.id}
              className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
            >
              {step.complete ? (
                <CheckCircle2 className="size-5 shrink-0 text-primary" />
              ) : (
                <Circle className="size-5 shrink-0 text-muted-foreground/40" />
              )}
              <div className="min-w-0 flex-1">
                <p
                  className={
                    step.complete
                      ? "text-sm font-medium text-muted-foreground line-through"
                      : "text-sm font-medium"
                  }
                >
                  {step.label}
                </p>
                {!step.complete && (
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                )}
              </div>
              <Button
                asChild
                size="sm"
                variant={step.complete ? "ghost" : "outline"}
                className="shrink-0"
                disabled={step.complete}
              >
                <Link href={step.href}>{step.complete ? "Done" : step.linkLabel}</Link>
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
