"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { useApp } from "@/lib/store/app-provider";
import { useAuth } from "@/lib/auth/auth-provider";
import { listCustomFieldDefinitionsAction } from "@/lib/custom-fields/actions";
import type { Employee, TenantCustomFieldDefinition } from "@/lib/types";

function CustomFieldInput({
  definition,
  value,
  onChange,
  disabled,
}: {
  definition: TenantCustomFieldDefinition;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  if (definition.fieldType === "select") {
    return (
      <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          {(definition.options ?? []).map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  return (
    <Input
      type={definition.fieldType === "number" ? "number" : definition.fieldType === "date" ? "date" : "text"}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function ProfileCustomFields({ employee }: { employee: Employee }) {
  const { user } = useAuth();
  const { updateEmployee } = useApp();
  const canEdit = user?.role === "hr";

  const [definitions, setDefinitions] = React.useState<TenantCustomFieldDefinition[] | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

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

  const savedValues = React.useMemo(() => {
    const map: Record<string, string> = {};
    for (const f of employee.customFields ?? []) map[f.definitionId] = f.value;
    return map;
  }, [employee.customFields]);

  function startEditing() {
    setValues({ ...savedValues });
    setEditing(true);
  }

  async function handleSave() {
    if (!definitions) return;
    setSaving(true);
    try {
      await updateEmployee(employee.id, {
        customFields: definitions.map((d) => ({
          definitionId: d.id,
          value: (values[d.id] ?? "").trim(),
        })),
      });
      toast.success("Additional information updated");
      setEditing(false);
    } catch {
      toast.error("Couldn't update additional information", { description: "Please try again." });
    } finally {
      setSaving(false);
    }
  }

  // Nothing configured for this tenant: render nothing at all.
  if (!definitions || definitions.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Additional information</CardTitle>
          {canEdit && !editing ? (
            <Button variant="outline" size="sm" onClick={startEditing}>
              Edit
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          {definitions.map((d) => (
            <div key={d.id} className="space-y-1.5">
              <Label htmlFor={`cf-${d.id}`}>{d.label}</Label>
              {editing ? (
                <CustomFieldInput
                  definition={d}
                  value={values[d.id] ?? ""}
                  onChange={(v) => setValues((prev) => ({ ...prev, [d.id]: v }))}
                  disabled={saving}
                />
              ) : (
                <p className="text-sm font-medium">
                  {savedValues[d.id]?.trim() ? savedValues[d.id] : "Not provided"}
                </p>
              )}
            </div>
          ))}
        </div>
        {editing ? (
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
