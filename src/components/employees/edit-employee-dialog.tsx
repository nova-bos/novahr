"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label, OptionalTag } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  validateEditEmployeeProfile,
  validateEditEmployeeCompensation,
} from "@/lib/schemas/employee";
import { useApp } from "@/lib/store/app-provider";
import { useDepartments, useEmployees, useTenantId } from "@/lib/store/hooks";
import { getPayrollSettingsAction } from "@/lib/settings/actions";
import type {
  Employee,
  EmployerBenefit,
  EmploymentStatus,
  EmploymentType,
  Gender,
  MaritalStatus,
} from "@/lib/types";

const EMPLOYMENT_TYPES: { value: EmploymentType; label: string }[] = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
];

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const MARITAL_OPTIONS: { value: MaritalStatus; label: string }[] = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
  { value: "life_partner", label: "Life partner" },
];

const STATUSES: { value: EmploymentStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "on_leave", label: "On leave" },
  { value: "probation", label: "Onboarding" },
  { value: "terminated", label: "Terminated" },
];

interface EditEmployeeDialogProps {
  employee: Employee;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditEmployeeDialog({ employee, open, onOpenChange }: EditEmployeeDialogProps) {
  const { updateEmployee } = useApp();
  const departments = useDepartments();
  const allEmployees = useEmployees();
  const tenantId = useTenantId();
  const [saving, setSaving] = React.useState(false);

  const managerOptions = allEmployees.filter(
    (e) => e.id !== employee.id && e.status !== "terminated"
  );

  const [form, setForm] = React.useState(() => buildFormState(employee));
  const [offersPension, setOffersPension] = React.useState(false);
  const [offersMedicalAid, setOffersMedicalAid] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    getPayrollSettingsAction(tenantId)
      .then((s) => {
        if (!active) return;
        setOffersPension(s.offersPension);
        setOffersMedicalAid(s.offersMedicalAid);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [tenantId]);

  React.useEffect(() => {
    if (open) {
      setForm(buildFormState(employee));
    }
  }, [open, employee]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const profileErrors = validateEditEmployeeProfile({
      email: form.email,
      phone: form.phone,
      emergencyPhone: form.emergencyContactSameAsNextOfKin ? "" : form.emergencyPhone,
      nextOfKinPhone: form.nextOfKinPhone,
    });
    const compensationErrors = validateEditEmployeeCompensation({ annualGross: form.annualGross });
    const allErrors = { ...profileErrors, ...compensationErrors };
    if (Object.keys(allErrors).length > 0) {
      const first = Object.values(allErrors)[0];
      toast.error("Please fix the following", { description: first });
      return;
    }

    setSaving(true);
    try {
      const sameAsNok = form.emergencyContactSameAsNextOfKin;
      await updateEmployee(employee.id, {
        firstName: form.firstName,
        lastName: form.lastName,
        preferredName: form.preferredName || undefined,
        idNumber: form.idNumber,
        passportNumber: form.passportNumber || undefined,
        nationality: form.nationality || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: (form.gender || undefined) as Gender | undefined,
        maritalStatus: (form.maritalStatus || undefined) as MaritalStatus | undefined,
        taxNumber: form.taxNumber,
        startDate: form.startDate,
        managerId: form.managerId || undefined,
        jobTitle: form.jobTitle,
        department: form.department,
        employmentType: form.employmentType,
        status: form.status,
        location: form.location,
        email: form.email,
        phone: form.phone,
        address: form.address,
        salary: {
          ...employee.salary,
          annualGross: Number(form.annualGross) || 0,
          travelAllowance: form.travelAllowance ? Number(form.travelAllowance) : undefined,
          housingAllowance: form.housingAllowance ? Number(form.housingAllowance) : undefined,
          pensionContributionPct: form.pensionContributionPct
            ? Number(form.pensionContributionPct) / 100
            : undefined,
          medicalAid: form.medicalAid ? Number(form.medicalAid) : undefined,
          retirementAnnuity: form.retirementAnnuity ? Number(form.retirementAnnuity) : undefined,
          wageType: form.wageType,
          hourlyRate: form.wageType === "hourly" && form.hourlyRate ? Number(form.hourlyRate) : undefined,
          dailyRate: form.wageType === "daily" && form.dailyRate ? Number(form.dailyRate) : undefined,
          weeklyRate: form.wageType === "weekly" && form.weeklyRate ? Number(form.weeklyRate) : undefined,
          employerBenefits: form.employerBenefits
            .map((b): EmployerBenefit => ({
              label: b.label.trim(),
              amount: Number(b.amount) || 0,
              taxable: b.taxable,
            }))
            .filter((b) => b.label !== "" && b.amount > 0),
        },
        nextOfKin: hasNextOfKin(form)
          ? {
              name: form.nextOfKinName,
              relationship: form.nextOfKinRelationship,
              phone: form.nextOfKinPhone,
              address: form.nextOfKinAddress,
            }
          : undefined,
        emergencyContactSameAsNextOfKin: sameAsNok,
        // When the emergency contact mirrors the next of kin, send the
        // next-of-kin values so the stored emergency-contact columns stay in
        // sync (the server also mirrors them defensively).
        emergencyContact: sameAsNok
          ? {
              name: form.nextOfKinName,
              relationship: form.nextOfKinRelationship,
              phone: form.nextOfKinPhone,
            }
          : {
              name: form.emergencyName,
              relationship: form.emergencyRelationship,
              phone: form.emergencyPhone,
            },
      });

      toast.success("Employee profile updated", {
        description: `${employee.firstName} ${employee.lastName}'s details have been saved.`,
      });
      onOpenChange(false);
    } catch {
      toast.error("Couldn't update employee profile", {
        description: "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  function addBenefit() {
    setForm((f) => ({
      ...f,
      employerBenefits: [...f.employerBenefits, { label: "", amount: "", taxable: true }],
    }));
  }

  function updateBenefit(index: number, patch: Partial<{ label: string; amount: string; taxable: boolean }>) {
    setForm((f) => ({
      ...f,
      employerBenefits: f.employerBenefits.map((b, i) => (i === index ? { ...b, ...patch } : b)),
    }));
  }

  function removeBenefit(index: number) {
    setForm((f) => ({
      ...f,
      employerBenefits: f.employerBenefits.filter((_, i) => i !== index),
    }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              Edit {employee.firstName} {employee.lastName}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="profile" className="mt-4">
            <TabsList className="w-full">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="compensation">Compensation</TabsTrigger>
              <TabsTrigger value="emergency">Contacts</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-4 space-y-6">
              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Personal</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName">First name</Label>
                    <Input
                      id="firstName"
                      value={form.firstName}
                      onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input
                      id="lastName"
                      value={form.lastName}
                      onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="preferredName">Preferred name <OptionalTag /></Label>
                    <Input
                      id="preferredName"
                      value={form.preferredName}
                      onChange={(e) => setForm((f) => ({ ...f, preferredName: e.target.value }))}
                      placeholder="e.g. nickname or goes-by name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    />
                  </div>
                  {form.idType === "passport" ? (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="passportNumber">Passport number</Label>
                        <Input
                          id="passportNumber"
                          value={form.passportNumber}
                          onChange={(e) => setForm((f) => ({ ...f, passportNumber: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="nationality">Nationality</Label>
                        <Input
                          id="nationality"
                          value={form.nationality}
                          onChange={(e) => setForm((f) => ({ ...f, nationality: e.target.value }))}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-1.5">
                      <Label htmlFor="idNumber">SA ID number</Label>
                      <Input
                        id="idNumber"
                        value={form.idNumber}
                        onChange={(e) => setForm((f) => ({ ...f, idNumber: e.target.value }))}
                      />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor="taxNumber">Tax number <OptionalTag /></Label>
                    <Input
                      id="taxNumber"
                      value={form.taxNumber}
                      onChange={(e) => setForm((f) => ({ ...f, taxNumber: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dateOfBirth">
                      Date of birth {form.idType === "sa_id" ? null : <OptionalTag />}
                    </Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={form.dateOfBirth}
                      readOnly={form.idType === "sa_id"}
                      disabled={form.idType === "sa_id"}
                      onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
                    />
                    {form.idType === "sa_id" ? (
                      <p className="text-xs text-muted-foreground">Derived from the ID number.</p>
                    ) : null}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="gender">Gender {form.idType === "sa_id" ? null : <OptionalTag />}</Label>
                    <Select
                      value={form.gender || undefined}
                      disabled={form.idType === "sa_id"}
                      onValueChange={(value) => setForm((f) => ({ ...f, gender: value as Gender }))}
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
                    {form.idType === "sa_id" ? (
                      <p className="text-xs text-muted-foreground">Derived from the ID number.</p>
                    ) : null}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="maritalStatus">Marital status <OptionalTag /></Label>
                    <Select
                      value={form.maritalStatus || undefined}
                      onValueChange={(value) =>
                        setForm((f) => ({ ...f, maritalStatus: value as MaritalStatus }))
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
                    <Label htmlFor="address">Residential address <OptionalTag /></Label>
                    <Input
                      id="address"
                      value={form.address}
                      onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Employment</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="jobTitle">Job title</Label>
                    <Input
                      id="jobTitle"
                      value={form.jobTitle}
                      onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="startDate">Start date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="department">Department <OptionalTag /></Label>
                    <Select
                      value={form.department || "none"}
                      onValueChange={(value) => setForm((f) => ({ ...f, department: value === "none" ? "" : value }))}
                    >
                      <SelectTrigger id="department" className="w-full">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No department</SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.name}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="employmentType">Employment type</Label>
                    <Select
                      value={form.employmentType}
                      onValueChange={(value) =>
                        setForm((f) => ({ ...f, employmentType: value as EmploymentType }))
                      }
                    >
                      <SelectTrigger id="employmentType" className="w-full">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {EMPLOYMENT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={form.status}
                      onValueChange={(value) =>
                        setForm((f) => ({ ...f, status: value as EmploymentStatus }))
                      }
                    >
                      <SelectTrigger id="status" className="w-full">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="location">Location <OptionalTag /></Label>
                    <Input
                      id="location"
                      value={form.location}
                      onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="managerId">Reports to <OptionalTag /></Label>
                    <Select
                      value={form.managerId || "none"}
                      onValueChange={(value) => setForm((f) => ({ ...f, managerId: value === "none" ? "" : value }))}
                    >
                      <SelectTrigger id="managerId" className="w-full">
                        <SelectValue placeholder="Select manager" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No manager</SelectItem>
                        {managerOptions.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.firstName} {emp.lastName}{emp.jobTitle ? `, ${emp.jobTitle}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="compensation" className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="annualGross">Annual gross salary (R)</Label>
                  <Input
                    id="annualGross"
                    type="number"
                    min={0}
                    value={form.annualGross}
                    onChange={(e) => setForm((f) => ({ ...f, annualGross: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wageType">Wage basis</Label>
                  <Select
                    value={form.wageType}
                    onValueChange={(value) =>
                      setForm((f) => ({ ...f, wageType: value as typeof f.wageType }))
                    }
                  >
                    <SelectTrigger id="wageType" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="salaried">Salaried (monthly)</SelectItem>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.wageType === "hourly" ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="hourlyRate">Hourly rate (R / hour)</Label>
                    <Input
                      id="hourlyRate"
                      type="number"
                      min={0}
                      value={form.hourlyRate}
                      onChange={(e) => setForm((f) => ({ ...f, hourlyRate: e.target.value }))}
                    />
                  </div>
                ) : null}
                {form.wageType === "daily" ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="dailyRate">Daily rate (R / day)</Label>
                    <Input
                      id="dailyRate"
                      type="number"
                      min={0}
                      value={form.dailyRate}
                      onChange={(e) => setForm((f) => ({ ...f, dailyRate: e.target.value }))}
                    />
                  </div>
                ) : null}
                {form.wageType === "weekly" ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="weeklyRate">Weekly rate (R / week)</Label>
                    <Input
                      id="weeklyRate"
                      type="number"
                      min={0}
                      value={form.weeklyRate}
                      onChange={(e) => setForm((f) => ({ ...f, weeklyRate: e.target.value }))}
                    />
                  </div>
                ) : null}
                {offersPension ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="pensionContributionPct">Pension / provident contribution (%) <OptionalTag /></Label>
                    <Input
                      id="pensionContributionPct"
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={form.pensionContributionPct}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, pensionContributionPct: e.target.value }))
                      }
                    />
                  </div>
                ) : null}
                <div className="space-y-1.5">
                  <Label htmlFor="retirementAnnuity">Retirement annuity (R / month) <OptionalTag /></Label>
                  <Input
                    id="retirementAnnuity"
                    type="number"
                    min={0}
                    value={form.retirementAnnuity}
                    onChange={(e) => setForm((f) => ({ ...f, retirementAnnuity: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="travelAllowance">Travel allowance (R / month) <OptionalTag /></Label>
                  <Input
                    id="travelAllowance"
                    type="number"
                    min={0}
                    value={form.travelAllowance}
                    onChange={(e) => setForm((f) => ({ ...f, travelAllowance: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="housingAllowance">Housing allowance (R / month)</Label>
                  <Input
                    id="housingAllowance"
                    type="number"
                    min={0}
                    value={form.housingAllowance}
                    onChange={(e) => setForm((f) => ({ ...f, housingAllowance: e.target.value }))}
                  />
                </div>
                {offersMedicalAid ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="medicalAid">Medical aid (R / month)</Label>
                    <Input
                      id="medicalAid"
                      type="number"
                      min={0}
                      value={form.medicalAid}
                      onChange={(e) => setForm((f) => ({ ...f, medicalAid: e.target.value }))}
                    />
                  </div>
                ) : null}
              </div>

              <div className="space-y-2 border-t border-border pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Label>Employer-paid benefits <OptionalTag /></Label>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Employer-funded benefits, such as an income protection policy. Mark a benefit taxable to include it as a fringe benefit in the PAYE, SDL and UIF calculation.
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addBenefit}>
                    <Plus /> Add benefit
                  </Button>
                </div>

                {form.employerBenefits.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No employer benefits added.</p>
                ) : (
                  <div className="space-y-2">
                    {form.employerBenefits.map((b, i) => (
                      <div key={i} className="flex items-end gap-2">
                        <div className="flex-1 space-y-1">
                          {i === 0 ? <Label className="text-xs">Description</Label> : null}
                          <Input
                            aria-label="Benefit description"
                            placeholder="e.g. Income protection policy"
                            value={b.label}
                            onChange={(e) => updateBenefit(i, { label: e.target.value })}
                          />
                        </div>
                        <div className="w-28 space-y-1">
                          {i === 0 ? <Label className="text-xs">R / month</Label> : null}
                          <Input
                            aria-label="Benefit amount per month"
                            type="number"
                            min={0}
                            value={b.amount}
                            onChange={(e) => updateBenefit(i, { amount: e.target.value })}
                          />
                        </div>
                        <label className="flex items-center gap-1.5 whitespace-nowrap pb-2.5 text-xs">
                          <Checkbox
                            checked={b.taxable}
                            onCheckedChange={(v) => updateBenefit(i, { taxable: v === true })}
                          />
                          Taxable
                        </label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="mb-1"
                          aria-label="Remove benefit"
                          onClick={() => removeBenefit(i)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="emergency" className="mt-4 space-y-6">
              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Next of kin
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="nextOfKinName">Full name <OptionalTag /></Label>
                    <Input
                      id="nextOfKinName"
                      value={form.nextOfKinName}
                      onChange={(e) => setForm((f) => ({ ...f, nextOfKinName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="nextOfKinRelationship">Relationship <OptionalTag /></Label>
                    <Input
                      id="nextOfKinRelationship"
                      value={form.nextOfKinRelationship}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, nextOfKinRelationship: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="nextOfKinPhone">Phone <OptionalTag /></Label>
                    <Input
                      id="nextOfKinPhone"
                      value={form.nextOfKinPhone}
                      onChange={(e) => setForm((f) => ({ ...f, nextOfKinPhone: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="nextOfKinAddress">Address <OptionalTag /></Label>
                    <Input
                      id="nextOfKinAddress"
                      value={form.nextOfKinAddress}
                      onChange={(e) => setForm((f) => ({ ...f, nextOfKinAddress: e.target.value }))}
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
              </div>

              {!form.emergencyContactSameAsNextOfKin ? (
                <div className="space-y-3 border-t border-border pt-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Emergency contact
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="emergencyName">Full name</Label>
                      <Input
                        id="emergencyName"
                        value={form.emergencyName}
                        onChange={(e) => setForm((f) => ({ ...f, emergencyName: e.target.value }))}
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
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="emergencyPhone">Phone</Label>
                      <Input
                        id="emergencyPhone"
                        value={form.emergencyPhone}
                        onChange={(e) => setForm((f) => ({ ...f, emergencyPhone: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              ) : null}
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function buildFormState(employee: Employee) {
  return {
    firstName: employee.firstName,
    lastName: employee.lastName,
    preferredName: employee.preferredName ?? "",
    idType: employee.idType ?? "sa_id",
    idNumber: employee.idNumber,
    passportNumber: employee.passportNumber ?? "",
    nationality: employee.nationality ?? "",
    dateOfBirth: employee.dateOfBirth ? employee.dateOfBirth.slice(0, 10) : "",
    gender: employee.gender ?? "",
    maritalStatus: employee.maritalStatus ?? "",
    taxNumber: employee.taxNumber,
    startDate: employee.startDate.slice(0, 10),
    managerId: employee.managerId ?? "",
    jobTitle: employee.jobTitle,
    department: employee.department,
    employmentType: employee.employmentType,
    status: employee.status,
    location: employee.location,
    email: employee.email,
    phone: employee.phone,
    address: employee.address,
    annualGross: String(employee.salary.annualGross),
    travelAllowance: employee.salary.travelAllowance ? String(employee.salary.travelAllowance) : "",
    housingAllowance: employee.salary.housingAllowance
      ? String(employee.salary.housingAllowance)
      : "",
    pensionContributionPct: employee.salary.pensionContributionPct
      ? String(employee.salary.pensionContributionPct * 100)
      : "",
    medicalAid: employee.salary.medicalAid ? String(employee.salary.medicalAid) : "",
    retirementAnnuity: employee.salary.retirementAnnuity
      ? String(employee.salary.retirementAnnuity)
      : "",
    wageType: employee.salary.wageType ?? "salaried",
    hourlyRate: employee.salary.hourlyRate ? String(employee.salary.hourlyRate) : "",
    dailyRate: employee.salary.dailyRate ? String(employee.salary.dailyRate) : "",
    weeklyRate: employee.salary.weeklyRate ? String(employee.salary.weeklyRate) : "",
    employerBenefits: (employee.salary.employerBenefits ?? []).map((b) => ({
      label: b.label,
      amount: String(b.amount),
      taxable: b.taxable,
    })),
    nextOfKinName: employee.nextOfKin?.name ?? "",
    nextOfKinRelationship: employee.nextOfKin?.relationship ?? "",
    nextOfKinPhone: employee.nextOfKin?.phone ?? "",
    nextOfKinAddress: employee.nextOfKin?.address ?? "",
    emergencyContactSameAsNextOfKin: employee.emergencyContactSameAsNextOfKin ?? false,
    emergencyName: employee.emergencyContact.name,
    emergencyRelationship: employee.emergencyContact.relationship,
    emergencyPhone: employee.emergencyContact.phone,
  };
}

function hasNextOfKin(form: ReturnType<typeof buildFormState>): boolean {
  return Boolean(
    form.nextOfKinName.trim() ||
      form.nextOfKinRelationship.trim() ||
      form.nextOfKinPhone.trim() ||
      form.nextOfKinAddress.trim()
  );
}
