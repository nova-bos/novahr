"use client";

import * as React from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Pencil, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createCustomFieldDefinitionAction,
  deleteCustomFieldDefinitionAction,
  listCustomFieldDefinitionsAction,
  reorderCustomFieldDefinitionsAction,
  updateCustomFieldDefinitionAction,
} from "@/lib/custom-fields/actions";
import type { CustomFieldType, TenantCustomFieldDefinition } from "@/lib/types";

const FIELD_TYPES: { value: CustomFieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Dropdown (select)" },
];

function fieldTypeLabel(type: CustomFieldType): string {
  return FIELD_TYPES.find((t) => t.value === type)?.label ?? type;
}

export function CustomFieldsSettings() {
  const [definitions, setDefinitions] = React.useState<TenantCustomFieldDefinition[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<TenantCustomFieldDefinition | null>(null);
  const [label, setLabel] = React.useState("");
  const [fieldType, setFieldType] = React.useState<CustomFieldType>("text");
  const [optionsText, setOptionsText] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState<TenantCustomFieldDefinition | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const refresh = React.useCallback(async () => {
    try {
      const defs = await listCustomFieldDefinitionsAction();
      setDefinitions(defs);
    } catch {
      toast.error("Couldn't load custom fields");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  function openCreate() {
    setEditing(null);
    setLabel("");
    setFieldType("text");
    setOptionsText("");
    setDialogOpen(true);
  }

  function openEdit(def: TenantCustomFieldDefinition) {
    setEditing(def);
    setLabel(def.label);
    setFieldType(def.fieldType);
    setOptionsText((def.options ?? []).join("\n"));
    setDialogOpen(true);
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (label.trim().length < 1) {
      toast.error("A field label is required.");
      return;
    }
    const options =
      fieldType === "select"
        ? optionsText
            .split("\n")
            .map((o) => o.trim())
            .filter(Boolean)
        : undefined;
    if (fieldType === "select" && (!options || options.length === 0)) {
      toast.error("A dropdown field needs at least one option.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateCustomFieldDefinitionAction(editing.id, {
          label: label.trim(),
          fieldType,
          options: fieldType === "select" ? options : [],
        });
        toast.success("Custom field updated");
      } else {
        await createCustomFieldDefinitionAction({ label: label.trim(), fieldType, options });
        toast.success("Custom field added");
      }
      setDialogOpen(false);
      await refresh();
    } catch (err) {
      toast.error("Couldn't save custom field", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(def: TenantCustomFieldDefinition) {
    try {
      await updateCustomFieldDefinitionAction(def.id, { isActive: !def.isActive });
      await refresh();
    } catch {
      toast.error("Couldn't update the field.");
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const next = [...definitions];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setDefinitions(next);
    try {
      await reorderCustomFieldDefinitionsAction(next.map((d) => d.id));
    } catch {
      toast.error("Couldn't reorder fields.");
      await refresh();
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      await deleteCustomFieldDefinitionAction(deleting.id);
      toast.success("Custom field deleted");
      setDeleting(null);
      await refresh();
    } catch {
      toast.error("Couldn't delete the field.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2">
              <SlidersHorizontal className="size-4 text-muted-foreground" />
              Custom fields
            </CardTitle>
            <CardDescription>
              Extra fields captured on every employee profile, such as t-shirt size or a staff
              association number. Inactive fields stay hidden on the employee form but keep any
              existing values.
            </CardDescription>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus />
            Add custom field
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : definitions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No custom fields yet. Add one to capture information beyond the standard employee record.
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border rounded-xl border border-border">
            {definitions.map((def, index) => (
              <div key={def.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex flex-col">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Move ${def.label} up`}
                    disabled={index === 0}
                    onClick={() => void move(index, -1)}
                  >
                    <ChevronUp className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Move ${def.label} down`}
                    disabled={index === definitions.length - 1}
                    onClick={() => void move(index, 1)}
                  >
                    <ChevronDown className="size-3.5" />
                  </Button>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{def.label}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {fieldTypeLabel(def.fieldType)}
                    {def.fieldType === "select" && def.options?.length
                      ? ` · ${def.options.join(", ")}`
                      : ""}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={`shrink-0 font-normal ${def.isActive ? "" : "text-muted-foreground"}`}
                >
                  {def.isActive ? "Active" : "Inactive"}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void toggleActive(def)}
                >
                  {def.isActive ? "Deactivate" : "Activate"}
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Edit ${def.label}`}
                  onClick={() => openEdit(def)}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={`Delete ${def.label}`}
                  onClick={() => setDeleting(def)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit custom field" : "Add custom field"}</DialogTitle>
              <DialogDescription>
                {editing
                  ? "Update the label, type or options for this field."
                  : "Create a field to capture extra employee information."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="cf-label">Label</Label>
              <Input
                id="cf-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. T-shirt size"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cf-type">Type</Label>
              <Select value={fieldType} onValueChange={(v) => setFieldType(v as CustomFieldType)}>
                <SelectTrigger id="cf-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {fieldType === "select" ? (
              <div className="space-y-1.5">
                <Label htmlFor="cf-options">Options</Label>
                <textarea
                  id="cf-options"
                  className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  rows={4}
                  value={optionsText}
                  onChange={(e) => setOptionsText(e.target.value)}
                  placeholder={"One option per line, e.g.\nSmall\nMedium\nLarge"}
                />
                <p className="text-xs text-muted-foreground">One option per line.</p>
              </div>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : editing ? "Save changes" : "Add field"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleting !== null}
        onOpenChange={(open) => !open && !isDeleting && setDeleting(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {deleting?.label}?</DialogTitle>
            <DialogDescription>
              This removes the field and any values captured against it on employee profiles. This
              cannot be undone. To keep the values but hide the field, deactivate it instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete field"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
