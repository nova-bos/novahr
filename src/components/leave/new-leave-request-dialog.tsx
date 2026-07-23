"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label, OptionalTag } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/lib/supabase/client";
import { validateLeaveRequest } from "@/lib/schemas/leave";
import {
  CORE_LEAVE_TYPES,
  FAMILY_LEAVE_TYPES,
  OTHER_LEAVE_TYPES,
  getLeavePolicy,
} from "@/lib/config/leave";
import { useApp } from "@/lib/store/app-provider";
import { useTenantId } from "@/lib/store/hooks";
import { useAuth } from "@/lib/auth/auth-provider";
import { useScopedEmployees, useScopedLeaveRequests } from "@/lib/auth/scope";
import { leaveTypeLabel } from "@/lib/format";
import { isWeekend } from "@/lib/leave/business-days";
import { cn } from "@/lib/utils";
import type { DaySelection, LeaveType } from "@/lib/types";
import { LeaveDocumentUpload } from "./leave-document-upload";
import { LeaveDayPicker, type BookedDate } from "./leave-day-picker";

const LEAVE_DOC_BUCKET = "leave-documents";

const LEAVE_TYPE_GROUPS: { label: string; types: LeaveType[] }[] = [
  { label: "Standard", types: [...CORE_LEAVE_TYPES] },
  { label: "Family and parental", types: [...FAMILY_LEAVE_TYPES] },
  { label: "Other", types: [...OTHER_LEAVE_TYPES] },
];

