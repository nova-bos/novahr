"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency, formatDateLong, formatMonthYear } from "@/lib/format";
import { usePayrollRuns, useTenantId } from "@/lib/store/hooks";
import { usePlan } from "@/lib/plan/use-plan";
import { submitNetcashBatchAction } from "@/lib/bank-exports/actions";

// The primary action on the payroll dashboard: pay the most recent
// completed run through Netcash.
export function SubmitNetcashCta() {
  const tenantId = useTenantId();
  const runs = usePayrollRuns();
  const { can } = usePlan();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [isSubmitting, startSubmitTransition] = React.useTransition();
  const [submittedRunId, setSubmittedRunId] = React.useState<string | null>(null);

  if (!can("bankExports")) return null;

  const run = runs
    .filter((r) => r.status === "completed")
    .sort((a, b) => (a.payDate < b.payDate ? 1 : -1))[0];

  if (!run || submittedRunId === run.id) return null;

  function handleSubmit() {
    if (!run) return;
    startSubmitTransition(async () => {
      const result = await submitNetcashBatchAction(tenantId, run.id);
      if (result.error) {
        toast.error("Netcash submission failed", { description: result.error });
        return;
      }
      setConfirmOpen(false);
      setSubmittedRunId(run.id);
      toast.success("Payroll submitted to Netcash", {
        description: `File token: ${result.token}. Netcash will email the load report.`,
      });
    });
  }

  return (
    <section
      aria-label="Submit payroll to Netcash"
      className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4 sm:p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <h2 className="text-base font-semibold tracking-tight">
          {formatMonthYear(run.period)} payroll is ready to pay
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {run.employeeCount} employees · {formatCurrency(run.totalNet)} net · pay date{" "}
          {formatDateLong(run.payDate)}
        </p>
      </div>
      <Button
        size="lg"
        onClick={() => setConfirmOpen(true)}
        disabled={isSubmitting}
        className="shrink-0"
      >
        {isSubmitting ? (
          <Loader2 data-icon="inline-start" className="size-4 animate-spin" />
        ) : (
          <Send data-icon="inline-start" className="size-4" />
        )}
        {isSubmitting ? "Submitting..." : "Submit payroll to Netcash"}
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit {formatMonthYear(run.period)} payroll to Netcash?</DialogTitle>
            <DialogDescription>
              This uploads the salary batch to Netcash for payment on{" "}
              {formatDateLong(run.payDate)}. Confirm the totals before submitting.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="min-w-0 rounded-xl border border-border/70 p-3">
              <p className="text-xs text-muted-foreground">Employees paid</p>
              <p className="mt-1 truncate text-base font-semibold tabular-nums">{run.employeeCount}</p>
            </div>
            <div className="min-w-0 rounded-xl border border-border/70 p-3">
              <p className="text-xs text-muted-foreground">Total net pay</p>
              <p className="mt-1 truncate text-base font-semibold tabular-nums">
                {formatCurrency(run.totalNet)}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 data-icon="inline-start" className="size-4 animate-spin" />
              ) : (
                <Send data-icon="inline-start" className="size-4" />
              )}
              {isSubmitting ? "Submitting..." : "Confirm & submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
