"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/lib/supabase/client";
import { validateLeaveRequest } from "@/lib/schemas/leave";
import { useApp } from "@/lib/store/app-provider";
import { useTenantId } from "@/lib/store/hooks";
import { useAuth } from "@/lib/auth/auth-provider";
import { useScopedEmployees } from "@/lib/auth/scope";
import { leaveTypeLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { LeaveType } from "@/lib/types";
import { LeaveDocumentUpload } from "./leave-document-upload";

const LEAVE_TYPES: LeaveType[] = ["annual", "sick", "family", "unpaid"];
const LEAVE_DOC_BUCKET = "leave-documents";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(start: string, end: string): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diff = Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000);
  return Math.max(1, diff + 1);
}

export function NewLeaveRequestDialog() {
  const { addLeaveRequest } = useApp();
  const { user } = useAuth();
  const employees = useScopedEmployees();
  const tenantId = useTenantId();
  const lockToSelf = user?.role === "employee";

  const [open, setOpen] = React.useState(false);
  const [employeeId, setEmployeeId] = React.useState(lockToSelf ? user?.employeeId ?? "" : "");
  const [type, setType] = React.useState<LeaveType>("annual");
  const [startDate, setStartDate] = React.useState(todayIso());
  const [endDate, setEndDate] = React.useState(todayIso());
  const [reason, setReason] = React.useState("");
  const [document, setDocument] = React.useState<File | null>(null);
  const [docError, setDocError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  function resetForm() {
    setEmployeeId(lockToSelf ? user?.employeeId ?? "" : "");
    setType("annual");
    setStartDate(todayIso());
    setEndDate(todayIso());
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
  const requestedDays = daysBetween(startDate, endDate);
  const available = balance ? balance.total - balance.used : 0;
  const remainingAfter = available - requestedDays;
  const isOverLimit = Boolean(balance) && remainingAfter < 0;
  const usagePct =
    balance && balance.total > 0
      ? Math.min(100, ((balance.used + requestedDays) / balance.total) * 100)
      : 0;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const errors = validateLeaveRequest({ employeeId, type, startDate, endDate, reason });
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    const employee = employees.find((e) => e.id === employeeId);
    if (!employee) return;

    setSubmitting(true);
    try {
      let documentUrl: string | undefined;

      if (document) {
        const supabase = createClient();
        const ext = document.name.split(".").pop()?.toLowerCase() ?? "bin";
        const path = `${tenantId}/${employee.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from(LEAVE_DOC_BUCKET)
          .upload(path, document, { contentType: document.type });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from(LEAVE_DOC_BUCKET).getPublicUrl(path);
        documentUrl = urlData.publicUrl;
      }

      await addLeaveRequest({
        tenantId,
        employeeId: employee.id,
        type,
        startDate,
        endDate,
        days: daysBetween(startDate, endDate),
        reason: reason.trim(),
        documentUrl,
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
      <DialogContent className="flex flex-col gap-0 p-0 sm:max-w-md max-h-[85svh]">
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <DialogHeader className="shrink-0 border-b px-6 py-4">
            <DialogTitle>Request leave</DialogTitle>
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
                  {LEAVE_TYPES.map((leaveType) => (
                    <SelectItem key={leaveType} value={leaveType}>
                      {leaveTypeLabel(leaveType)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="startDate">Start date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (e.target.value > endDate) setEndDate(e.target.value);
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endDate">End date</Label>
                <Input
                  id="endDate"
                  type="date"
                  min={startDate}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
                {fieldErrors.endDate ? (
                  <p className="text-xs text-destructive">{fieldErrors.endDate}</p>
                ) : null}
              </div>
            </div>

            {balance ? (
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
            ) : (
              <p className="text-xs text-muted-foreground">
                {requestedDays} {requestedDays === 1 ? "day" : "days"} requested
              </p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="reason">Reason</Label>
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

          <DialogFooter className="shrink-0 border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
