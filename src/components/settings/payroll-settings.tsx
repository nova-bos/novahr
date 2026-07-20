"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label, OptionalTag } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { validatePayrollSettings } from "@/lib/schemas/tenant";
import { payFrequencyOptions } from "@/lib/config/leave";
import { useApp } from "@/lib/store/app-provider";
import { useCurrentTenant, usePayrollConfig } from "@/lib/store/hooks";
import type { PayFrequency } from "@/lib/types";
import { SA_BANKS } from "@/lib/services/netcash/helpers";
import { SettingRow } from "./setting-row";
import {
  getPayrollSettingsAction,
  updateStatutoryReferencesAction,
} from "@/lib/settings/actions";

export function PayrollSettings() {
  const tenant = useCurrentTenant();
  const config = usePayrollConfig();
  const { updateTenantPayrollSettings } = useApp();

  const [payFrequency, setPayFrequency] = React.useState<PayFrequency>(tenant.payFrequency);
  const [payDay, setPayDay] = React.useState(tenant.payDay.toString());
  const [bankName, setBankName] = React.useState(tenant.bankName);
  const [payeReference, setPayeReference] = React.useState(config.payeReferenceNumber);
  const [uifReference, setUifReference] = React.useState(config.uifReferenceNumber);
  const [sdlReference, setSdlReference] = React.useState(config.sdlReferenceNumber);
  const [savingRefs, setSavingRefs] = React.useState(false);
  const [refErrors, setRefErrors] = React.useState<Record<string, string>>({});
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
  const [errors, setErrors] = React.useState<Record<string, string>>({});

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
    // Load statutory reference numbers from DB (they override the static config fallback)
    getPayrollSettingsAction(tenant.id).then((s) => {
      if (s.payeReferenceNumber) setPayeReference(s.payeReferenceNumber);
      if (s.uifReferenceNumber) setUifReference(s.uifReferenceNumber);
      if (s.sdlReferenceNumber) setSdlReference(s.sdlReferenceNumber);
    });
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

  function validatePayeRef(v: string) {
    if (!v) return null;
    return /^7\d{9}$/.test(v) ? null : "PAYE reference must be 10 digits starting with 7";
  }

  function validateUifRef(v: string) {
    if (!v) return null;
    return /^U\d+$/i.test(v) ? null : "UIF reference must start with U followed by digits";
  }

  function validateSdlRef(v: string) {
    if (!v) return null;
    return /^L\d+$/i.test(v) ? null : "SDL reference must start with L followed by digits";
  }

  async function handleSaveRefs() {
    const errs: Record<string, string> = {};
    const payeErr = validatePayeRef(payeReference);
    const uifErr = validateUifRef(uifReference);
    const sdlErr = validateSdlRef(sdlReference);
    if (payeErr) errs.payeReference = payeErr;
    if (uifErr) errs.uifReference = uifErr;
    if (sdlErr) errs.sdlReference = sdlErr;
    if (Object.keys(errs).length > 0) {
      setRefErrors(errs);
      return;
    }
    setRefErrors({});
    setSavingRefs(true);
    try {
      const result = await updateStatutoryReferencesAction(tenant.id, {
        payeReferenceNumber: payeReference || null,
        uifReferenceNumber: uifReference || null,
        sdlReferenceNumber: sdlReference || null,
      });
      if (!result.success) {
        toast.error("Could not save reference numbers", { description: result.error });
        return;
      }
      toast.success("Reference numbers saved");
    } finally {
      setSavingRefs(false);
    }
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    const fieldErrors = validatePayrollSettings({ payFrequency, payDay, bankName });
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
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
            {errors.payDay ? <p className="text-xs text-destructive">{errors.payDay}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bankName">Banking partner</Label>
            <Select
              value={bankName || "none"}
              onValueChange={(v) => setBankName(v === "none" ? "" : v)}
              disabled={saving}
            >
              <SelectTrigger id="bankName" className="w-full">
                <SelectValue placeholder="Select bank" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not set</SelectItem>
                {SA_BANKS.map((b) => (
                  <SelectItem key={b.name} value={b.name}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="currency">Currency</Label>
            <Input id="currency" value={tenant.currency} disabled />
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
              <Label htmlFor="payeReference">PAYE reference number <OptionalTag /></Label>
              <Input
                id="payeReference"
                value={payeReference}
                onChange={(e) => {
                  setPayeReference(e.target.value);
                  if (refErrors.payeReference) setRefErrors((prev) => ({ ...prev, payeReference: "" }));
                }}
                placeholder="e.g. 7480123456"
                disabled={savingRefs}
              />
              {refErrors.payeReference ? <p className="text-xs text-destructive">{refErrors.payeReference}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="uifReference">UIF reference number <OptionalTag /></Label>
              <Input
                id="uifReference"
                value={uifReference}
                onChange={(e) => {
                  setUifReference(e.target.value);
                  if (refErrors.uifReference) setRefErrors((prev) => ({ ...prev, uifReference: "" }));
                }}
                placeholder="e.g. U123456789"
                disabled={savingRefs}
              />
              {refErrors.uifReference ? <p className="text-xs text-destructive">{refErrors.uifReference}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sdlReference">SDL reference number <OptionalTag /></Label>
              <Input
                id="sdlReference"
                value={sdlReference}
                onChange={(e) => {
                  setSdlReference(e.target.value);
                  if (refErrors.sdlReference) setRefErrors((prev) => ({ ...prev, sdlReference: "" }));
                }}
                placeholder="e.g. L123456789"
                disabled={savingRefs}
              />
              {refErrors.sdlReference ? <p className="text-xs text-destructive">{refErrors.sdlReference}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="taxYear">Tax year</Label>
              <Input id="taxYear" value={config.taxYear} disabled />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button type="button" variant="outline" size="sm" onClick={handleSaveRefs} disabled={savingRefs}>
              {savingRefs ? "Saving..." : "Save reference numbers"}
            </Button>
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
        </CardContent>
      </Card>
    </form>
  );
}
