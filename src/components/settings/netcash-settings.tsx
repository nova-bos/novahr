"use client";

import * as React from "react";
import { Eye, EyeOff, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlan } from "@/lib/plan/use-plan";
import { useTenantId } from "@/lib/store/hooks";
import {
  getPayrollSettingsAction,
  updateNetcashSettingsAction,
  testNetcashKeyAction,
} from "@/lib/settings/actions";

interface KeyFieldProps {
  label: string;
  description: string;
  hasKey: boolean;
  disabled: boolean;
  onSave: (value: string | null) => Promise<void>;
  onTest: (value: string) => Promise<void>;
}

function KeyField({ label, description, hasKey, disabled, onSave, onTest }: KeyFieldProps) {
  const [editing, setEditing] = React.useState(!hasKey);
  const [value, setValue] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(value.trim() || null);
    setSaving(false);
    setEditing(false);
    setValue("");
  }

  async function handleTest() {
    if (!value.trim()) return;
    setTesting(true);
    await onTest(value.trim());
    setTesting(false);
  }

  if (!editing) {
    return (
      <div className="space-y-1.5">
        <Label>{label}</Label>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-10 rounded-lg border border-border bg-muted/30 px-3 flex items-center">
            <span className="text-sm text-muted-foreground font-mono">Saved (hidden)</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing(true)}
            disabled={disabled}
          >
            Change
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            type={show ? "text" : "password"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. 7f9c2b4e-1a3d-4c5f-8e6a-9b0d1c2e3f4a"
            disabled={saving || testing}
            className="pr-10 font-mono text-sm"
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
            aria-label={show ? "Hide key" : "Show key"}
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleTest}
          disabled={!value.trim() || testing || saving}
        >
          {testing ? <Loader2 className="size-3.5 animate-spin" /> : "Test"}
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving || testing}>
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : "Save"}
        </Button>
        {hasKey && (
          <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setValue(""); }}>
            Cancel
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export function NetcashSettings() {
  const { can } = usePlan();
  const tenantId = useTenantId();

  const [hasSalaryKey, setHasSalaryKey] = React.useState(false);
  const [hasAccountServicesKey, setHasAccountServicesKey] = React.useState(false);
  const [instruction, setInstruction] = React.useState("DatedSalaries");
  const [environment, setEnvironment] = React.useState("production");
  const [loaded, setLoaded] = React.useState(false);
  const [isSavingConfig, startSaveConfig] = React.useTransition();

  React.useEffect(() => {
    if (!can("payrollSettings")) return;
    getPayrollSettingsAction(tenantId).then((s) => {
      setHasSalaryKey(s.hasSalaryKey);
      setHasAccountServicesKey(s.hasAccountServicesKey);
      setInstruction(s.netcashInstruction ?? "DatedSalaries");
      setEnvironment(s.netcashEnvironment ?? "production");
      setLoaded(true);
    });
  }, [tenantId, can]);

  if (!can("payrollSettings")) return null;
  if (!loaded) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading Netcash settings">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-9 w-1/2" />
      </div>
    );
  }

  async function saveKey(field: "salaryKey" | "accountServicesKey", value: string | null) {
    const result = await updateNetcashSettingsAction(tenantId, { [field]: value });
    if (!result.success) {
      toast.error("Could not save key", { description: result.error });
      return;
    }
    toast.success("Key saved securely.");
    if (field === "salaryKey") setHasSalaryKey(!!value);
    if (field === "accountServicesKey") setHasAccountServicesKey(!!value);
  }

  async function testKey(keyType: "salary" | "accountServices", rawKey: string) {
    const result = await testNetcashKeyAction(tenantId, keyType, rawKey);
    const statusLabels: Record<string, string> = {
      connected: environment === "uat" ? "Testing environment connected" : "Connected",
      invalid_key: "Invalid service key",
      auth_failed: "Authentication failed",
      timeout: "Timeout",
      network_error: "Network error",
      server_unavailable: "Server unavailable",
      server_error: "Server error",
    };
    const label = statusLabels[result.status] ?? "Test failed";
    if (result.valid) {
      toast.success(label, { description: result.message });
    } else {
      toast.error(label, { description: result.message });
    }
  }

  function saveConfig() {
    startSaveConfig(async () => {
      const result = await updateNetcashSettingsAction(tenantId, { netcashInstruction: instruction, netcashEnvironment: environment });
      if (!result.success) {
        toast.error("Could not save settings", { description: result.error });
        return;
      }
      toast.success("Netcash settings saved.");
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>Netcash integration</CardTitle>
            <CardDescription>
              Connect to Netcash to submit salary batches and validate employee bank accounts. Keys are encrypted and never shown again after saving.
            </CardDescription>
          </div>
          <Badge variant={environment === "uat" ? "outline" : "default"} className={environment === "uat" ? "border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-500/10" : ""}>
            {environment === "uat" ? "Testing (UAT)" : "Live"}
          </Badge>
        </div>
      </CardHeader>

      {environment === "uat" && (
        <div className="mx-6 mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          You are in the Netcash testing environment. Payments will not be processed.
        </div>
      )}

      <CardContent className="grid gap-6">
        <KeyField
          label="Salary service key"
          description="Used to submit NIF salary batch files. Found in your Netcash portal under NetConnector."
          hasKey={hasSalaryKey}
          disabled={false}
          onSave={(v) => saveKey("salaryKey", v)}
          onTest={(v) => testKey("salary", v)}
        />
        <KeyField
          label="Account services key"
          description="Used to validate employee bank accounts and query account balance and payment limits. Found under Account Services in your Netcash portal."
          hasKey={hasAccountServicesKey}
          disabled={false}
          onSave={(v) => saveKey("accountServicesKey", v)}
          onTest={(v) => testKey("accountServices", v)}
        />

        <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-border">
          <div className="space-y-1.5">
            <Label htmlFor="netcashInstruction">Payment instruction</Label>
            <Select value={instruction} onValueChange={setInstruction} disabled={isSavingConfig}>
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
              DatedSalaries uses the pay date. Load by 12:59 the business day before.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="netcashEnvironment">Environment</Label>
            <Select value={environment} onValueChange={setEnvironment} disabled={isSavingConfig}>
              <SelectTrigger id="netcashEnvironment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="production">Live (production)</SelectItem>
                <SelectItem value="uat">Testing (UAT)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Switch to UAT during initial testing. No real payments are processed.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <a
            href="https://api.netcash.co.za/netcash-programmers-guide-v2/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            Netcash programmer guide
            <ExternalLink className="size-3.5" />
          </a>
        </div>
      </CardContent>

      <CardFooter className="justify-end">
        <Button onClick={saveConfig} disabled={isSavingConfig}>
          {isSavingConfig ? "Saving..." : "Save configuration"}
        </Button>
      </CardFooter>
    </Card>
  );
}
