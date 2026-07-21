"use client";

import * as React from "react";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label, OptionalTag } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { validateCompanyProfile } from "@/lib/schemas/tenant";
import { uploadPayslipLogoAction, deletePayslipLogoAction } from "@/lib/settings/actions";
import { useApp } from "@/lib/store/app-provider";
import { useCurrentTenant } from "@/lib/store/hooks";

export function CompanySettings() {
  const tenant = useCurrentTenant();
  const { updateTenantProfile, patchTenantLogo } = useApp();

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

  const [logoUrl, setLogoUrl] = React.useState<string | null>(tenant.logoUrl ?? null);
  const [uploadingLogo, setUploadingLogo] = React.useState(false);
  const logoInputRef = React.useRef<HTMLInputElement>(null);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const result = await uploadPayslipLogoAction(fd);
      if (!result.success) throw new Error(result.error);
      setLogoUrl(result.url ?? null);
      patchTenantLogo(result.url ?? null);
      toast.success("Logo uploaded");
    } catch (err) {
      toast.error("Logo upload failed", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  }

  async function handleRemoveLogo() {
    setLogoUrl(null);
    const result = await deletePayslipLogoAction();
    if (result.success) {
      patchTenantLogo(null);
      toast.success("Logo removed");
    } else {
      toast.error("Could not remove logo", { description: result.error });
    }
  }

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

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Company logo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="Company logo"
                className="h-12 w-24 shrink-0 object-contain rounded-lg border border-border bg-muted/40 p-1"
              />
            ) : (
              <div className="flex h-12 w-24 shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 text-xs text-muted-foreground">
                No logo
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap gap-2">
                <Label htmlFor="company-logo-upload" className="cursor-pointer">
                  <Button type="button" variant="outline" size="sm" asChild disabled={uploadingLogo}>
                    <span>
                      {uploadingLogo ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Upload className="size-3.5" />
                      )}
                      {uploadingLogo ? "Uploading..." : logoUrl ? "Replace logo" : "Upload logo"}
                    </span>
                  </Button>
                </Label>
                {logoUrl && (
                  <Button type="button" variant="ghost" size="sm" onClick={handleRemoveLogo} disabled={uploadingLogo}>
                    <X className="size-3.5" />
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">PNG, JPG or SVG up to 2 MB. Used across the app and on payslips.</p>
            </div>
          </div>
          <input
            ref={logoInputRef}
            id="company-logo-upload"
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            className="sr-only"
            onChange={handleLogoUpload}
            disabled={uploadingLogo}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Company profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Company name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Nova Technologies" disabled={saving} />
            {errors.name ? <p className="text-xs text-destructive">{errors.name}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="legalName">Legal name</Label>
            <Input id="legalName" value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="e.g. Nova Technologies (Pty) Ltd" disabled={saving} />
            {errors.legalName ? <p className="text-xs text-destructive">{errors.legalName}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="industry">Industry</Label>
            <Input id="industry" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Information Technology" disabled={saving} />
            {errors.industry ? <p className="text-xs text-destructive">{errors.industry}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="founded">Founded <OptionalTag /></Label>
            <Input id="founded" value={founded} onChange={(e) => setFounded(e.target.value)} placeholder="e.g. 2018" disabled={saving} />
            {errors.founded ? <p className="text-xs text-destructive">{errors.founded}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="registrationNumber">Registration number <OptionalTag /></Label>
            <Input
              id="registrationNumber"
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              placeholder="e.g. 2026/123456/07"
              disabled={saving}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vatNumber">VAT number <OptionalTag /></Label>
            <Input id="vatNumber" value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} placeholder="e.g. 4123456789" disabled={saving} />
            {errors.vatNumber ? <p className="text-xs text-destructive">{errors.vatNumber}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="city">City <OptionalTag /></Label>
            <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Johannesburg" disabled={saving} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="primaryContact">Primary contact</Label>
            <Input
              id="primaryContact"
              value={primaryContact}
              onChange={(e) => setPrimaryContact(e.target.value)}
              placeholder="e.g. Lerato Dlamini"
              disabled={saving}
            />
            {errors.primaryContact ? <p className="text-xs text-destructive">{errors.primaryContact}</p> : null}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="address">Registered address <OptionalTag /></Label>
            <Textarea id="address" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. 12 Rivonia Road, Sandton, 2196" disabled={saving} />
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
        </CardFooter>
      </Card>
    </form>
  );
}
