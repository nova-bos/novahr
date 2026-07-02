"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { validateCompanyProfile } from "@/lib/schemas/tenant";
import { useApp } from "@/lib/store/app-provider";
import { useCurrentTenant } from "@/lib/store/hooks";

export function CompanySettings() {
  const tenant = useCurrentTenant();
  const { updateTenantProfile } = useApp();

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

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6">
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
