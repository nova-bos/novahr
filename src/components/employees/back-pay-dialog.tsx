"use client";

import * as React from "react";
import { toast } from "sonner";
import { CalendarClock } from "lucide-react";
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
import { addBackPayAction } from "@/lib/payroll/back-pay-actions";

export function BackPayDialog({ employee }: { employee: Employee }) {
  const { user } = useAuth();
  const { reloadWorkspace } = useApp();
  const [open, setOpen] = React.useState(false);
  const [monthly, setMonthly] = React.useState("");
  const [months, setMonths] = React.useState("");
  const [note, setNote] = React.useState("");
  const [saving, startSave] = React.useTransition();

  if (user?.role !== "hr") return null;

  const monthlyNum = Number(monthly);
  const monthsNum = Number(months);
  const amount =
    monthlyNum > 0 && monthsNum > 0 ? Math.round(monthlyNum * monthsNum * 100) / 100 : 0;

  function submit() {
    if (!(amount > 0)) {
      toast.error("Enter a monthly shortfall and number of months.");
      return;
    }
    startSave(async () => {
      try {
        const result = await addBackPayAction({ employeeId: employee.id, amount, note });
        reloadWorkspace();
        setOpen(false);
        setMonthly("");
        setMonths("");
        setNote("");
        toast.success("Back pay added", {
          description: `${formatCurrency(result.amount)} added to the ${result.runPeriod} pay run.`,
        });
      } catch (err) {
        toast.error("Could not add back pay", {
          description: err instanceof Error ? err.message : "Please try again.",
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && setOpen(o)}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CalendarClock className="size-4" />
          Back pay / arrears
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add back pay (arrears)</DialogTitle>
          <DialogDescription>
            For a back-dated increase, enter the monthly shortfall and how many months it applies
            to. The total is added to the current open run as a back-pay line, taxed via the SARS
            annual-payment method.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bp-monthly">Monthly shortfall (R)</Label>
              <Input
                id="bp-monthly"
                type="number"
                min={0}
                step="0.01"
                value={monthly}
                onChange={(e) => setMonthly(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bp-months">Number of months</Label>
              <Input
                id="bp-months"
                type="number"
                min={0}
                step="1"
                value={months}
                onChange={(e) => setMonths(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bp-note">
              Reason <span className="text-xs text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="bp-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. April increase backdated"
            />
          </div>
          {amount > 0 ? (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
              Total back pay: <span className="font-semibold">{formatCurrency(amount)}</span>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving || !(amount > 0)}>
            {saving ? "Adding..." : "Add back pay"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
