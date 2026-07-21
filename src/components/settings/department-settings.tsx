"use client";

import * as React from "react";
import { toast } from "sonner";
import { Building2, Pencil, Plus, Trash2 } from "lucide-react";
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
import { Label, OptionalTag } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useApp } from "@/lib/store/app-provider";
import { useDepartments, useEmployees } from "@/lib/store/hooks";
import type { Department } from "@/lib/types";

export function DepartmentSettings() {
  const departments = useDepartments();
  const employees = useEmployees();
  const { addDepartment, updateDepartment, deleteDepartment } = useApp();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Department | null>(null);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState<Department | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  function openCreate() {
    setEditing(null);
    setName("");
    setDescription("");
    setDialogOpen(true);
  }

  function openEdit(department: Department) {
    setEditing(department);
    setName(department.name);
    setDescription(department.description);
    setDialogOpen(true);
  }

  function headcount(departmentName: string): number {
    return employees.filter(
      (e) => e.department === departmentName && e.status !== "terminated"
    ).length;
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (name.trim().length < 2) {
      toast.error("Department name must be at least 2 characters.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateDepartment(editing.id, { name: name.trim(), description: description.trim() });
        toast.success("Department updated");
      } else {
        await addDepartment({ name: name.trim(), description: description.trim() });
        toast.success("Department added");
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error("Couldn't save department", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      await deleteDepartment(deleting.id);
      toast.success("Department deleted", {
        description: "Employees in this department were moved to Unassigned.",
      });
      setDeleting(null);
    } catch {
      toast.error("Couldn't delete department", { description: "Please try again." });
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
              <Building2 className="size-4 text-muted-foreground" />
              Departments
            </CardTitle>
            <CardDescription>
              Teams used across employee profiles, onboarding and reports.
            </CardDescription>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus />
            Add department
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {departments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No departments yet. Add your first department so new employees can be assigned to a
            team.
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border rounded-xl border border-border">
            {departments.map((department) => (
              <div key={department.id} className="flex items-center gap-3 px-4 py-3">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: department.color }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{department.name}</p>
                  {department.description ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {department.description}
                    </p>
                  ) : null}
                </div>
                <Badge variant="outline" className="shrink-0 font-normal">
                  {headcount(department.name)}{" "}
                  {headcount(department.name) === 1 ? "employee" : "employees"}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Edit ${department.name}`}
                  onClick={() => openEdit(department)}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={`Delete ${department.name}`}
                  onClick={() => setDeleting(department)}
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
              <DialogTitle>{editing ? "Edit department" : "Add department"}</DialogTitle>
              <DialogDescription>
                {editing
                  ? "Rename the department or update its description."
                  : "Create a team that employees can be assigned to."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="dept-name">Name</Label>
              <Input
                id="dept-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Engineering"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dept-description">Description <OptionalTag /></Label>
              <Textarea
                id="dept-description"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What this team does"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : editing ? "Save changes" : "Add department"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleting !== null} onOpenChange={(open) => !open && !isDeleting && setDeleting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {deleting?.name}?</DialogTitle>
            <DialogDescription>
              {deleting && headcount(deleting.name) > 0
                ? `${headcount(deleting.name)} ${
                    headcount(deleting.name) === 1 ? "employee" : "employees"
                  } in this department will be moved to Unassigned.`
                : "This department has no employees."}{" "}
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete department"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
