"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenantId } from "@/lib/store/hooks";
import {
  getPayrollSettingsAction,
  updateBenefitSettingsAction,
} from "@/lib/settings/actions";

/**
 * Company-level benefit toggles. Off by default, so an SME that only wants
 * payroll is never opted into a pension or medical aid. When a toggle is on,
 * the matching fields appear during employee onboarding.
 */
export function BenefitsSettings() {
  const tenantId = useTenantId();
  const [loaded, setLoaded] = React.useState(false);
  const [offersPension, setOffersPension] = React.useState(false);
  const [offersMedicalAid, setOffersMedicalAid] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    getPayrollSettingsAction(tenantId)
      .then((s) => {
        if (!active) return;
        setOffersPension(s.offersPension);
        setOffersMedicalAid(s.offersMedicalAid);
        setLoaded(true);
      })
      .catch(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [tenantId]);

  async function handleSave() {
    setSaving(true);
    const res = await updateBenefitSettingsAction(tenantId, { offersPension, offersMedicalAid });
    setSaving(false);
    if (res.success) {
      toast.success("Benefit settings saved");
    } else {
      toast.error("Could not save", { description: res.error });
    }
  }

  if (!loaded) {
    return <Skeleton className="h-32 w-full" />;
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        Turn these on only if your company contributes to them. Most small businesses run payroll
        without either, and employees fund their own retirement annuity. When a benefit is on, the
        matching field appears when you add or edit an employee.
      </p>

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-0.5">
          <Label htmlFor="offers-pension" className="text-sm font-medium">
            Company pension or provident fund
          </Label>
          <p className="text-xs text-muted-foreground">
            We deduct a pension or provident fund contribution through payroll.
          </p>
        </div>
        <Switch id="offers-pension" checked={offersPension} onCheckedChange={setOffersPension} />
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-0.5">
          <Label htmlFor="offers-medical" className="text-sm font-medium">
            Medical aid contribution
          </Label>
          <p className="text-xs text-muted-foreground">
            We deduct a medical aid contribution and apply the SARS medical tax credit.
          </p>
        </div>
        <Switch id="offers-medical" checked={offersMedicalAid} onCheckedChange={setOffersMedicalAid} />
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