export function NewLeaveRequestDialog() {
  const { addLeaveRequest } = useApp();
  const { user } = useAuth();
  const employees = useScopedEmployees();
  const leaveRequests = useScopedLeaveRequests();
  const tenantId = useTenantId();
  const lockToSelf = user?.role === "employee";

  const [open, setOpen] = React.useState(false);
  const [employeeId, setEmployeeId] = React.useState(lockToSelf ? user?.employeeId ?? "" : "");
  const [type, setType] = React.useState<LeaveType>("annual");
  const [daySelections, setDaySelections] = React.useState<DaySelection[]>([]);
  const [reason, setReason] = React.useState("");
  const [document, setDocument] = React.useState<File | null>(null);
  const [docError, setDocError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  function resetForm() {
    setEmployeeId(lockToSelf ? user?.employeeId ?? "" : "");
    setType("annual");
    setDaySelections([]);
    setReason("");
    setDocument(null);
    setDocError("");
    setFieldErrors({});
  }

  function handleDocumentChange(file: File | null) {
    setDocError("");
    if (file && file.size > 10 * 1024 * 1024) {
      setDocError("File is too large. Please choose a file under 10 MB.");
      return;
    }
    setDocument(file);
  }

  const selectedEmployee = employees.find((e) => e.id === employeeId);
  const balance = selectedEmployee?.leaveBalances.find((b) => b.type === type);
  const selectedPolicy = getLeavePolicy(type);

  const requestedDays = daySelections.reduce(
    (sum, d) => sum + (d.type === "full" ? 1 : 0.5),
    0
  );

  // Subtract pending leave of the same type so employees see their real headroom
  const pendingDays = leaveRequests
    .filter((r) => r.employeeId === employeeId && r.type === type && r.status === "pending")
    .reduce((sum, r) => sum + r.days, 0);

  const bookedDates = React.useMemo<Map<string, BookedDate>>(() => {
    if (!employeeId) return new Map();
    const map = new Map<string, BookedDate>();
    for (const r of leaveRequests) {
      if (r.employeeId !== employeeId) continue;
      if (r.status !== "approved" && r.status !== "pending") continue;
      const label = leaveTypeLabel(r.type);
      const status = r.status as "approved" | "pending";
      if (r.daySelections && r.daySelections.length > 0) {
        for (const ds of r.daySelections) {
          if (!map.has(ds.date)) map.set(ds.date, { status, label });
        }
      } else {
        // Fallback for requests that predate day-level selection storage
        const start = new Date(r.startDate + "T00:00:00Z");
        const end = new Date(r.endDate + "T00:00:00Z");
        for (const d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
          const iso = d.toISOString().slice(0, 10);
          if (!isWeekend(iso) && !map.has(iso)) map.set(iso, { status, label });
        }
      }
    }
    return map;
  }, [employeeId, leaveRequests]);
  // Entitlement earned to date (accrual) or the full total (upfront); see the
  // server-computed `accrued` on the balance.
  const entitlement = balance ? balance.accrued ?? balance.total : 0;
  const available = balance ? entitlement - balance.used - pendingDays : 0;
  const remainingAfter = available - requestedDays;
  const isOverLimit = Boolean(balance) && daySelections.length > 0 && remainingAfter < 0;
  const usagePct =
    balance && entitlement > 0
      ? Math.min(100, ((balance.used + pendingDays + requestedDays) / entitlement) * 100)
      : 0;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const errors = validateLeaveRequest({ employeeId, type, daySelections, reason });
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    const employee = employees.find((e) => e.id === employeeId);
    if (!employee) return;

    setSubmitting(true);
    try {
      let documentPath: string | undefined;

      if (document) {
        const supabase = createClient();
        const ext = document.name.split(".").pop()?.toLowerCase() ?? "bin";
        const path = `${tenantId}/${employee.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from(LEAVE_DOC_BUCKET)
          .upload(path, document, { contentType: document.type });
        if (uploadError) throw uploadError;
        documentPath = path;
      }

      await addLeaveRequest({
        employeeId: employee.id,
        type,
        daySelections,
        reason: reason.trim(),
        documentPath,
      });

      toast.success("Leave request submitted", {
        description: `${employee.firstName} ${employee.lastName}'s request is awaiting approval.`,
      });
      resetForm();
      setOpen(false);
    } catch {
      toast.error("Couldn't submit leave request", {
        description: "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <Plus />
          Request leave
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg" noInnerPad>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <DialogHeader className="shrink-0 border-b px-6 py-4">
            <DialogTitle>Request leave</DialogTitle>
            <DialogDescription className="sr-only">
              Select an employee, leave type, days, and optional reason.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="employee">Employee</Label>
              <Select value={employeeId} onValueChange={setEmployeeId} disabled={lockToSelf}>
                <SelectTrigger id="employee" className="w-full">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName} · {employee.jobTitle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.employeeId ? (
                <p className="text-xs text-destructive">{fieldErrors.employeeId}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="leaveType">Leave type</Label>
              <Select value={type} onValueChange={(value) => setType(value as LeaveType)}>
                <SelectTrigger id="leaveType" className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {LEAVE_TYPE_GROUPS.map((group) => (
                    <React.Fragment key={group.label}>
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                        {group.label}
                      </div>
                      {group.types.map((leaveType) => (
                        <SelectItem key={leaveType} value={leaveType}>
                          {leaveTypeLabel(leaveType)}
                        </SelectItem>
                      ))}
                    </React.Fragment>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{selectedPolicy.description}</p>
            </div>

            <div className="space-y-1.5">
              <Label>Select days</Label>
              <LeaveDayPicker value={daySelections} onChange={setDaySelections} bookedDates={bookedDates} />
              {fieldErrors.daySelections ? (
                <p className="text-xs text-destructive">{fieldErrors.daySelections}</p>
              ) : null}
            </div>

            {balance && daySelections.length > 0 ? (
              <div className="rounded-xl border border-border/70 p-3">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-muted-foreground">
                    {leaveTypeLabel(type)} balance
                  </span>
                  <span className="shrink-0 font-medium tabular-nums">
                    {available} {available === 1 ? "day" : "days"} available
                  </span>
                </div>
                <Progress value={usagePct} className="mt-2.5 h-1.5" />
                <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-muted-foreground">
                    {requestedDays} {requestedDays === 1 ? "day" : "days"} requested
                  </span>
                  <span
                    className={cn(
                      "shrink-0 font-medium tabular-nums",
                      isOverLimit ? "text-destructive" : "text-muted-foreground"
                    )}
                  >
                    {remainingAfter} {Math.abs(remainingAfter) === 1 ? "day" : "days"} left after
                  </span>
                </div>
                {isOverLimit ? (
                  <p className="mt-2 text-xs text-destructive">
                    This request exceeds the available {leaveTypeLabel(type).toLowerCase()}{" "}
                    balance.
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="reason">
                Reason <OptionalTag />
              </Label>
              <Textarea
                id="reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Add a short note for the approver"
              />
              {fieldErrors.reason ? (
                <p className="text-xs text-destructive">{fieldErrors.reason}</p>
              ) : null}
            </div>

            <LeaveDocumentUpload
              value={document}
              onChange={handleDocumentChange}
              error={docError}
            />
          </div>

          <div className="shrink-0 border-t bg-muted/50 px-6 py-4 flex flex-col-reverse gap-2 rounded-b-xl sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
