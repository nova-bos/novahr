"use client";

import * as React from "react";
import { CalendarRange } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLeavePolicies } from "@/lib/store/hooks";
import { SettingRow } from "./setting-row";

export function LeavePolicySettings() {
  const policies = useLeavePolicies();

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        These policies follow the BCEA and current South African legislation, including the
        Constitutional Court&apos;s Van Wyk ruling on parental leave. Statutory minimums cannot be
        reduced; per-company customization above the minimums will be available in a future update.
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {policies.map((policy) => (
          <Card key={policy.type}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarRange className="size-4 text-muted-foreground" />
                {policy.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="space-y-1.5">
                <Label htmlFor={`${policy.type}-days`}>Annual entitlement (days)</Label>
                <Input
                  id={`${policy.type}-days`}
                  type="number"
                  min={0}
                  value={policy.annualDays.toString()}
                  disabled
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${policy.type}-description`}>Description</Label>
                <Textarea
                  id={`${policy.type}-description`}
                  rows={2}
                  value={policy.description}
                  disabled
                />
              </div>
              <div className="divide-y divide-border/70 rounded-xl border border-border/70 px-4">
                <SettingRow
                  title="Paid leave"
                  description="Employees continue to receive their salary while on leave."
                  checked={policy.paid}
                  onCheckedChange={() => undefined}
                  disabled
                />
                <SettingRow
                  title="Requires manager approval"
                  description="Requests must be approved before leave balances update."
                  checked={policy.requiresApproval}
                  onCheckedChange={() => undefined}
                  disabled
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
