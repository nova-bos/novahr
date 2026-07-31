import * as React from "react";
import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label, OptionalTag } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { dobFromSaId, genderFromSaId } from "@/lib/schemas/sa-id";
import { saIdNumber } from "@/lib/schemas/sa";
import { formatDate } from "@/lib/format";
import { listCustomFieldDefinitionsAction } from "@/lib/custom-fields/actions";
import type { TenantCustomFieldDefinition } from "@/lib/types";
import type { FieldErrors } from "@/lib/schemas/employee";
import type { NewEmployeeForm, QualificationRow } from "./types";

interface StepProps {
  form: NewEmployeeForm;
  setForm: React.Dispatch<React.SetStateAction<NewEmployeeForm>>;
  errors: FieldErrors;
}

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
] as const;

const MARITAL_OPTIONS = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
  { value: "life_partner", label: "Life partner" },
] as const;

const QUALIFICATION_TYPES = [
  { value: "degree", label: "Degree" },
  { value: "diploma", label: "Diploma" },
  { value: "certificate", label: "Certificate" },
  { value: "licence", label: "Licence" },
] as const;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

function SegmentedControl({
  value,
  onChange,
}: {
  value: "sa_id" | "passport";
  onChange: (v: "sa_id" | "passport") => void;
}) {
  const options: { value: "sa_id" | "passport"; label: string }[] = [
    { value: "sa_id", label: "SA ID number" },
    { value: "passport", label: "Passport" },
  ];
  return (
    <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            value === opt.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/** Add/remove chip list, reused for skills and languages. */
function ChipList({
  label,
  placeholder,
  values,
  onChange,
}: {
  label: string;
  placeholder: string;
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = React.useState("");
  function add() {
    const v = draft.trim();
    if (!v || values.includes(v)) {
      setDraft("");
      return;
    }
    onChange([...values, v]);
    setDraft("");
  }
  return (
    <div className="space-y-1.5">
      <Label>
        {label} <OptionalTag />
      </Label>
      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={add}>
          Add
        </Button>
      </div>
      {values.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {values.map((v) => (
            <Badge key={v} variant="secondary" className="gap-1 font-normal">
              {v}
              <button
                type="button"
                aria-label={`Remove ${v}`}
                onClick={() => onChange(values.filter((x) => x !== v))}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Renders the tenant's active custom-field definitions as inputs, writing into
 * form.customFields. Renders nothing when the tenant has no custom fields.
 */
function CustomFieldsCard({
  form,
  setForm,
}: {
  form: NewEmployeeForm;
  setForm: React.Dispatch<React.SetStateAction<NewEmployeeForm>>;
}) {
  const [definitions, setDefinitions] = React.useState<TenantCustomFieldDefinition[] | null>(null);

  React.useEffect(() => {
    let active = true;
    listCustomFieldDefinitionsAction()
      .then((defs) => {
        if (active) setDefinitions(defs.filter((d) => d.isActive));
      })
      .catch(() => {
        if (active) setDefinitions([]);
      });
    return () => {
      active = false;
    };
  }, []);

  function valueFor(definitionId: string): string {
    return form.customFields.find((f) => f.definitionId === definitionId)?.value ?? "";
  }

  function setValue(definitionId: string, value: string) {
    setForm((f) => {
      const others = f.customFields.filter((x) => x.definitionId !== definitionId);
      return { ...f, customFields: [...others, { definitionId, value }] };
    });
  }

  if (!definitions || definitions.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Additional information <OptionalTag />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          {definitions.map((d) => (
            <div key={d.id} className="space-y-1.5">
              <Label htmlFor={`cf-${d.id}`}>{d.label}</Label>
              {d.fieldType === "select" ? (
                <Select value={valueFor(d.id) || undefined} onValueChange={(v) => setValue(d.id, v)}>
                  <SelectTrigger id={`cf-${d.id}`} className="w-full">
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent>
                    {(d.options ?? []).map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id={`cf-${d.id}`}
                  type={
                    d.fieldType === "number" ? "number" : d.fieldType === "date" ? "date" : "text"
                  }
                  value={valueFor(d.id)}
                  onChange={(e) => setValue(d.id, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function StepPersonal({ form, setForm, errors }: StepProps) {
  const idValid = form.idType === "sa_id" && saIdNumber.safeParse(form.idNumber.trim()).success;
  const derivedDob = idValid ? dobFromSaId(form.idNumber.trim()) : null;
  const derivedGender = idValid ? genderFromSaId(form.idNumber.trim()) : null;

  // Keep the first-class gender in sync with a valid SA ID (still editable via
  // the passport path; for SA ID it is read-only and derived).
  React.useEffect(() => {
    if (derivedGender && form.gender !== derivedGender) {
      setForm((f) => ({ ...f, gender: derivedGender }));
    }
    if (derivedDob && form.dateOfBirth !== derivedDob) {
      setForm((f) => ({ ...f, dateOfBirth: derivedDob }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [derivedDob, derivedGender]);

  function addQualification() {
    setForm((f) => ({
      ...f,
      qualifications: [
        ...f.qualifications,
        { type: "degree", name: "", institution: "", yearCompleted: "", expiresAt: "" },
      ],
    }));
  }
  function updateQualification(index: number, patch: Partial<QualificationRow>) {
    setForm((f) => ({
      ...f,
      qualifications: f.qualifications.map((q, i) => (i === index ? { ...q, ...patch } : q)),
    }));
  }
  function removeQualification(index: number) {
    setForm((f) => ({
      ...f,
      qualifications: f.qualifications.filter((_, i) => i !== index),
    }));
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                placeholder="e.g. Thandiwe"
              />
              <FieldError message={errors.firstName} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                placeholder="e.g. Nkosi"
              />
              <FieldError message={errors.lastName} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="preferredName">
                Preferred name <OptionalTag />
              </Label>
              <Input
                id="preferredName"
                value={form.preferredName}
                onChange={(e) => setForm((f) => ({ ...f, preferredName: e.target.value }))}
                placeholder="e.g. Thandi"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="e.g. john.smith@company.co.za"
              />
              <FieldError message={errors.email} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="e.g. 076 123 4567"
              />
              <FieldError message={errors.phone} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="taxNumber">
                Tax number <OptionalTag />
              </Label>
              <Input
                id="taxNumber"
                value={form.taxNumber}
                onChange={(e) => setForm((f) => ({ ...f, taxNumber: e.target.value }))}
                placeholder="e.g. 9123456789"
              />
              <FieldError message={errors.taxNumber} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Identity and demographics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Identity document</Label>
            <div>
              <SegmentedControl
                value={form.idType}
                onChange={(idType) => setForm((f) => ({ ...f, idType }))}
              />
            </div>
          </div>

          {form.idType === "sa_id" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="idNumber">SA ID number</Label>
                <Input
                  id="idNumber"
                  value={form.idNumber}
                  onChange={(e) => setForm((f) => ({ ...f, idNumber: e.target.value }))}
                  placeholder="e.g. 9001015009087"
                  inputMode="numeric"
                />
                <FieldError message={errors.idNumber} />
              </div>
              <div className="space-y-1.5">
                <Label>Date of birth</Label>
                <Input readOnly value={derivedDob ? formatDate(derivedDob) : ""} placeholder="Derived from ID" />
                <p className="text-xs text-muted-foreground">Derived from the ID number.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <Input
                  readOnly
                  value={
                    derivedGender
                      ? derivedGender.charAt(0).toUpperCase() + derivedGender.slice(1)
                      : ""
                  }
                  placeholder="Derived from ID"
                />
                <p className="text-xs text-muted-foreground">Derived from the ID number.</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="passportNumber">Passport number</Label>
                <Input
                  id="passportNumber"
                  value={form.passportNumber}
                  onChange={(e) => setForm((f) => ({ ...f, passportNumber: e.target.value }))}
                  placeholder="e.g. A01234567"
                />
                <FieldError message={errors.passportNumber} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nationality">Nationality</Label>
                <Input
                  id="nationality"
                  value={form.nationality}
                  onChange={(e) => setForm((f) => ({ ...f, nationality: e.target.value }))}
                  placeholder="e.g. Zimbabwean"
                />
                <FieldError message={errors.nationality} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dateOfBirth">Date of birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
                />
                <FieldError message={errors.dateOfBirth} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gender">Gender</Label>
                <Select
                  value={form.gender || undefined}
                  onValueChange={(v) => setForm((f) => ({ ...f, gender: v as NewEmployeeForm["gender"] }))}
                >
                  <SelectTrigger id="gender" className="w-full">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDER_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.gender} />
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="maritalStatus">
                Marital status <OptionalTag />
              </Label>
              <Select
                value={form.maritalStatus || undefined}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, maritalStatus: v as NewEmployeeForm["maritalStatus"] }))
                }
              >
                <SelectTrigger id="maritalStatus" className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {MARITAL_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="address">
                Residential address <OptionalTag />
              </Label>
              <Textarea
                id="address"
                rows={2}
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="e.g. 12 Long Street, Cape Town, 8001"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Next of kin <OptionalTag />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nextOfKinName">Full name</Label>
              <Input
                id="nextOfKinName"
                value={form.nextOfKinName}
                onChange={(e) => setForm((f) => ({ ...f, nextOfKinName: e.target.value }))}
                placeholder="e.g. Nomsa Nkosi"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nextOfKinRelationship">Relationship</Label>
              <Input
                id="nextOfKinRelationship"
                value={form.nextOfKinRelationship}
                onChange={(e) => setForm((f) => ({ ...f, nextOfKinRelationship: e.target.value }))}
                placeholder="e.g. Spouse"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nextOfKinPhone">Phone number</Label>
              <Input
                id="nextOfKinPhone"
                value={form.nextOfKinPhone}
                onChange={(e) => setForm((f) => ({ ...f, nextOfKinPhone: e.target.value }))}
                placeholder="e.g. 082 345 6789"
              />
              <FieldError message={errors.nextOfKinPhone} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nextOfKinAddress">
                Address <OptionalTag />
              </Label>
              <Input
                id="nextOfKinAddress"
                value={form.nextOfKinAddress}
                onChange={(e) => setForm((f) => ({ ...f, nextOfKinAddress: e.target.value }))}
                placeholder="e.g. 12 Long Street, Cape Town"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={form.emergencyContactSameAsNextOfKin}
              onCheckedChange={(v) =>
                setForm((f) => ({ ...f, emergencyContactSameAsNextOfKin: v === true }))
              }
            />
            Next of kin is also the emergency contact
          </label>
        </CardContent>
      </Card>

      {!form.emergencyContactSameAsNextOfKin ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Emergency contact <OptionalTag />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="emergencyName">Full name</Label>
                <Input
                  id="emergencyName"
                  value={form.emergencyName}
                  onChange={(e) => setForm((f) => ({ ...f, emergencyName: e.target.value }))}
                  placeholder="e.g. Nomsa Nkosi"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emergencyRelationship">Relationship</Label>
                <Input
                  id="emergencyRelationship"
                  value={form.emergencyRelationship}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, emergencyRelationship: e.target.value }))
                  }
                  placeholder="e.g. Spouse"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emergencyPhone">Phone number</Label>
                <Input
                  id="emergencyPhone"
                  value={form.emergencyPhone}
                  onChange={(e) => setForm((f) => ({ ...f, emergencyPhone: e.target.value }))}
                  placeholder="e.g. 082 345 6789"
                />
                <FieldError message={errors.emergencyPhone} />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              Qualifications <OptionalTag />
            </CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addQualification}>
              <Plus /> Add qualification
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {form.qualifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No qualifications added. Use the button above to record a degree, diploma, certificate
              or licence.
            </p>
          ) : (
            <div className="space-y-3">
              {form.qualifications.map((q, i) => (
                <div
                  key={i}
                  className="grid items-end gap-3 rounded-lg border border-border p-3 sm:grid-cols-[8rem_1fr_1fr_5rem_9rem_auto]"
                >
                  <div className="space-y-1">
                    <Label className="text-xs">Type</Label>
                    <Select
                      value={q.type}
                      onValueChange={(v) => updateQualification(i, { type: v })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {QUALIFICATION_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={q.name}
                      placeholder="e.g. BCom Accounting"
                      onChange={(e) => updateQualification(i, { name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Institution</Label>
                    <Input
                      value={q.institution}
                      placeholder="e.g. UCT"
                      onChange={(e) => updateQualification(i, { institution: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Year</Label>
                    <Input
                      value={q.yearCompleted}
                      placeholder="2019"
                      inputMode="numeric"
                      onChange={(e) => updateQualification(i, { yearCompleted: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Expiry</Label>
                    <Input
                      type="date"
                      value={q.expiresAt}
                      aria-label="Qualification expiry date"
                      onChange={(e) => updateQualification(i, { expiresAt: e.target.value })}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove qualification"
                    onClick={() => removeQualification(i)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <ChipList
              label="Skills"
              placeholder="e.g. Payroll administration"
              values={form.skills}
              onChange={(skills) => setForm((f) => ({ ...f, skills }))}
            />
            <ChipList
              label="Languages"
              placeholder="e.g. isiZulu"
              values={form.languages}
              onChange={(languages) => setForm((f) => ({ ...f, languages }))}
            />
          </div>
        </CardContent>
      </Card>

      <CustomFieldsCard form={form} setForm={setForm} />
    </div>
  );
}
