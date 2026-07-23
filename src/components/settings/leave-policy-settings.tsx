"use client";

import * as React from "react";
import { CalendarRange } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useCurrentTenant } from "@/lib/store/hooks";
import {
  getLeavePolicyAction,
  updateLeavePolicyAction,
  type LeavePolicyData,
} from "@/lib/leave/policy-actions";

const LEAVE_FIELDS: {
  key: keyof LeavePolicyData;
  label: string;
  minimum?: number;
}[] = [
  { key: "annualDays", label: "Annual leave (days)", minimum: 15 },
  { key: "sickDays", label: "Sick leave (days)", minimum: 30 },
  { key: "familyDays", label: "Family responsibility (days)", minimum: 3 },
  { key: "maternityDays", label: "Maternity leave (days)", minimum: 88 },
  { key: "parentalDays", label: "Parental leave (days)", minimum: 10 },
  { key: "adoptionDays", label: "Adoption leave (days)", minimum: 50 },
  { key: "commissioningDays", label: "Commissioning parental (days)", minimum: 50 },
  { key: "studyDays", label: "Study leave (days)", minimum: 5 },
  { key: "unpaidDays", label: "Unpaid leave (days)", minimum: 0 },
];

const POLICY_DEFAULTS = {
  annualDays: "15",
  sickDays: "30",
  familyDays: "3",
  maternityDays: "88",
  parentalDays: "10",
  adoptionDays: "50",
  commissioningDays: "50",
  studyDays: "5",
  unpaidDays: "5",
  annualCarryover: true,
  annualMaxCarryoverDays: "10",
  sickRequireDocDays: "2",
};

function numericState(v: number) {
  return v.toString();
}

