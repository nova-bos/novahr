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
import { useApp } from "@/lib/store/app-provider";
import { useTenantId } from "@/lib/store/hooks";
import { useAuth } from "@/lib/auth/auth-provider";
import { useScopedEmployees } from "@/lib/auth/scope";
import { leaveTypeLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { LeaveType } from "@/lib/types";

const LEAVE_TYPES: LeaveType[] = ["annual", "sick", "family", "unpaid"];

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

  function resetForm() {
    setEmployeeId(lockToSelf ? user?.employeeId ?? "" : "");
    setType("annual");
    setStartDate(todayIso());
    setEndDate(todayIso());
    setReason("");
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

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const employee = employees.find((e) => e.id === employeeId);
    if (!employee) return;

    addLeaveRequest({
      id: `${tenantId}-leave-${Date.now()}`,
      tenantId,
      employeeId: employee.id,
      type,
      startDate,
      endDate,
      days: daysBetween(startDate, endDate),
      reason: reason.trim(),
      status: "pending",
      appliedOn: todayIso(),
    });

    toast.success("Leave request submitted", {
      description: `${employee.firstName} ${employee.lastName}'s request is awaiting approval.`,
    });
    resetForm();
    setOpen(false);
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
        <Button>
          <Plus />
          Request leave
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Request leave</DialogTitle>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-4">
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
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!employeeId || !reason.trim()}>
              Submit request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
