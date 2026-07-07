"use client";

import * as React from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth/auth-provider";
import type { Employee, EquityGender, EquityRace, OccupationalLevel } from "@/lib/types";
import { updateEmployeeEquityAction } from "@/lib/compliance/equity-actions";

const NONE = "unspecified";

const RACE_OPTIONS: { value: EquityRace; label: string }[] = [
  { value: "african", label: "African" },
  { value: "coloured", label: "Coloured" },
  { value: "indian", label: "Indian" },
  { value: "white", label: "White" },
  { value: "other", label: "Other" },
];
const GENDER_OPTIONS: { value: EquityGender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];
const LEVEL_OPTIONS: { value: OccupationalLevel; label: string }[] = [
  { value: "top_management", label: "Top management" },
  { value: "senior_management", label: "Senior management" },
  { value: "professional_mid", label: "Professionally qualified / mid-management" },
  { value: "skilled_technical", label: "Skilled technical" },
  { value: "semi_skilled", label: "Semi-skilled" },
  { value: "unskilled", label: "Unskilled" },
];

export function ProfileEquity({ employee }: { employee: Employee }) {
  const { user } = useAuth();
  const canManage = user?.role === "hr";

  const [race, setRace] = React.useState<string>(employee.equityRace ?? NONE);
  const [gender, setGender] = React.useState<string>(employee.equityGender ?? NONE);
  const [level, setLevel] = React.useState<string>(employee.occupationalLevel ?? NONE);
  const [foreign, setForeign] = React.useState(employee.foreignNational ?? false);
  const [disability, setDisability] = React.useState(employee.hasDisability ?? false);
  const [saving, setSaving] = React.useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await updateEmployeeEquityAction(employee.id, {
        equityRace: race === NONE ? null : (race as EquityRace),
        equityGender: gender === NONE ? null : (gender as EquityGender),
        occupationalLevel: level === NONE ? null : (level as OccupationalLevel),
        foreignNational: foreign,
        hasDisability: disability,
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Equity details saved");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Employment Equity</CardTitle>
        <CardDescription>
          Used for EEA2 and EEA4 reporting. Self-declared and confidential.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label>Race</Label>
            <Select value={race} onValueChange={setRace} disabled={!canManage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Not specified</SelectItem>
                {RACE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Gender</Label>
            <Select value={gender} onValueChange={setGender} disabled={!canManage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Not specified</SelectItem>
                {GENDER_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Occupational level</Label>
            <Select value={level} onValueChange={setLevel} disabled={!canManage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Not specified</SelectItem>
                {LEVEL_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={foreign}
              disabled={!canManage}
              onChange={(e) => setForeign(e.target.checked)}
            />
            Foreign national
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={disability}
              disabled={!canManage}
              onChange={(e) => setDisability(e.target.checked)}
            />
            Person with a disability
          </label>
        </div>

        {canManage && (
          <div>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save equity details"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
