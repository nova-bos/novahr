import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDepartments, useEmployees } from "@/lib/store/hooks";
import type { EmploymentType } from "@/lib/types";
import type { NewEmployeeForm } from "./types";

const EMPLOYMENT_TYPES: { value: EmploymentType; label: string }[] = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
];

interface StepProps {
  form: NewEmployeeForm;
  setForm: React.Dispatch<React.SetStateAction<NewEmployeeForm>>;
}

export function StepRole({ form, setForm }: StepProps) {
  const departments = useDepartments();
  const employees = useEmployees();

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
                placeholder="Software Engineer"
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
              <Label htmlFor="startDate">Start date</Label>
              <Input
                id="startDate"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="location">Work location</Label>
              <Input
                id="location"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="Cape Town, HQ"
              />
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
              <Label htmlFor="managerId">Reports to (optional)</Label>
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
              <Label htmlFor="buddy">Onboarding buddy (optional)</Label>
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
