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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApp } from "@/lib/store/app-provider";
import { useDepartments } from "@/lib/store/hooks";
import type { Employee, EmploymentStatus, EmploymentType } from "@/lib/types";

const EMPLOYMENT_TYPES: { value: EmploymentType; label: string }[] = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
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

  const [form, setForm] = React.useState(() => buildFormState(employee));

  React.useEffect(() => {
    if (open) {
      setForm(buildFormState(employee));
    }
  }, [open, employee]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    try {
      await updateEmployee(employee.id, {
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
        },
        emergencyContact: {
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
    }
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
              <TabsTrigger value="emergency">Emergency contact</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-4 space-y-4">
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
                  <Label htmlFor="department">Department</Label>
                  <Select
                    value={form.department}
                    onValueChange={(value) => setForm((f) => ({ ...f, department: value }))}
                  >
                    <SelectTrigger id="department" className="w-full">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
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
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
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
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="address">Residential address</Label>
                  <Input
                    id="address"
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  />
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
                  <Label htmlFor="pensionContributionPct">Pension contribution (%)</Label>
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
                <div className="space-y-1.5">
                  <Label htmlFor="travelAllowance">Travel allowance (R / month)</Label>
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
              </div>
            </TabsContent>

            <TabsContent value="emergency" className="mt-4 space-y-4">
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
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function buildFormState(employee: Employee) {
  return {
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
    emergencyName: employee.emergencyContact.name,
    emergencyRelationship: employee.emergencyContact.relationship,
    emergencyPhone: employee.emergencyContact.phone,
  };
}
