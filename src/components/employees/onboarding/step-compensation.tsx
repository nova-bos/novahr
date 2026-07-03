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
import { formatCurrency } from "@/lib/format";
import type { FieldErrors } from "@/lib/schemas/employee";
import { SA_BANKS } from "@/lib/services/netcash/helpers";
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

export function StepCompensation({ form, setForm, errors }: StepProps) {
  const annualGross = Number(form.annualGross) || 0;
  const monthlyBasic = annualGross / 12;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Salary structure</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="annualGross">Annual gross salary (R)</Label>
              <Input
                id="annualGross"
                type="number"
                min={0}
                value={form.annualGross}
                onChange={(e) => setForm((f) => ({ ...f, annualGross: e.target.value }))}
                placeholder="e.g. R25 000"
              />
              {annualGross > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(monthlyBasic)} basic salary per month
                </p>
              ) : null}
              <FieldError message={errors.annualGross} />
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
              <FieldError message={errors.pensionContributionPct} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="travelAllowance">Travel allowance (R / month, optional)</Label>
              <Input
                id="travelAllowance"
                type="number"
                min={0}
                value={form.travelAllowance}
                onChange={(e) => setForm((f) => ({ ...f, travelAllowance: e.target.value }))}
                placeholder="0"
              />
              <FieldError message={errors.travelAllowance} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="housingAllowance">Housing allowance (R / month, optional)</Label>
              <Input
                id="housingAllowance"
                type="number"
                min={0}
                value={form.housingAllowance}
                onChange={(e) => setForm((f) => ({ ...f, housingAllowance: e.target.value }))}
                placeholder="0"
              />
              <FieldError message={errors.housingAllowance} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="medicalAid">Medical aid (R / month, optional)</Label>
              <Input
                id="medicalAid"
                type="number"
                min={0}
                value={form.medicalAid}
                onChange={(e) => setForm((f) => ({ ...f, medicalAid: e.target.value }))}
                placeholder="0"
              />
              <FieldError message={errors.medicalAid} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Banking details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="bank">Bank</Label>
              <Select
                value={form.bank}
                onValueChange={(value) => {
                  const found = SA_BANKS.find((b) => b.name === value);
                  setForm((f) => ({
                    ...f,
                    bank: value,
                    branchCode: found ? found.universalBranchCode : f.branchCode,
                  }));
                }}
              >
                <SelectTrigger id="bank" className="w-full">
                  <SelectValue placeholder="Select bank" />
                </SelectTrigger>
                <SelectContent>
                  {SA_BANKS.map((b) => (
                    <SelectItem key={b.name} value={b.name}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.bank} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="accountType">Account type</Label>
              <Select
                value={form.accountType}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, accountType: value as "Cheque" | "Savings" }))
                }
              >
                <SelectTrigger id="accountType" className="w-full">
                  <SelectValue placeholder="Select account type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Savings">Savings</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="accountNumber">Account number</Label>
              <Input
                id="accountNumber"
                value={form.accountNumber}
                onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))}
                placeholder="e.g. 62123456789"
              />
              <FieldError message={errors.accountNumber} />
            </div>
            {/* The branch code is set silently from the selected bank's
                universal branch code. It is intentionally not editable here:
                a mistyped code sends the salary to the wrong branch. */}
            <FieldError message={errors.branchCode} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
