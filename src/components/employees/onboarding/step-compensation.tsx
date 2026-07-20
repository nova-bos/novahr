"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { formatCurrency } from "@/lib/format";
import type { FieldErrors } from "@/lib/schemas/employee";
import { SA_BANKS } from "@/lib/services/netcash/helpers";
import { useTenantId } from "@/lib/store/hooks";
import { getPayrollSettingsAction } from "@/lib/settings/actions";
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

  // Pension and medical aid fields only appear if the company offers them.
  const tenantId = useTenantId();
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
              <Label htmlFor="travelAllowance">Travel allowance (R / month) <OptionalTag /></Label>
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
              <Label htmlFor="housingAllowance">Housing allowance (R / month) <OptionalTag /></Label>
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
              <Label htmlFor="retirementAnnuity">Retirement annuity (R / month) <OptionalTag /></Label>
              <Input
                id="retirementAnnuity"
                type="number"
                min={0}
                value={form.retirementAnnuity}
                onChange={(e) => setForm((f) => ({ ...f, retirementAnnuity: e.target.value }))}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                Personal RA processed through payroll. Reduces taxable income.
              </p>
              <FieldError message={errors.retirementAnnuity} />
            </div>
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
                  placeholder="0"
                />
                <FieldError message={errors.pensionContributionPct} />
              </div>
            ) : null}
            {offersMedicalAid ? (
              <div className="space-y-1.5">
                <Label htmlFor="medicalAid">Medical aid (R / month) <OptionalTag /></Label>
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
            ) : null}
          </div>
          <div className="mt-4 flex items-start gap-2">
            <Checkbox
              id="isMedicalAidMember"
              checked={form.isMedicalAidMember}
              onCheckedChange={(v) => setForm((f) => ({ ...f, isMedicalAidMember: v === true }))}
              className="mt-0.5"
            />
            <div className="space-y-0.5">
              <Label htmlFor="isMedicalAidMember" className="text-sm font-normal cursor-pointer">
                Employee is a medical aid member
              </Label>
              <p className="text-xs text-muted-foreground">
                Tick if they belong to any medical scheme, even if they pay privately. Enables the SARS medical tax credit on assessment.
              </p>
            </div>
          </div>
          {!offersPension && !offersMedicalAid ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Your company has no pension or medical aid contribution enabled. You can turn these on
              under Settings, Payroll, Benefits offered.
            </p>
          ) : null}
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
