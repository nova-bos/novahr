"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label, OptionalTag } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/format";
import type { Employee } from "@/lib/types";
import { terminateEmployeeAction } from "@/lib/employees/terminate-action";

const REASONS = [
  { value: "resignation", label: "Resignation" },
  { value: "retrenchment", label: "Retrenchment" },
  { value: "dismissal", label: "Dismissal" },
  { value: "retirement", label: "Retirement" },
  { value: "contract_end", label: "Contract end" },
  { value: "other", label: "Other" },
] as const;

type TerminationReason = (typeof REASONS)[number]["value"];

export function TerminateEmployeeDialog({
  employee,
  open,
  onOpenChange,
}: {
  employee: Employee;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [terminationDate, setTerminationDate] = React.useState(today);
  const [reason, setReason] = React.useState<TerminationReason>("resignation");
  const [noticeDaysServed, setNoticeDaysServed] = React.useState("14");
  const [finalPayDate, setFinalPayDate] = React.useState(today);
  const [notes, setNotes] = React.useState("");
  const [confirmed, setConfirmed] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const dailyRate = employee.salary.annualGross / 261;
  const noticeDaysOwed = 14;
  const noticePay = Math.max(0, (noticeDaysOwed - Number(noticeDaysServed)) * dailyRate);
  const annualBalance = employee.leaveBalances.find((b) => b.type === "annual");
  // Pay out earned-but-unused leave: under accrual that is the accrued amount,
  // not the full annual entitlement (floored so a negative balance is not a
  // deduction from the payout).
  const annualEntitlement = annualBalance ? annualBalance.accrued ?? annualBalance.total : 0;
  const remainingAnnual = annualBalance ? Math.max(0, annualEntitlement - annualBalance.used) : 0;
  const leavePayout = remainingAnnual * dailyRate;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!confirmed) return;
    setSaving(true);
    try {
      const result = await terminateEmployeeAction({
        employeeId: employee.id,
        terminationDate,
        reason,
        noticeDaysServed: Number(noticeDaysServed),
        finalPayDate,
        notes: notes || undefined,
      });
      if (result.success) {
        toast.success("Employee terminated", {
          description: `${employee.firstName} ${employee.lastName} has been terminated.`,
        });
        onOpenChange(false);
      } else {
        toast.error(result.error ?? "Failed to terminate employee");
      }
    } catch (err) {
      toast.error("Error", { description: err instanceof Error ? err.message : "Please try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-destructive">Terminate employment</DialogTitle>
          <DialogDescription>
            Terminates {employee.firstName} {employee.lastName}. This action deactivates their payroll profile.
          </DialogDescription>
        </DialogHeader>

        <form id="terminate-form" onSubmit={handleSubmit}>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="term-date">Termination date</Label>
              <DatePicker
                id="term-date"
                value={terminationDate}
                onValueChange={setTerminationDate}
                placeholder="Select termination date"
                disabled={saving}
                captionLayout="dropdown"
                fromYear={new Date().getFullYear() - 2}
                toYear={new Date().getFullYear() + 1}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="final-pay">Final pay date</Label>
              <DatePicker
                id="final-pay"
                value={finalPayDate}
                onValueChange={setFinalPayDate}
                placeholder="Select final pay date"
                disabled={saving}
                captionLayout="dropdown"
                fromYear={new Date().getFullYear() - 2}
                toYear={new Date().getFullYear() + 1}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="term-reason">Reason</Label>
              <Select value={reason} onValueChange={(v) => setReason(v as TerminationReason)} disabled={saving}>
                <SelectTrigger id="term-reason">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notice-days">Notice days served</Label>
              <Input
                id="notice-days"
                type="number"
                min={0}
                max={90}
                value={noticeDaysServed}
                onChange={(e) => setNoticeDaysServed(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="term-notes">Notes <OptionalTag /></Label>
              <Textarea
                id="term-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional context for the record"
                disabled={saving}
              />
            </div>
          </div>

          {/* Summary box */}
          <div className="mt-5 rounded-lg bg-muted/50 p-4 space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Settlement estimate</p>
            <div className="flex justify-between text-sm">
              <span>Notice pay outstanding</span>
              <span className="font-medium">{formatCurrency(noticePay)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Annual leave payout ({remainingAnnual.toFixed(1)} days)</span>
              <span className="font-medium">{formatCurrency(leavePayout)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold border-t border-border/50 pt-1.5 mt-1">
              <span>Estimated total</span>
              <span>{formatCurrency(noticePay + leavePayout)}</span>
            </div>
          </div>

          {/* Confirmation */}
          <div className="mt-5 flex items-start gap-3">
            <Checkbox
              id="term-confirm"
              checked={confirmed}
              onCheckedChange={(c) => setConfirmed(Boolean(c))}
              disabled={saving}
            />
            <Label htmlFor="term-confirm" className="text-sm leading-snug cursor-pointer">
              I confirm this termination has been properly documented and has the required approvals.
            </Label>
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            form="terminate-form"
            type="submit"
            variant="destructive"
            disabled={!confirmed || saving}
          >
            {saving ? "Terminating..." : "Confirm termination"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
