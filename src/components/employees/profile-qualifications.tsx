"use client";

import * as React from "react";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApp } from "@/lib/store/app-provider";
import { useAuth } from "@/lib/auth/auth-provider";
import { formatDate } from "@/lib/format";
import type { Employee, EmployeeQualification } from "@/lib/types";
import { QUALIFICATION_TYPES } from "@/lib/config/employee-options";

interface EditRow {
  type: string;
  name: string;
  institution: string;
  yearCompleted: string;
  expiresAt: string;
}

function toEditRow(q: EmployeeQualification): EditRow {
  return {
    type: q.type || "certificate",
    name: q.name,
    institution: q.institution ?? "",
    yearCompleted: q.yearCompleted != null ? String(q.yearCompleted) : "",
    expiresAt: q.expiresAt ? q.expiresAt.slice(0, 10) : "",
  };
}

function qualificationTypeLabel(type: string): string {
  return QUALIFICATION_TYPES.find((t) => t.value === type)?.label ?? type;
}

/** Add/remove chip list, mirrors the onboarding wizard behaviour for skills and languages. */
function ChipEditor({
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
      <Label>{label}</Label>
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

export function ProfileQualifications({ employee }: { employee: Employee }) {
  const { user } = useAuth();
  const { updateEmployee } = useApp();
  const canEdit = user?.role === "hr";

  const [editing, setEditing] = React.useState(false);
  const [rows, setRows] = React.useState<EditRow[]>([]);
  const [skills, setSkills] = React.useState<string[]>([]);
  const [languages, setLanguages] = React.useState<string[]>([]);
  const [saving, setSaving] = React.useState(false);

  function startEditing() {
    setRows((employee.qualifications ?? []).map(toEditRow));
    setSkills(employee.skills ?? []);
    setLanguages(employee.languages ?? []);
    setEditing(true);
  }

  function addRow() {
    setRows((r) => [
      ...r,
      { type: "degree", name: "", institution: "", yearCompleted: "", expiresAt: "" },
    ]);
  }
  function updateRow(index: number, patch: Partial<EditRow>) {
    setRows((r) => r.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }
  function removeRow(index: number) {
    setRows((r) => r.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateEmployee(employee.id, {
        qualifications: rows
          .filter((q) => q.name.trim() !== "")
          .map((q) => ({
            id: "",
            type: q.type || "certificate",
            name: q.name.trim(),
            institution: q.institution.trim() || undefined,
            yearCompleted: q.yearCompleted.trim() ? Number(q.yearCompleted) : undefined,
            expiresAt: q.expiresAt.trim() || undefined,
          })),
        skills: skills.map((s) => s.trim()).filter(Boolean),
        languages: languages.map((l) => l.trim()).filter(Boolean),
      });
      toast.success("Qualifications updated", {
        description: `${employee.firstName} ${employee.lastName}'s record has been saved.`,
      });
      setEditing(false);
    } catch {
      toast.error("Couldn't update qualifications", { description: "Please try again." });
    } finally {
      setSaving(false);
    }
  }

  const qualifications = employee.qualifications ?? [];
  const employeeSkills = employee.skills ?? [];
  const employeeLanguages = employee.languages ?? [];
  const hasAnything =
    qualifications.length > 0 || employeeSkills.length > 0 || employeeLanguages.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Qualifications and skills</CardTitle>
          {canEdit && !editing ? (
            <Button variant="outline" size="sm" onClick={startEditing}>
              {hasAnything ? "Edit" : "Add"}
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {!editing ? (
          <>
            {qualifications.length > 0 ? (
              <div className="space-y-2">
                {qualifications.map((q) => (
                  <div
                    key={q.id}
                    className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-lg border border-border p-3 text-sm"
                  >
                    <div>
                      <span className="font-medium">{q.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {qualificationTypeLabel(q.type)}
                        {q.institution ? ` · ${q.institution}` : ""}
                        {q.yearCompleted ? ` · ${q.yearCompleted}` : ""}
                      </span>
                    </div>
                    {q.expiresAt ? (
                      <span className="text-xs text-muted-foreground">
                        Expires {formatDate(q.expiresAt)}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No qualifications recorded.</p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Skills</p>
                {employeeSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {employeeSkills.map((s) => (
                      <Badge key={s} variant="secondary" className="font-normal">
                        {s}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">None recorded.</p>
                )}
              </div>
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Languages</p>
                {employeeLanguages.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {employeeLanguages.map((l) => (
                      <Badge key={l} variant="secondary" className="font-normal">
                        {l}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">None recorded.</p>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Qualifications
              </p>
              <Button type="button" variant="outline" size="sm" onClick={addRow}>
                <Plus /> Add qualification
              </Button>
            </div>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No qualifications added. Use the button above to record a degree, diploma,
                certificate or licence.
              </p>
            ) : (
              <div className="space-y-3">
                {rows.map((q, i) => (
                  <div
                    key={i}
                    className="grid items-end gap-3 rounded-lg border border-border p-3 sm:grid-cols-[8rem_1fr_1fr_5rem_9rem_auto]"
                  >
                    <div className="space-y-1">
                      <Label className="text-xs">Type</Label>
                      <Select value={q.type} onValueChange={(v) => updateRow(i, { type: v })}>
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
                        onChange={(e) => updateRow(i, { name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Institution</Label>
                      <Input
                        value={q.institution}
                        placeholder="e.g. UCT"
                        onChange={(e) => updateRow(i, { institution: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Year</Label>
                      <Input
                        value={q.yearCompleted}
                        placeholder="2019"
                        inputMode="numeric"
                        onChange={(e) => updateRow(i, { yearCompleted: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Expiry</Label>
                      <DatePicker
                        value={q.expiresAt}
                        onValueChange={(v) => updateRow(i, { expiresAt: v })}
                        placeholder="Expiry"
                        captionLayout="dropdown"
                        fromYear={new Date().getFullYear() - 20}
                        toYear={new Date().getFullYear() + 30}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Remove qualification"
                      onClick={() => removeRow(i)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <ChipEditor
                label="Skills"
                placeholder="e.g. Payroll administration"
                values={skills}
                onChange={setSkills}
              />
              <ChipEditor
                label="Languages"
                placeholder="e.g. isiZulu"
                values={languages}
                onChange={setLanguages}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="button" onClick={() => void handleSave()} disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
