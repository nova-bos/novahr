"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { useActiveBranches } from "@/lib/store/hooks";
import { useApp } from "@/lib/store/app-provider";
import { createOffCyclePayrollRunAction } from "@/lib/payroll/actions";

function defaultPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function defaultPayDate(): string {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

/**
 * Creates an off-cycle payroll run (a bonus run or a correction) outside the
 * normal monthly schedule. On success it reloads the workspace and navigates to
 * the new run's detail page, where the user can add variable pay and finalise it
 * independently of the regular run.
 */
export function CreateOffCycleRun() {
  const router = useRouter();
  const branches = useActiveBranches();
  const { reloadWorkspace } = useApp();
  const [open, setOpen] = React.useState(false);
  const [period, setPeriod] = React.useState(defaultPeriod);
  const [payDate, setPayDate] = React.useState(defaultPayDate);
  const [reason, setReason] = React.useState("");
  const [branchId, setBranchId] = React.useState<string>("all");
  const [frequency, setFrequency] = React.useState<string>("all");
  const [isSaving, startSaveTransition] = React.useTransition();

  function handleCreate() {
    startSaveTransition(async () => {
      try {
        const run = await createOffCyclePayrollRunAction({
          period,
          payDate,
          reason: reason.trim() || undefined,
          branchId: branchId === "all" ? null : branchId,
          payFrequency:
            frequency === "all" ? null : (frequency as "monthly" | "biweekly" | "weekly"),
        });
        setOpen(false);
        setReason("");
        reloadWorkspace();
        toast.success("Off-cycle run created", {
          description: "Add variable pay, then start and finalise it.",
        });
        router.push(`/payroll/${run.id}`);
      } catch (err) {
        toast.error("Could not create the run", {
          description: err instanceof Error ? err.message : "Please try again.",
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !isSaving && setOpen(o)}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full sm:w-auto">
          <CalendarPlus className="mr-2 size-4" />
          Create off-cycle run
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create an off-cycle run</DialogTitle>
          <DialogDescription>
            An ad-hoc run outside the normal monthly schedule, for a bonus, a correction, or a
            separate pay group (e.g. weekly-paid staff). It finalises independently of your regular
            monthly run.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="offcycle-period">Period</Label>
            <Input
              id="offcycle-period"
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="offcycle-paydate">Pay date</Label>
            <DatePicker
              id="offcycle-paydate"
              value={payDate}
              onValueChange={setPayDate}
              placeholder="Select pay date"
              captionLayout="dropdown"
              fromYear={new Date().getFullYear() - 1}
              toYear={new Date().getFullYear() + 1}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="offcycle-reason">Reason (optional)</Label>
            <Input
              id="offcycle-reason"
              placeholder="e.g. Q3 bonus, March correction"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="offcycle-frequency">Pay group</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger id="offcycle-frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All employees</SelectItem>
                <SelectItem value="monthly">Monthly-paid only</SelectItem>
                <SelectItem value="biweekly">Fortnightly-paid only</SelectItem>
                <SelectItem value="weekly">Weekly-paid only</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Scope the run to a pay frequency so weekly and monthly staff are paid separately.
            </p>
          </div>
          {branches.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="offcycle-branch">Run for</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger id="offcycle-branch">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Whole company</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isSaving}>
            {isSaving ? "Creating..." : "Create run"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
