"use client";

import * as React from "react";
import { toast } from "sonner";
import { createBrowserClient } from "@supabase/ssr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { validateCompanyProfile } from "@/lib/schemas/tenant";
import { useApp } from "@/lib/store/app-provider";
import { useCurrentTenant } from "@/lib/store/hooks";
import { getPayslipSettingsAction, updatePayslipSettingsAction } from "@/lib/settings/actions";

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export function CompanySettings() {
  const tenant = useCurrentTenant();
  const { updateTenantProfile } = useApp();

  const [logoUrl, setLogoUrl] = React.useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = React.useState(false);

  React.useEffect(() => {
    getPayslipSettingsAction(tenant.id).then((s) => setLogoUrl(s.logoUrl));
  }, [tenant.id]);

  const [name, setName] = React.useState(tenant.name);
  const [legalName, setLegalName] = React.useState(tenant.legalName);
  const [industry, setIndustry] = React.useState(tenant.industry);
  const [founded, setFounded] = React.useState(tenant.founded);
  const [registrationNumber, setRegistrationNumber] = React.useState(tenant.registrationNumber);
  const [vatNumber, setVatNumber] = React.useState(tenant.vatNumber);
  const [city, setCity] = React.useState(tenant.city);
  const [address, setAddress] = React.useState(tenant.address);
  const [primaryContact, setPrimaryContact] = React.useState(tenant.primaryContact);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    const fieldErrors = validateCompanyProfile({
      name, legalName, industry, founded, registrationNumber, vatNumber, city, address, primaryContact,
    });
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await updateTenantProfile({ name, legalName, industry, founded, registrationNumber, vatNumber, city, address, primaryContact });
      toast.success("Company profile updated", {
        description: `${name}'s workspace details have been saved.`,
      });
    } catch {
      toast.error("Couldn't save changes", { description: "Please try again." });
    } finally {
      setSaving(false);
    }
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

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Company logo</CardTitle>
          <CardDescription>Used on payslips and documents. PNG, JPG or SVG, max 2 MB.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          {logoUrl ? (
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt="Company logo"
                className="h-10 w-20 object-contain rounded border border-border"
              />
              <Button type="button" variant="outline" size="sm" onClick={handleRemoveLogo}>
                Remove
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

      <Card>
        <CardHeader>
          <CardTitle>Company profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Company name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={saving} />
            {errors.name ? <p className="text-xs text-destructive">{errors.name}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="legalName">Legal name</Label>
            <Input id="legalName" value={legalName} onChange={(e) => setLegalName(e.target.value)} disabled={saving} />
            {errors.legalName ? <p className="text-xs text-destructive">{errors.legalName}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="industry">Industry</Label>
            <Input id="industry" value={industry} onChange={(e) => setIndustry(e.target.value)} disabled={saving} />
            {errors.industry ? <p className="text-xs text-destructive">{errors.industry}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="founded">Founded</Label>
            <Input id="founded" value={founded} onChange={(e) => setFounded(e.target.value)} disabled={saving} />
            {errors.founded ? <p className="text-xs text-destructive">{errors.founded}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="registrationNumber">Registration number</Label>
            <Input
              id="registrationNumber"
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vatNumber">VAT number</Label>
            <Input id="vatNumber" value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} disabled={saving} />
            {errors.vatNumber ? <p className="text-xs text-destructive">{errors.vatNumber}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="city">City</Label>
            <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} disabled={saving} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="primaryContact">Primary contact</Label>
            <Input
              id="primaryContact"
              value={primaryContact}
              onChange={(e) => setPrimaryContact(e.target.value)}
              disabled={saving}
            />
            {errors.primaryContact ? <p className="text-xs text-destructive">{errors.primaryContact}</p> : null}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="address">Registered address</Label>
            <Textarea id="address" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} disabled={saving} />
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
        </CardFooter>
      </Card>
    </form>
  );
}
