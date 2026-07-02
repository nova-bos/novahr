"use client";

import * as React from "react";
import { toast } from "sonner";
import { createBrowserClient } from "@supabase/ssr";
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
import { Textarea } from "@/components/ui/textarea";
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

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export function PayslipSettings() {
  const tenant = useCurrentTenant();
  const [template, setTemplate] = React.useState("classic");
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null);
  const [companyName, setCompanyName] = React.useState("");
  const [accentColor, setAccentColor] = React.useState("#6366f1");
  const [accentHex, setAccentHex] = React.useState("#6366f1");
  const [footerNote, setFooterNote] = React.useState("");
  const [showBanking, setShowBanking] = React.useState(false);
  const [showYtd, setShowYtd] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [uploadingLogo, setUploadingLogo] = React.useState(false);

  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    getPayslipSettingsAction(tenant.id).then((s) => {
      setTemplate(s.template);
      setLogoUrl(s.logoUrl);
      setCompanyName(s.companyName ?? "");
      setAccentColor(s.accentColor);
      setAccentHex(s.accentColor);
      setFooterNote(s.footerNote ?? "");
      setShowBanking(s.showBanking);
      setShowYtd(s.showYtd);
    });
  }, [tenant.id]);

  function handleColorChange(value: string) {
    setAccentColor(value);
    setAccentHex(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updatePayslipSettingsAction(tenant.id, { accentColor: value }).catch(() => {});
    }, 300);
  }

  function handleHexChange(value: string) {
    setAccentHex(value);
    if (/^#[0-9a-fA-F]{6}$/.test(value)) {
      setAccentColor(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updatePayslipSettingsAction(tenant.id, { accentColor: value }).catch(() => {});
      }, 300);
    }
  }

  async function handleTemplateChange(id: string) {
    setTemplate(id);
    const result = await updatePayslipSettingsAction(tenant.id, { template: id });
    if (!result.success) toast.error(result.error ?? "Failed to save template");
    else toast.success("Template saved");
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2 MB");
      return;
    }
    setUploadingLogo(true);
    try {
      const supabase = getSupabase();
      const ext = file.name.split(".").pop() ?? "png";
      const path = `${tenant.id}/logo.${ext}`;
      const { error } = await supabase.storage.from("payslip-assets").upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("payslip-assets").getPublicUrl(path);
      const url = data.publicUrl;
      setLogoUrl(url);
      const result = await updatePayslipSettingsAction(tenant.id, { logoUrl: url });
      if (!result.success) throw new Error(result.error);
      toast.success("Logo uploaded");
    } catch (err) {
      toast.error("Logo upload failed", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleRemoveLogo() {
    setLogoUrl(null);
    await updatePayslipSettingsAction(tenant.id, { logoUrl: null });
    toast.success("Logo removed");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = await updatePayslipSettingsAction(tenant.id, {
      companyName: companyName || null,
      footerNote: footerNote || null,
      showBanking,
      showYtd,
    });
    setSaving(false);
    if (result.success) toast.success("Payslip settings saved");
    else toast.error(result.error ?? "Failed to save");
  }

  return (
    <form onSubmit={handleSave}>
      <div className="flex flex-col gap-6">
        {/* Logo */}
        <Card>
          <CardHeader>
            <CardTitle>Company logo</CardTitle>
            <CardDescription>
              Shown on payslips. PNG, JPG or SVG, max 2 MB.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            {logoUrl ? (
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl}
                  alt="Payslip logo"
                  className="h-10 w-20 object-contain rounded border border-border"
                />
                <Button type="button" variant="outline" size="sm" onClick={handleRemoveLogo}>
                  Remove logo
                </Button>
              </div>
            ) : null}
            <div>
              <Label htmlFor="logo-upload" className="cursor-pointer">
                <Button type="button" variant="outline" size="sm" asChild disabled={uploadingLogo}>
                  <span>{uploadingLogo ? "Uploading..." : logoUrl ? "Replace logo" : "Upload logo"}</span>
                </Button>
              </Label>
              <input
                id="logo-upload"
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                className="sr-only"
                onChange={handleLogoUpload}
                disabled={uploadingLogo}
              />
            </div>
          </CardContent>
        </Card>

        {/* Template picker */}
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

        {/* Branding */}
        <Card>
          <CardHeader>
            <CardTitle>Branding</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="payslip-company-name">Company display name</Label>
              <Input
                id="payslip-company-name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Overrides the company name on payslips"
                disabled={saving}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payslip-accent">Accent colour</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  id="payslip-accent"
                  value={accentColor}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent p-0.5"
                />
                <Input
                  value={accentHex}
                  onChange={(e) => handleHexChange(e.target.value)}
                  placeholder="#6366f1"
                  maxLength={7}
                  className="font-mono w-28"
                  disabled={saving}
                />
              </div>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="footer-note">Footer note (optional)</Label>
              <Textarea
                id="footer-note"
                value={footerNote}
                onChange={(e) => setFooterNote(e.target.value)}
                rows={2}
                placeholder="Appears in the payslip footer, e.g. company registration or banking details"
                disabled={saving}
              />
            </div>
          </CardContent>
        </Card>

        {/* Options */}
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
