import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { employmentTypeLabel, formatCurrency, formatDate, maskAccountNumber } from "@/lib/format";
import { calculateMonthlyPayroll } from "@/lib/payroll/calculator";
import { useCurrentTenant, useEmployees } from "@/lib/store/hooks";
import { buildEmployeeFromForm } from "@/lib/employees/form-builder";
import type { NewEmployeeForm } from "./types";

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="truncate text-right font-medium">{value || "-"}</span>
    </div>
  );
}

export function StepReview({ form }: { form: NewEmployeeForm }) {
  const tenant = useCurrentTenant();
  const employees = useEmployees();
  const previewEmployee = buildEmployeeFromForm(form, tenant, employees.length + 1);
  const breakdown = calculateMonthlyPayroll(previewEmployee);
  const manager = employees.find((e) => e.id === form.managerId);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>New employee summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar size="lg" className="size-14">
              <AvatarFallback
                className="text-base text-white"
                style={{ backgroundColor: previewEmployee.avatarColor }}
              >
                {previewEmployee.initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-base font-semibold">
                {previewEmployee.firstName} {previewEmployee.lastName}
              </p>
              <p className="text-sm text-muted-foreground">
                {previewEmployee.jobTitle || "Job title not set"} ·{" "}
                {previewEmployee.department || "No department"}
              </p>
            </div>
            <Badge variant="outline" className="ml-auto border-transparent bg-warning/10 font-medium text-warning">
              Onboarding
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Personal & contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <ReviewRow label="Email" value={previewEmployee.email} />
            <ReviewRow label="Phone" value={previewEmployee.phone} />
            <ReviewRow label="ID number" value={previewEmployee.idNumber} />
            <ReviewRow label="Tax number" value={previewEmployee.taxNumber} />
            <ReviewRow label="Address" value={previewEmployee.address} />
            <Separator />
            <ReviewRow label="Emergency contact" value={previewEmployee.emergencyContact.name} />
            <ReviewRow
              label="Relationship"
              value={previewEmployee.emergencyContact.relationship}
            />
            <ReviewRow
              label="Emergency phone"
              value={previewEmployee.emergencyContact.phone}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Role & employment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <ReviewRow label="Job title" value={previewEmployee.jobTitle} />
            <ReviewRow label="Department" value={previewEmployee.department} />
            <ReviewRow
              label="Employment type"
              value={employmentTypeLabel(previewEmployee.employmentType)}
            />
            <ReviewRow label="Start date" value={formatDate(previewEmployee.startDate)} />
            <ReviewRow label="Location" value={previewEmployee.location} />
            <ReviewRow
              label="Reports to"
              value={manager ? `${manager.firstName} ${manager.lastName}` : "No manager"}
            />
            <ReviewRow label="Onboarding buddy" value={previewEmployee.onboarding?.buddy ?? ""} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Compensation preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="min-w-0 rounded-xl border border-border/70 p-4">
              <p className="text-xs text-muted-foreground">Gross pay / month</p>
              <p className="mt-1 truncate text-xl font-semibold tracking-tight tabular-nums">
                {formatCurrency(breakdown.grossPay)}
              </p>
            </div>
            <div className="min-w-0 rounded-xl border border-border/70 p-4">
              <p className="text-xs text-muted-foreground">Total deductions</p>
              <p className="mt-1 truncate text-xl font-semibold tracking-tight tabular-nums text-destructive">
                -{formatCurrency(breakdown.totalDeductions)}
              </p>
            </div>
            <div className="min-w-0 rounded-xl border border-border/70 bg-primary/[0.03] p-4">
              <p className="text-xs text-muted-foreground">Net pay / month</p>
              <p className="mt-1 truncate text-xl font-semibold tracking-tight tabular-nums text-primary">
                {formatCurrency(breakdown.netPay)}
              </p>
            </div>
          </div>
          <div className="space-y-2.5">
            <ReviewRow
              label="Annual gross salary"
              value={formatCurrency(previewEmployee.salary.annualGross)}
            />
            {previewEmployee.salary.travelAllowance ? (
              <ReviewRow
                label="Travel allowance"
                value={formatCurrency(previewEmployee.salary.travelAllowance)}
              />
            ) : null}
            {previewEmployee.salary.housingAllowance ? (
              <ReviewRow
                label="Housing allowance"
                value={formatCurrency(previewEmployee.salary.housingAllowance)}
              />
            ) : null}
            {previewEmployee.salary.pensionContributionPct ? (
              <ReviewRow
                label="Pension contribution"
                value={`${(previewEmployee.salary.pensionContributionPct * 100).toFixed(1)}%`}
              />
            ) : null}
            {previewEmployee.salary.medicalAid ? (
              <ReviewRow
                label="Medical aid"
                value={formatCurrency(previewEmployee.salary.medicalAid)}
              />
            ) : null}
            <Separator />
            <ReviewRow label="Bank" value={previewEmployee.bankDetails.bank} />
            <ReviewRow
              label="Account number"
              value={maskAccountNumber(previewEmployee.bankDetails.accountNumber)}
            />
            <ReviewRow
              label="Account type"
              value={`${previewEmployee.bankDetails.accountType} · Branch ${previewEmployee.bankDetails.branchCode}`}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
