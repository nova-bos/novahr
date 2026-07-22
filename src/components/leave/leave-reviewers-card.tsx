"use client";

import * as React from "react";
import { Building2, Plus, Trash2, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLeaveReviewers } from "@/lib/store/hooks";
import { useApp } from "@/lib/store/app-provider";
import { useEmployees, useDepartments } from "@/lib/store/hooks";
import { getInitials } from "@/lib/format";
import type { LeaveReviewer } from "@/lib/types";

const SCOPE_LABELS: Record<LeaveReviewer["scope"], string> = {
  all: "All employees",
  department: "Department",
  employee: "Specific employee",
};

function ReviewerRow({ reviewer, onDelete }: { reviewer: LeaveReviewer; onDelete: () => void }) {
  const employees = useEmployees();
  const departments = useDepartments();
  const reviewer_emp = employees.find((e) => e.id === reviewer.reviewerEmployeeId);

  let scopeLabel = SCOPE_LABELS[reviewer.scope];
  if (reviewer.scope === "department" && reviewer.scopeId) {
    const dept = departments.find((d) => d.id === reviewer.scopeId);
    scopeLabel = dept ? `${dept.name} department` : "Unknown department";
  } else if (reviewer.scope === "employee" && reviewer.scopeId) {
    const emp = employees.find((e) => e.id === reviewer.scopeId);
    scopeLabel = emp ? `${emp.firstName} ${emp.lastName}` : "Unknown employee";
  }

  if (!reviewer_emp) return null;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border p-3">
      <Avatar size="sm">
        {reviewer_emp.photoUrl ? (
          <AvatarImage src={reviewer_emp.photoUrl} alt={`${reviewer_emp.firstName} ${reviewer_emp.lastName}`} />
        ) : null}
        <AvatarFallback className="text-white" style={{ backgroundColor: reviewer_emp.avatarColor }}>
          {getInitials(reviewer_emp.firstName, reviewer_emp.lastName)}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-1 min-w-0 flex-col gap-0.5">
        <p className="text-sm font-medium truncate">
          {reviewer_emp.firstName} {reviewer_emp.lastName}
        </p>
        {reviewer.label && (
          <p className="text-xs text-muted-foreground truncate">{reviewer.label}</p>
        )}
        <div className="flex items-center gap-1.5 mt-0.5">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1">
            {reviewer.scope === "all" ? (
              <Building2 className="size-2.5" />
            ) : (
              <User className="size-2.5" />
            )}
            {scopeLabel}
          </Badge>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="shrink-0 text-muted-foreground hover:text-destructive"
        onClick={onDelete}
        aria-label={`Remove ${reviewer_emp.firstName} ${reviewer_emp.lastName} as reviewer`}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}

export function LeaveReviewersCard() {
  const reviewers = useLeaveReviewers();
  const { addLeaveReviewer, deleteLeaveReviewer } = useApp();
  const employees = useEmployees();
  const departments = useDepartments();
  const active = employees.filter((e) => e.status !== "terminated");

  const [reviewerEmpId, setReviewerEmpId] = React.useState("");
  const [scope, setScope] = React.useState<"all" | "department" | "employee">("all");
  const [scopeId, setScopeId] = React.useState("");
  const [label, setLabel] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!reviewerEmpId) { setError("Please select a reviewer."); return; }
    if ((scope === "department" || scope === "employee") && !scopeId) {
      setError("Please select a specific department or employee.");
      return;
    }
    setSaving(true);
    try {
      await addLeaveReviewer({
        reviewerEmployeeId: reviewerEmpId,
        scope,
        scopeId: scope !== "all" ? scopeId : undefined,
        label: label.trim() || undefined,
      });
      setReviewerEmpId("");
      setScope("all");
      setScopeId("");
      setLabel("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add reviewer.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await deleteLeaveReviewer(id);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leave reviewers</CardTitle>
        <CardDescription>
          Configure who can approve and reject leave requests. Reviewers can be scoped to all
          employees, a specific department, or a single person. Useful when a manager is
          unavailable or when your organisation restructures. HR admins always retain full approval
          authority.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {reviewers.length > 0 ? (
          <div className="space-y-2">
            {reviewers.map((r) => (
              <ReviewerRow
                key={r.id}
                reviewer={r}
                onDelete={() => { if (deleting !== r.id) handleDelete(r.id); }}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No reviewers configured yet. By default, managers approve requests for their direct
            reports and HR admins can approve any request.
          </p>
        )}

        <div className="border-t border-border pt-4 space-y-4">
          <h3 className="text-sm font-semibold">Add a reviewer</h3>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Reviewer</Label>
                <Select value={reviewerEmpId} onValueChange={setReviewerEmpId}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select an employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {active.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.firstName} {e.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Approval scope</Label>
                <Select
                  value={scope}
                  onValueChange={(v) => {
                    setScope(v as "all" | "department" | "employee");
                    setScopeId("");
                  }}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All employees</SelectItem>
                    <SelectItem value="department">Specific department</SelectItem>
                    <SelectItem value="employee">Specific employee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {scope === "department" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Department</Label>
                <Select value={scopeId} onValueChange={setScopeId}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {scope === "employee" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Employee</Label>
                <Select value={scopeId} onValueChange={setScopeId}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select an employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {active
                      .filter((e) => e.id !== reviewerEmpId)
                      .map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.firstName} {e.lastName}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Label (optional)</Label>
              <Input
                placeholder="e.g. Engineering backup approver"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <Button type="submit" size="sm" disabled={saving}>
              <Plus className="size-3.5 mr-1" />
              {saving ? "Adding..." : "Add reviewer"}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
