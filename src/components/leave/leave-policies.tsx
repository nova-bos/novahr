"use client";

import { CalendarRange, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLeavePolicies } from "@/lib/store/hooks";

export function LeavePolicies() {
  const policies = useLeavePolicies();

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {policies.map((policy) => (
        <Card key={policy.type}>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <CalendarRange className="size-4 text-muted-foreground" />
                {policy.label}
              </CardTitle>
              <Badge
                variant="outline"
                className={
                  policy.paid
                    ? "border-transparent bg-success/10 font-medium text-success"
                    : "border-transparent bg-muted font-medium text-muted-foreground"
                }
              >
                {policy.paid ? "Paid" : "Unpaid"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{policy.description}</p>
            <div className="flex items-center justify-between rounded-xl border border-border/70 p-3 text-sm">
              <span className="text-muted-foreground">Annual entitlement</span>
              <span className="font-semibold">{policy.annualDays} days</span>
            </div>
            {policy.requiresApproval ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="size-3.5" />
                Requires manager approval
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
