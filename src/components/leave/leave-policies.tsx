"use client";

import * as React from "react";
import { CalendarRange, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentTenant, useLeavePolicies } from "@/lib/store/hooks";
import { getLeavePolicyAction, type LeavePolicyData } from "@/lib/leave/policy-actions";
import type { LeaveType } from "@/lib/types";

export function LeavePolicies() {
  const basePolicies = useLeavePolicies();
  const tenant = useCurrentTenant();
  const [policyData, setPolicyData] = React.useState<LeavePolicyData | null>(null);

  React.useEffect(() => {
    getLeavePolicyAction(tenant.id)
      .then(setPolicyData)
      .catch(() => setPolicyData(null));
  }, [tenant.id]);

  // Merge the tenant's configured entitlement days and family-leave paid status
  // over the statutory defaults, so the cards reflect this company's policy.
  const policies = React.useMemo(() => {
    if (!policyData) return basePolicies;
    const daysByType: Partial<Record<LeaveType, number>> = {
      annual: policyData.annualDays,
      sick: policyData.sickDays,
      family: policyData.familyDays,
      maternity: policyData.maternityDays,
      parental: policyData.parentalDays,
      adoption: policyData.adoptionDays,
      commissioning: policyData.commissioningDays,
      study: policyData.studyDays,
      unpaid: policyData.unpaidDays,
    };
    const paidByType: Partial<Record<LeaveType, boolean>> = {
      maternity: policyData.maternityPaid,
      parental: policyData.parentalPaid,
      adoption: policyData.adoptionPaid,
      commissioning: policyData.commissioningPaid,
    };
    return basePolicies.map((policy) => ({
      ...policy,
      annualDays: daysByType[policy.type] ?? policy.annualDays,
      paid: paidByType[policy.type] ?? policy.paid,
    }));
  }, [basePolicies, policyData]);

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
