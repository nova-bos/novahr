"use client";

import * as React from "react";
import { toast } from "sonner";
import { CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLeavePolicies } from "@/lib/store/hooks";
import { SettingRow } from "./setting-row";

export function LeavePolicySettings() {
  const policies = useLeavePolicies();

  const [form, setForm] = React.useState(() =>
    Object.fromEntries(
      policies.map((policy) => [
        policy.type,
        {
          annualDays: policy.annualDays.toString(),
          description: policy.description,
          paid: policy.paid,
          requiresApproval: policy.requiresApproval,
        },
      ])
    )
  );

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    toast.success("Leave policies updated", {
      description: "Entitlements and approval rules have been saved.",
    });
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {policies.map((policy) => {
          const values = form[policy.type];
          return (
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
                    value={values.annualDays}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        [policy.type]: { ...prev[policy.type], annualDays: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${policy.type}-description`}>Description</Label>
                  <Textarea
                    id={`${policy.type}-description`}
                    rows={2}
                    value={values.description}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        [policy.type]: { ...prev[policy.type], description: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="divide-y divide-border/70 rounded-xl border border-border/70 px-4">
                  <SettingRow
                    title="Paid leave"
                    description="Employees continue to receive their salary while on leave."
                    checked={values.paid}
                    onCheckedChange={(checked) =>
                      setForm((prev) => ({
                        ...prev,
                        [policy.type]: { ...prev[policy.type], paid: checked },
                      }))
                    }
                  />
                  <SettingRow
                    title="Requires manager approval"
                    description="Requests must be approved before leave balances update."
                    checked={values.requiresApproval}
                    onCheckedChange={(checked) =>
                      setForm((prev) => ({
                        ...prev,
                        [policy.type]: { ...prev[policy.type], requiresApproval: checked },
                      }))
                    }
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <div className="flex justify-end">
        <Button type="submit">Save changes</Button>
      </div>
    </form>
  );
}
