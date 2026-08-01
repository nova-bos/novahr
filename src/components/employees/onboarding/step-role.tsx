import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label, OptionalTag } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FieldErrors } from "@/lib/schemas/employee";
import { useActiveBranches, useDepartments, useEmployees } from "@/lib/store/hooks";
import type { EmploymentType } from "@/lib/types";
import { EMPLOYMENT_TYPE_OPTIONS } from "@/lib/config/employee-options";
import type { NewEmployeeForm } from "./types";

interface StepProps {
  form: NewEmployeeForm;
  setForm: React.Dispatch<React.SetStateAction<NewEmployeeForm>>;
  errors: FieldErrors;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

export function StepRole({ form, setForm, errors }: StepProps) {
  const departments = useDepartments();
  const employees = useEmployees();
  const branches = useActiveBranches();

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Position</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="jobTitle">Job title</Label>
              <Input
                id="jobTitle"
                value={form.jobTitle}
                onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))}
                placeholder="e.g. Software Engineer"
              />
              <FieldError message={errors.jobTitle} />
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
              <FieldError message={errors.department} />
            </div>
            {branches.length > 0 ? (
              <div className="space-y-1.5">
                <Label htmlFor="branch">Branch <OptionalTag /></Label>
                <Select
                  value={form.branchId || "none"}
                  onValueChange={(value) =>
                    setForm((f) => ({ ...f, branchId: value === "none" ? "" : value }))
                  }
                >
                  <SelectTrigger id="branch" className="w-full">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Head office / whole company</SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
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
                  {EMPLOYMENT_TYPE_OPTIONS.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="startDate">Start date</Label>
              <DatePicker
                id="startDate"
                value={form.startDate}
                onValueChange={(v) => setForm((f) => ({ ...f, startDate: v }))}
                placeholder="Select start date"
                captionLayout="dropdown"
                fromYear={new Date().getFullYear() - 50}
                toYear={new Date().getFullYear() + 1}
              />
              <FieldError message={errors.startDate} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="location">Work location</Label>
              <Input
                id="location"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="e.g. Cape Town, HQ"
              />
              <FieldError message={errors.location} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reporting & onboarding support</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="managerId">Reports to <OptionalTag /></Label>
              <Select
                value={form.managerId || "none"}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, managerId: value === "none" ? "" : value }))
                }
              >
                <SelectTrigger id="managerId" className="w-full">
                  <SelectValue placeholder="Select manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No manager</SelectItem>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName} · {employee.jobTitle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="buddy">Onboarding buddy <OptionalTag /></Label>
              <Input
                id="buddy"
                value={form.buddy}
                onChange={(e) => setForm((f) => ({ ...f, buddy: e.target.value }))}
                placeholder="Name of a teammate to help them settle in"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
