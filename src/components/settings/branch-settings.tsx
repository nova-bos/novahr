"use client";

import * as React from "react";
import { toast } from "sonner";
import { MapPin, Pencil, Plus, Power } from "lucide-react";
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
import { useApp } from "@/lib/store/app-provider";
import { useBranches, useEmployees } from "@/lib/store/hooks";
import type { Branch } from "@/lib/types";

export function BranchSettings() {
  const branches = useBranches();
  const employees = useEmployees();
  const { addBranch, updateBranch, deactivateBranch } = useApp();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Branch | null>(null);
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [city, setCity] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [deactivating, setDeactivating] = React.useState<Branch | null>(null);
  const [isDeactivating, setIsDeactivating] = React.useState(false);

  function openCreate() {
    setEditing(null);
    setName("");
    setCode("");
    setAddress("");
    setCity("");
    setDialogOpen(true);
  }

  function openEdit(branch: Branch) {
    setEditing(branch);
    setName(branch.name);
    setCode(branch.code ?? "");
    setAddress(branch.address ?? "");
    setCity(branch.city ?? "");
    setDialogOpen(true);
  }

  function headcount(branchId: string): number {
    return employees.filter((e) => e.branchId === branchId && e.status !== "terminated").length;
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (name.trim().length < 2) {
      toast.error("Branch name must be at least 2 characters.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateBranch(editing.id, {
          name: name.trim(),
          code: code.trim() || null,
          address: address.trim() || null,
          city: city.trim() || null,
        });
        toast.success("Branch updated");
      } else {
        await addBranch({
          name: name.trim(),
          code: code.trim() || undefined,
          address: address.trim() || undefined,
          city: city.trim() || undefined,
        });
        toast.success("Branch added");
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error("Couldn't save branch", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleReactivate(branch: Branch) {
    try {
      await updateBranch(branch.id, { isActive: true });
      toast.success("Branch reactivated");
    } catch {
      toast.error("Couldn't reactivate branch", { description: "Please try again." });
    }
  }

  async function handleDeactivate() {
    if (!deactivating) return;
    setIsDeactivating(true);
    try {
      await deactivateBranch(deactivating.id);
      toast.success("Branch deactivated", {
        description: "Employees keep their records. You can reactivate it at any time.",
      });
      setDeactivating(null);
    } catch {
      toast.error("Couldn't deactivate branch", { description: "Please try again." });
    } finally {
      setIsDeactivating(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="size-4 text-muted-foreground" />
              Branches
            </CardTitle>
            <CardDescription>
              Sites or offices within your company. Assign employees to a branch and run payroll
              for a single branch. Leave employees unassigned to keep them at head office.
            </CardDescription>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus />
            Add branch
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {branches.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No branches yet. Add your first branch to assign employees and run branch payroll. If
            you never add one, everything works exactly as before.
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border rounded-xl border border-border">
            {branches.map((branch) => (
              <div key={branch.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-sm font-medium">
                    {branch.name}
                    {branch.isDefault ? (
                      <Badge variant="secondary" className="font-normal">
                        Default
                      </Badge>
                    ) : null}
                    {!branch.isActive ? (
                      <Badge variant="outline" className="font-normal text-muted-foreground">
                        Inactive
                      </Badge>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[branch.code, branch.city, branch.address].filter(Boolean).join(" · ") ||
                      "No location details"}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0 font-normal">
                  {headcount(branch.id)} {headcount(branch.id) === 1 ? "employee" : "employees"}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Edit ${branch.name}`}
                  onClick={() => openEdit(branch)}
                >
                  <Pencil className="size-3.5" />
                </Button>
                {branch.isActive ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Deactivate ${branch.name}`}
                    onClick={() => setDeactivating(branch)}
                  >
                    <Power className="size-3.5" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReactivate(branch)}
                  >
                    Reactivate
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit branch" : "Add branch"}</DialogTitle>
              <DialogDescription>
                {editing
                  ? "Update this branch's details."
                  : "Create a site or office that employees can be assigned to."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="branch-name">Name</Label>
              <Input
                id="branch-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Cape Town branch"
                autoFocus
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="branch-code">Code <OptionalTag /></Label>
                <Input
                  id="branch-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. CPT"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="branch-city">City <OptionalTag /></Label>
                <Input
                  id="branch-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Cape Town"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="branch-address">Address <OptionalTag /></Label>
              <Input
                id="branch-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 1 Long Street"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : editing ? "Save changes" : "Add branch"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deactivating !== null}
        onOpenChange={(open) => !open && !isDeactivating && setDeactivating(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Deactivate {deactivating?.name}?</DialogTitle>
            <DialogDescription>
              Employees keep their branch assignment and payroll history. The branch is hidden from
              new selections until you reactivate it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivating(null)} disabled={isDeactivating}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeactivate} disabled={isDeactivating}>
              {isDeactivating ? "Deactivating..." : "Deactivate branch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
