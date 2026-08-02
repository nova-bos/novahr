"use client";

import * as React from "react";
import { toast } from "sonner";
import { Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth/auth-provider";
import { useApp } from "@/lib/store/app-provider";
import { formatCurrency } from "@/lib/format";
import type { Employee } from "@/lib/types";
import { encashLeaveAction } from "@/lib/leave/encashment-actions";

const WORKING_DAYS_PER_YEAR = 260;

export function LeaveEncashmentDialog({ employee }: { employee: Employee }) {
  const { user } = useAuth();
  const { reloadWorkspace } = useApp();
  const [open, setOpen] = React.useState(false);
  const [days, setDays] = React.useState("");
  const [saving, startSave] = React.useTransition();

  if (user?.role !== "hr") return null;

  const annual = employee.leaveBalances.find((b) => b.type === "annual");
  const available = annual ? annual.total - annual.used : 0;
  const dailyRate = employee.salary.annualGross / WORKING_DAYS_PER_YEAR;
  const parsedDays = Number(days);
  const estimate = parsedDays > 0 ? Math.round(parsedDays * dailyRate * 100) / 100 : 0;
  const invalid = !(parsedDays > 0) || parsedDays > available;

  function submit() {
    startSave(async () => {
      try {
        const result = await encashLeaveAction({ employeeId: employee.id, days: parsedDays });
        reloadWorkspace();
        setOpen(false);
        setDays("");
        toast.success(`Encashed ${result.days} day(s)`, {
          description: `${formatCurrency(result.amount)} added to the ${result.runPeriod} pay run.`,
        });
      } catch (err) {
        toast.error("Could not encash leave", {
          description: err instanceof Error ? err.message : "Please try again.",
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && setOpen(o)}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Banknote className="size-4" />
          Encash leave
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Encash annual leave</DialogTitle>
          <DialogDescription>
            Pay out unused annual leave as a cash line on the current open pay run. The days are
            deducted from {employee.firstName}&apos;s balance.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="encash-days">Days to encash</Label>
            <Input
              id="encash-days"
              type="number"
              min={0}
              max={available}
              step="0.5"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground">
              {available} day{available === 1 ? "" : "s"} available · about {formatCurrency(dailyRate)}{" "}
              per day
            </p>
          </div>
          {parsedDays > available ? (
            <p className="text-xs text-destructive">Only {available} day(s) are available.</p>
          ) : estimate > 0 ? (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
              Estimated payout: <span className="font-semibold">{formatCurrency(estimate)}</span>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving || invalid}>
            {saving ? "Encashing..." : "Encash leave"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
