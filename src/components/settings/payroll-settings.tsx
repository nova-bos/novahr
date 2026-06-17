"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { payFrequencyOptions } from "@/lib/config/leave";
import { useApp } from "@/lib/store/app-provider";
import { useCurrentTenant, usePayrollConfig } from "@/lib/store/hooks";
import type { PayFrequency } from "@/lib/types";
import { SettingRow } from "./setting-row";

export function PayrollSettings() {
  const tenant = useCurrentTenant();
  const config = usePayrollConfig();
  const { updateTenantPayrollSettings } = useApp();

  const [payFrequency, setPayFrequency] = React.useState<PayFrequency>(tenant.payFrequency);
  const [payDay, setPayDay] = React.useState(tenant.payDay.toString());
  const [bankName, setBankName] = React.useState(tenant.bankName);
  const [defaultPensionPct, setDefaultPensionPct] = React.useState(
    config.defaultPensionPct.toString()
  );
  const [payeReference] = React.useState(config.payeReferenceNumber);
  const [uifReference] = React.useState(config.uifReferenceNumber);
  const [sdlReference] = React.useState(config.sdlReferenceNumber);
  const [uifEnabled, setUifEnabled] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return config.uifEnabled;
    try {
      const stored = JSON.parse(localStorage.getItem(`novahr:payroll-config:${tenant.id}`) ?? "null");
      return stored?.uifEnabled ?? config.uifEnabled;
    } catch {
      return config.uifEnabled;
    }
  });
  const [sdlEnabled, setSdlEnabled] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return config.sdlEnabled;
    try {
      const stored = JSON.parse(localStorage.getItem(`novahr:payroll-config:${tenant.id}`) ?? "null");
      return stored?.sdlEnabled ?? config.sdlEnabled;
    } catch {
      return config.sdlEnabled;
    }
  });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = JSON.parse(localStorage.getItem(`novahr:payroll-config:${tenant.id}`) ?? "null");
      if (stored) {
        if (typeof stored.uifEnabled === "boolean") setUifEnabled(stored.uifEnabled);
        if (typeof stored.sdlEnabled === "boolean") setSdlEnabled(stored.sdlEnabled);
      }
    } catch {
      // ignore SSR or parse errors
    }
  }, [tenant.id]);

  function handleUifChange(checked: boolean) {
    setUifEnabled(checked);
    if (typeof window !== "undefined") {
      try {
        const key = `novahr:payroll-config:${tenant.id}`;
        const prev = JSON.parse(localStorage.getItem(key) ?? "{}") as Record<string, unknown>;
        localStorage.setItem(key, JSON.stringify({ ...prev, uifEnabled: checked }));
      } catch {
        // ignore
      }
    }
  }

  function handleSdlChange(checked: boolean) {
    setSdlEnabled(checked);
    if (typeof window !== "undefined") {
      try {
        const key = `novahr:payroll-config:${tenant.id}`;
        const prev = JSON.parse(localStorage.getItem(key) ?? "{}") as Record<string, unknown>;
        localStorage.setItem(key, JSON.stringify({ ...prev, sdlEnabled: checked }));
      } catch {
        // ignore
      }
    }
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await updateTenantPayrollSettings({
        payFrequency,
        payDay: parseInt(payDay),
        bankName,
      });
      toast.success("Payroll settings updated", {
        description: "Your payroll configuration has been saved.",
      });
    } catch {
      toast.error("Couldn't save changes", { description: "Please try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Pay run configuration</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="payFrequency">Pay frequency</Label>
            <Select
              value={payFrequency}
              onValueChange={(v) => setPayFrequency(v as PayFrequency)}
              disabled={saving}
            >
              <SelectTrigger id="payFrequency" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {payFrequencyOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="payDay">Pay day</Label>
            <Input
              id="payDay"
              type="number"
              min={1}
              max={31}
              value={payDay}
              onChange={(e) => setPayDay(e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bankName">Banking partner</Label>
            <Input id="bankName" value={bankName} onChange={(e) => setBankName(e.target.value)} disabled={saving} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="currency">Currency</Label>
            <Input id="currency" value={tenant.currency} disabled />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="defaultPensionPct">Default pension contribution (%)</Label>
            <Input
              id="defaultPensionPct"
              type="number"
              step={0.5}
              min={0}
              max={100}
              value={defaultPensionPct}
              onChange={(e) => setDefaultPensionPct(e.target.value)}
              disabled={saving}
            />
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Statutory registration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="payeReference">PAYE reference number</Label>
              <Input
                id="payeReference"
                value={payeReference}
                disabled
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="uifReference">UIF reference number</Label>
              <Input
                id="uifReference"
                value={uifReference}
                disabled
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sdlReference">SDL reference number</Label>
              <Input
                id="sdlReference"
                value={sdlReference}
                disabled
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="taxYear">Tax year</Label>
              <Input id="taxYear" value={config.taxYear} disabled />
            </div>
          </div>
          <Separator className="my-5" />
          <div className="divide-y divide-border/70">
            <SettingRow
              title="UIF contributions"
              description="Withhold and remit Unemployment Insurance Fund contributions."
              checked={uifEnabled}
              onCheckedChange={handleUifChange}
            />
            <SettingRow
              title="SDL levy"
              description="Apply the Skills Development Levy to monthly payroll runs."
              checked={sdlEnabled}
              onCheckedChange={handleSdlChange}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Reference numbers are stored for display. PAYE, UIF and SDL submissions are not yet automated.
          </p>
        </CardContent>
      </Card>
    </form>
  );
}
