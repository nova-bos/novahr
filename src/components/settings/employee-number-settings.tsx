"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentTenant } from "@/lib/store/hooks";
import { Checkbox } from "@/components/ui/checkbox";
import {
  getEmployeeNumberConfigAction,
  retroactivelyRenumberEmployeesAction,
  updateEmployeeNumberConfigAction,
} from "@/lib/employee-numbers/actions";

const EMP_NUMBER_DEFAULTS = { prefix: "EMP", separator: "-", padLength: "4" };

export function EmployeeNumberSettings() {
  const tenant = useCurrentTenant();
  const [prefix, setPrefix] = React.useState("EMP");
  const [padLength, setPadLength] = React.useState("4");
  const [separator, setSeparator] = React.useState("-");
  const [nextNumber, setNextNumber] = React.useState(1);
  const [renumberExisting, setRenumberExisting] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    getEmployeeNumberConfigAction(tenant.id).then((cfg) => {
      setPrefix(cfg.prefix);
      setPadLength(cfg.padLength.toString());
      setSeparator(cfg.separator === "" ? "none" : cfg.separator);
      setNextNumber(cfg.nextNumber);
    });
  }, [tenant.id]);

  const actualSeparator = separator === "none" ? "" : separator;
  const preview = `${prefix}${actualSeparator}${String(nextNumber).padStart(Number(padLength), "0")}`;

  function handleReset() {
    setPrefix(EMP_NUMBER_DEFAULTS.prefix);
    setSeparator(EMP_NUMBER_DEFAULTS.separator);
    setPadLength(EMP_NUMBER_DEFAULTS.padLength);
    setRenumberExisting(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const format = { prefix, padLength: Number(padLength), separator: actualSeparator };

    if (renumberExisting) {
      const result = await retroactivelyRenumberEmployeesAction(tenant.id, format);
      setSaving(false);
      if (result.success) {
        toast.success(`${result.count} employee${result.count === 1 ? "" : "s"} renumbered`);
        setRenumberExisting(false);
      } else {
        toast.error(result.error ?? "Failed to renumber employees");
      }
      return;
    }

    const result = await updateEmployeeNumberConfigAction(tenant.id, format);
    setSaving(false);
    if (result.success) {
      toast.success("Employee number format saved");
    } else {
      toast.error(result.error ?? "Failed to save");
    }
  }

  return (
    <form onSubmit={handleSave}>
      <Card>
        <CardHeader>
          <CardTitle>Employee number format</CardTitle>
          <CardDescription>
            Define the prefix and format for employee numbers. Each new employee gets the next
            number automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="emp-prefix">Prefix</Label>
            <Input
              id="emp-prefix"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="e.g. EMP"
              maxLength={6}
              disabled={saving}
            />
            <p className="text-xs text-muted-foreground">1 to 6 uppercase letters</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="emp-separator">Separator</Label>
            <Select value={separator} onValueChange={setSeparator} disabled={saving}>
              <SelectTrigger id="emp-separator">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-">Hyphen (EMP-0001)</SelectItem>
                <SelectItem value="/">Slash (EMP/0001)</SelectItem>
                <SelectItem value="none">None (EMP0001)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="emp-pad">Number digits</Label>
            <Select value={padLength} onValueChange={setPadLength} disabled={saving}>
              <SelectTrigger id="emp-pad">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 digits (001)</SelectItem>
                <SelectItem value="4">4 digits (0001)</SelectItem>
                <SelectItem value="5">5 digits (00001)</SelectItem>
                <SelectItem value="6">6 digits (000001)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-3 rounded-lg bg-muted/50 px-4 py-3">
            <p className="text-xs text-muted-foreground mb-1">Next employee number preview</p>
            <p className="text-xl font-mono font-semibold tracking-wide">{preview}</p>
          </div>
          <div className="sm:col-span-3 flex items-start gap-3 rounded-lg border border-border px-4 py-3">
            <Checkbox
              id="renumber-existing"
              checked={renumberExisting}
              onCheckedChange={(v) => setRenumberExisting(v === true)}
              disabled={saving}
              className="mt-0.5"
            />
            <div className="space-y-0.5">
              <label
                htmlFor="renumber-existing"
                className="text-sm font-medium leading-none cursor-pointer select-none"
              >
                Apply new format to existing employees
              </label>
              <p className="text-xs text-muted-foreground">
                Renumbers all employees in hire-date order using the format above. Existing numbers
                will be overwritten.
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={handleReset} disabled={saving}>
            Reset to defaults
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save format"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
