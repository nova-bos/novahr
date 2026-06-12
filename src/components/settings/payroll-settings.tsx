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
import { payFrequencyOptions } from "@/lib/data";
import { useCurrentTenant, usePayrollConfig } from "@/lib/store/hooks";
import type { PayFrequency } from "@/lib/types";
import { SettingRow } from "./setting-row";

export function PayrollSettings() {
  const tenant = useCurrentTenant();
  const config = usePayrollConfig();

  const [payFrequency, setPayFrequency] = React.useState<PayFrequency>(tenant.payFrequency);
  const [payDay, setPayDay] = React.useState(tenant.payDay.toString());
  const [bankName, setBankName] = React.useState(tenant.bankName);
  const [defaultPensionPct, setDefaultPensionPct] = React.useState(
    config.defaultPensionPct.toString()
  );
  const [payeReference, setPayeReference] = React.useState(config.payeReferenceNumber);
  const [uifReference, setUifReference] = React.useState(config.uifReferenceNumber);
  const [sdlReference, setSdlReference] = React.useState(config.sdlReferenceNumber);
  const [uifEnabled, setUifEnabled] = React.useState(config.uifEnabled);
  const [sdlEnabled, setSdlEnabled] = React.useState(config.sdlEnabled);

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    toast.success("Payroll settings updated", {
      description: "Your payroll configuration has been saved.",
    });
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
            <Select value={payFrequency} onValueChange={(v) => setPayFrequency(v as PayFrequency)}>
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
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bankName">Banking partner</Label>
            <Input id="bankName" value={bankName} onChange={(e) => setBankName(e.target.value)} />
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
            />
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit">Save changes</Button>
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
                onChange={(e) => setPayeReference(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="uifReference">UIF reference number</Label>
              <Input
                id="uifReference"
                value={uifReference}
                onChange={(e) => setUifReference(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sdlReference">SDL reference number</Label>
              <Input
                id="sdlReference"
                value={sdlReference}
                onChange={(e) => setSdlReference(e.target.value)}
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
              onCheckedChange={setUifEnabled}
            />
            <SettingRow
              title="SDL levy"
              description="Apply the Skills Development Levy to monthly payroll runs."
              checked={sdlEnabled}
              onCheckedChange={setSdlEnabled}
            />
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit">Save changes</Button>
        </CardFooter>
      </Card>
    </form>
  );
}