export function LeavePolicySettings() {
  const tenant = useCurrentTenant();

  const [annualDays, setAnnualDays] = React.useState("15");
  const [sickDays, setSickDays] = React.useState("30");
  const [familyDays, setFamilyDays] = React.useState("3");
  const [maternityDays, setMaternityDays] = React.useState("88");
  const [parentalDays, setParentalDays] = React.useState("10");
  const [adoptionDays, setAdoptionDays] = React.useState("50");
  const [commissioningDays, setCommissioningDays] = React.useState("50");
  const [studyDays, setStudyDays] = React.useState("5");
  const [unpaidDays, setUnpaidDays] = React.useState("5");
  const [annualCarryover, setAnnualCarryover] = React.useState(true);
  const [annualMaxCarryoverDays, setAnnualMaxCarryoverDays] = React.useState("10");
  const [sickRequireDocDays, setSickRequireDocDays] = React.useState("2");
  const [leaveAccrualMethod, setLeaveAccrualMethod] =
    React.useState<"upfront" | "accrual">("accrual");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    getLeavePolicyAction(tenant.id).then((p) => {
      setAnnualDays(numericState(p.annualDays));
      setSickDays(numericState(p.sickDays));
      setFamilyDays(numericState(p.familyDays));
      setMaternityDays(numericState(p.maternityDays));
      setParentalDays(numericState(p.parentalDays));
      setAdoptionDays(numericState(p.adoptionDays));
      setCommissioningDays(numericState(p.commissioningDays));
      setStudyDays(numericState(p.studyDays));
      setUnpaidDays(numericState(p.unpaidDays));
      setAnnualCarryover(p.annualCarryover);
      setAnnualMaxCarryoverDays(numericState(p.annualMaxCarryoverDays));
      setSickRequireDocDays(numericState(p.sickRequireDocDays));
      setLeaveAccrualMethod(p.leaveAccrualMethod);
    });
  }, [tenant.id]);

  function handleReset() {
    setAnnualDays(POLICY_DEFAULTS.annualDays);
    setSickDays(POLICY_DEFAULTS.sickDays);
    setFamilyDays(POLICY_DEFAULTS.familyDays);
    setMaternityDays(POLICY_DEFAULTS.maternityDays);
    setParentalDays(POLICY_DEFAULTS.parentalDays);
    setAdoptionDays(POLICY_DEFAULTS.adoptionDays);
    setCommissioningDays(POLICY_DEFAULTS.commissioningDays);
    setStudyDays(POLICY_DEFAULTS.studyDays);
    setUnpaidDays(POLICY_DEFAULTS.unpaidDays);
    setAnnualCarryover(POLICY_DEFAULTS.annualCarryover);
    setAnnualMaxCarryoverDays(POLICY_DEFAULTS.annualMaxCarryoverDays);
    setSickRequireDocDays(POLICY_DEFAULTS.sickRequireDocDays);
    setLeaveAccrualMethod("accrual");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = await updateLeavePolicyAction(tenant.id, {
      annualDays: Number(annualDays),
      sickDays: Number(sickDays),
      familyDays: Number(familyDays),
      maternityDays: Number(maternityDays),
      parentalDays: Number(parentalDays),
      adoptionDays: Number(adoptionDays),
      commissioningDays: Number(commissioningDays),
      studyDays: Number(studyDays),
      unpaidDays: Number(unpaidDays),
      annualCarryover,
      annualMaxCarryoverDays: Number(annualMaxCarryoverDays),
      sickRequireDocDays: Number(sickRequireDocDays),
      leaveAccrualMethod,
    });
    setSaving(false);
    if (result.success) {
      toast.success("Leave policy saved");
    } else {
      toast.error(result.error ?? "Failed to save");
    }
  }

  const vals: Record<string, string> = {
    annualDays,
    sickDays,
    familyDays,
    maternityDays,
    parentalDays,
    adoptionDays,
    commissioningDays,
    studyDays,
    unpaidDays,
  };

  const setters: Record<string, (v: string) => void> = {
    annualDays: setAnnualDays,
    sickDays: setSickDays,
    familyDays: setFamilyDays,
    maternityDays: setMaternityDays,
    parentalDays: setParentalDays,
    adoptionDays: setAdoptionDays,
    commissioningDays: setCommissioningDays,
    studyDays: setStudyDays,
    unpaidDays: setUnpaidDays,
  };

  return (
    <form onSubmit={handleSave}>
      <div className="flex flex-col gap-6">
        <div className="rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          SA law sets minimum leave entitlements. You may grant more than the minimums but not less.
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarRange className="size-4 text-muted-foreground" />
              Leave entitlements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {LEAVE_FIELDS.map(({ key, label, minimum }) => (
                <div key={key} className="space-y-1.5">
                  <Label htmlFor={`leave-${key}`}>{label}</Label>
                  <Input
                    id={`leave-${key}`}
                    type="number"
                    min={minimum ?? 0}
                    step={1}
                    value={vals[key] ?? "0"}
                    onChange={(e) => setters[key]?.(e.target.value)}
                    disabled={saving}
                  />
                  {minimum !== undefined ? (
                    <p className="text-xs text-muted-foreground">Min: {minimum} days (SA law)</p>
                  ) : null}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How annual leave is granted</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <button
              type="button"
              onClick={() => setLeaveAccrualMethod("accrual")}
              disabled={saving}
              className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                leaveAccrualMethod === "accrual"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/40"
              }`}
            >
              <p className="text-sm font-medium">Accrue monthly (earned over the year)</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Annual leave is earned each month, building up to the full entitlement over twelve months. New employees start at zero and earn as they go. Recommended.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setLeaveAccrualMethod("upfront")}
              disabled={saving}
              className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                leaveAccrualMethod === "upfront"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/40"
              }`}
            >
              <p className="text-sm font-medium">Grant upfront (available immediately)</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                The full annual entitlement is available from day one and can be taken at any time.
              </p>
            </button>
            <p className="text-xs text-muted-foreground">
              Applies to annual leave. Sick, family and other statutory leave are always allocated in full.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Annual leave carryover</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Allow carryover to next cycle</p>
                <p className="text-xs text-muted-foreground">
                  Unused annual leave rolls over at the end of the leave cycle.
                </p>
              </div>
              <Switch checked={annualCarryover} onCheckedChange={setAnnualCarryover} />
            </div>
            {annualCarryover ? (
              <div className="space-y-1.5 max-w-xs">
                <Label htmlFor="max-carryover">Maximum carryover (days)</Label>
                <Input
                  id="max-carryover"
                  type="number"
                  min={0}
                  step={1}
                  value={annualMaxCarryoverDays}
                  onChange={(e) => setAnnualMaxCarryoverDays(e.target.value)}
                  disabled={saving}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sick leave documentation</CardTitle>
          </CardHeader>
          <CardContent className="max-w-xs">
            <div className="space-y-1.5">
              <Label htmlFor="sick-doc-days">Require certificate after (days)</Label>
              <Input
                id="sick-doc-days"
                type="number"
                min={1}
                step={1}
                value={sickRequireDocDays}
                onChange={(e) => setSickRequireDocDays(e.target.value)}
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground">
                A medical certificate is required for absences exceeding this many consecutive days.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button type="button" variant="outline" onClick={handleReset} disabled={saving}>
              Reset to defaults
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save policy"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </form>
  );
}
