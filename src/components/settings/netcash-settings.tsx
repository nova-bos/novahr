"use client";

import * as React from "react";
import { Eye, EyeOff, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePlan } from "@/lib/plan/use-plan";
import { useTenantId } from "@/lib/store/hooks";
import {
  getPayrollSettingsAction,
  updateNetcashSettingsAction,
} from "@/lib/settings/actions";

export function NetcashSettings() {
  const { can } = usePlan();
  const tenantId = useTenantId();
  const [serviceKey, setServiceKey] = React.useState("");
  const [instruction, setInstruction] = React.useState("DatedSalaries");
  const [showKey, setShowKey] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);
  const [isSaving, startSaveTransition] = React.useTransition();

  React.useEffect(() => {
    if (!can("payrollSettings")) return;
    getPayrollSettingsAction(tenantId).then((s) => {
      setServiceKey(s.netcashServiceKey ?? "");
      setInstruction(s.netcashInstruction ?? "DatedSalaries");
      setLoaded(true);
    });
  }, [tenantId, can]);

  if (!can("payrollSettings")) return null;
  if (!loaded) return <p className="text-sm text-muted-foreground">Loading...</p>;

  function handleSave() {
    startSaveTransition(async () => {
      const result = await updateNetcashSettingsAction(tenantId, {
        netcashServiceKey: serviceKey.trim() || null,
        netcashInstruction: instruction,
      });
      if (!result.success) {
        toast.error("Could not save Netcash settings", { description: result.error });
        return;
      }
      toast.success("Netcash settings saved");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Netcash integration</CardTitle>
        <CardDescription>
          Connect to Netcash to submit salary batches directly or export NIF files for manual upload.
          Get your Salary service key from your Netcash portal under Services.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="netcashServiceKey">Salary service key</Label>
          <div className="relative">
            <Input
              id="netcashServiceKey"
              type={showKey ? "text" : "password"}
              value={serviceKey}
              onChange={(e) => setServiceKey(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              disabled={isSaving}
              className="pr-10 font-mono text-sm"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
              aria-label={showKey ? "Hide service key" : "Show service key"}
            >
              {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Found in your Netcash account under NetConnector. Keep this key confidential.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="netcashInstruction">Payment instruction</Label>
          <Select value={instruction} onValueChange={setInstruction} disabled={isSaving}>
            <SelectTrigger id="netcashInstruction">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DatedSalaries">DatedSalaries (recommended)</SelectItem>
              <SelectItem value="PaySalaries">PaySalaries (same-day)</SelectItem>
              <SelectItem value="RTCSalaries">RTCSalaries (real-time)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            DatedSalaries uses the payroll pay date. Load by 12:59 the business day before.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>Documentation</Label>
          <a
            href="https://api.netcash.co.za/netcash-programmers-guide-v2/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            Netcash programmer guide
            <ExternalLink className="size-3.5" />
          </a>
          <p className="text-xs text-muted-foreground">
            Refer to the Salary section for NIF field requirements and deadlines.
          </p>
        </div>
      </CardContent>
      <CardFooter className="justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Netcash settings"}
        </Button>
      </CardFooter>
    </Card>
  );
}
