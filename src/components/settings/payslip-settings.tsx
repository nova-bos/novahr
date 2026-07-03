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
import { Switch } from "@/components/ui/switch";
import { useCurrentTenant } from "@/lib/store/hooks";
import {
  getPayslipSettingsAction,
  updatePayslipSettingsAction,
} from "@/lib/settings/actions";
import { cn } from "@/lib/utils";

const TEMPLATES = [
  {
    id: "classic",
    name: "Classic",
    description: "Clean black-and-white layout with bold header line.",
  },
  {
    id: "modern",
    name: "Modern",
    description: "Coloured header band with accent-tinted table rows.",
  },
  {
    id: "corporate",
    name: "Corporate",
    description: "Formal two-column header with PAYE reference and strong borders.",
  },
  {
    id: "branded",
    name: "Branded",
    description: "Large gradient header with centred logo and company name.",
  },
];

export function PayslipSettings() {
  const tenant = useCurrentTenant();
  const [template, setTemplate] = React.useState("classic");
  const [showBanking, setShowBanking] = React.useState(false);
  const [showYtd, setShowYtd] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    getPayslipSettingsAction(tenant.id).then((s) => {
      setTemplate(s.template);
      setShowBanking(s.showBanking);
      setShowYtd(s.showYtd);
    });
  }, [tenant.id]);

  async function handleTemplateChange(id: string) {
    setTemplate(id);
    const result = await updatePayslipSettingsAction(tenant.id, { template: id });
    if (!result.success) toast.error(result.error ?? "Failed to save template");
    else toast.success("Template saved");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = await updatePayslipSettingsAction(tenant.id, { showBanking, showYtd });
    setSaving(false);
    if (result.success) toast.success("Payslip settings saved");
    else toast.error(result.error ?? "Failed to save");
  }

  return (
    <form onSubmit={handleSave}>
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Payslip template</CardTitle>
            <CardDescription>
              Choose the layout style for generated payslips.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleTemplateChange(t.id)}
                  className={cn(
                    "rounded-lg border p-4 text-left transition-all",
                    template === t.id
                      ? "border-primary ring-2 ring-primary/20 bg-primary/[0.03]"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payslip options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Show year-to-date column</p>
                <p className="text-xs text-muted-foreground">Adds a YTD column to earnings and deductions tables.</p>
              </div>
              <Switch checked={showYtd} onCheckedChange={setShowYtd} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Show employee banking details</p>
                <p className="text-xs text-muted-foreground">Includes the employee bank name and masked account number.</p>
              </div>
              <Switch checked={showBanking} onCheckedChange={setShowBanking} />
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save settings"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </form>
  );
}
