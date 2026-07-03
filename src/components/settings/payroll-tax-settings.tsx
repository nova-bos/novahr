"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { SettingRow } from "./setting-row";
import { usePlan } from "@/lib/plan/use-plan";
import { useTenantId } from "@/lib/store/hooks";
import {
  getPayrollSettingsAction,
  updateTaxSettingsAction,
  type PayrollSettingsResult,
} from "@/lib/settings/actions";

export function PayrollTaxSettings() {
  const { can } = usePlan();
  const tenantId = useTenantId();
  const [settings, setSettings] = React.useState<PayrollSettingsResult | null>(null);

  const [sdlEnabled, setSdlEnabled] = React.useState(true);
  const [sdlRate, setSdlRate] = React.useState("1");
  const [uifEnabled, setUifEnabled] = React.useState(true);
  const [uifEmployeeRate, setUifEmployeeRate] = React.useState("1");
  const [uifEmployerRate, setUifEmployerRate] = React.useState("1");
  const [uifCeiling, setUifCeiling] = React.useState("17712");

  const [isSavingTax, startSaveTaxTransition] = React.useTransition();

  React.useEffect(() => {
    if (!can("payrollSettings")) return;
    getPayrollSettingsAction(tenantId).then((s) => {
      setSettings(s);
      setSdlEnabled(s.sdlEnabled);
      setSdlRate(String(Math.round(s.sdlRate * 100)));
      setUifEnabled(s.uifEnabled);
      setUifEmployeeRate(String(Math.round(s.uifEmployeeRate * 100)));
      setUifEmployerRate(String(Math.round(s.uifEmployerRate * 100)));
      setUifCeiling(String(s.uifCeiling));
    });
  }, [tenantId, can]);

  if (!can("payrollSettings")) return null;
  if (!settings) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading tax settings">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-9 w-1/2" />
      </div>
    );
  }

  function handleSaveTax() {
    startSaveTaxTransition(async () => {
      const result = await updateTaxSettingsAction(tenantId, {
        sdlEnabled,
        sdlRate: parseFloat(sdlRate) / 100,
        uifEnabled,
        uifEmployeeRate: parseFloat(uifEmployeeRate) / 100,
        uifEmployerRate: parseFloat(uifEmployerRate) / 100,
        uifCeiling: parseFloat(uifCeiling),
      });
      if (!result.success) {
        toast.error("Could not save tax settings", { description: result.error });
        return;
      }
      toast.success("Tax settings saved");
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>SDL and UIF configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="divide-y divide-border/70">
            <SettingRow
              title="SDL levy"
              description="Apply the Skills Development Levy to monthly payroll runs."
              checked={sdlEnabled}
              onCheckedChange={setSdlEnabled}
            />
            <SettingRow
              title="UIF contributions"
              description="Withhold and remit Unemployment Insurance Fund contributions."
              checked={uifEnabled}
              onCheckedChange={setUifEnabled}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sdlRate">SDL rate (%)</Label>
              <Input
                id="sdlRate"
                type="number"
                step={0.1}
                min={0}
                max={100}
                value={sdlRate}
                onChange={(e) => setSdlRate(e.target.value)}
                disabled={isSavingTax}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="uifCeiling">UIF monthly ceiling (ZAR)</Label>
              <Input
                id="uifCeiling"
                type="number"
                step={1}
                min={0}
                value={uifCeiling}
                onChange={(e) => setUifCeiling(e.target.value)}
                disabled={isSavingTax}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="uifEmployeeRate">UIF employee rate (%)</Label>
              <Input
                id="uifEmployeeRate"
                type="number"
                step={0.1}
                min={0}
                max={100}
                value={uifEmployeeRate}
                onChange={(e) => setUifEmployeeRate(e.target.value)}
                disabled={isSavingTax}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="uifEmployerRate">UIF employer rate (%)</Label>
              <Input
                id="uifEmployerRate"
                type="number"
                step={0.1}
                min={0}
                max={100}
                value={uifEmployerRate}
                onChange={(e) => setUifEmployerRate(e.target.value)}
                disabled={isSavingTax}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button onClick={handleSaveTax} disabled={isSavingTax}>
            {isSavingTax ? "Saving..." : "Save tax settings"}
          </Button>
        </CardFooter>
      </Card>

    </div>
  );
}
