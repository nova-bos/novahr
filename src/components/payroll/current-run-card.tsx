"use client";

import * as React from "react";
import { toast } from "sonner";
import { CalendarClock, CheckCircle2, Loader2, Play } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useApp } from "@/lib/store/app-provider";
import { useCurrentTenant, useEmployees, usePayrollRuns } from "@/lib/store/hooks";
import { calculateMonthlyPayroll } from "@/lib/payroll/calculator";
import { formatCurrency, formatDateLong, formatMonthYear } from "@/lib/format";
import { PayrollStatusBadge } from "./payroll-status-badge";
import { acceptPayrollDisclaimer } from "@/lib/payroll/disclaimer-actions";

export function CurrentRunCard() {
  const { startPayrollRun, completePayrollRun } = useApp();
  const tenant = useCurrentTenant();
  const runs = usePayrollRuns();
  const employees = useEmployees();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [disclaimerOpen, setDisclaimerOpen] = React.useState(false);
  const [disclaimerChecked, setDisclaimerChecked] = React.useState(false);
  const [isAccepting, startAcceptTransition] = React.useTransition();
  const [isStarting, startStartTransition] = React.useTransition();
  const [isFinalizing, startFinalizeTransition] = React.useTransition();

  const run = runs.find((r) => r.status === "scheduled" || r.status === "processing");

  if (!run) return null;

  const eligible = employees.filter(
    (e) => e.status !== "terminated" && e.startDate <= run.payDate
  );
  const projectedGross = eligible.reduce(
    (sum, e) => sum + calculateMonthlyPayroll(e).grossPay,
    0
  );
  const projectedNet = eligible.reduce((sum, e) => sum + calculateMonthlyPayroll(e).netPay, 0);

  function handleStart() {
    if (!run) return;
    startStartTransition(async () => {
      try {
        await startPayrollRun(run.id);
        toast.success("Payroll run started", {
          description: `${formatMonthYear(run.period)} payroll is now processing. Review and finalize to publish payslips.`,
        });
      } catch {
        toast.error("Couldn't start payroll run", {
          description: "Please try again.",
        });
      }
    });
  }

  function handleFinalize() {
    if (!run) return;
    startFinalizeTransition(async () => {
      try {
        await completePayrollRun(run.id);
        setConfirmOpen(false);
        toast.success("Payroll completed", {
          description: `Payslips for ${formatMonthYear(run.period)} have been published to ${eligible.length} employees.`,
        });
      } catch {
        toast.error("Couldn't complete payroll run", {
          description: "Please try again.",
        });
      }
    });
  }

  function handleDisclaimerContinue() {
    startAcceptTransition(async () => {
      try {
        await acceptPayrollDisclaimer();
        setDisclaimerOpen(false);
        setDisclaimerChecked(false);
        handleStart();
      } catch {
        toast.error("Could not record your acknowledgement", {
          description: "Please try again.",
        });
      }
    });
  }

  function handleDisclaimerCancel() {
    setDisclaimerOpen(false);
    setDisclaimerChecked(false);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="size-4 text-muted-foreground" />
            {formatMonthYear(run.period)} payroll
          </CardTitle>
          <PayrollStatusBadge status={run.status} />
        </div>
        <CardDescription>
          {run.status === "processing"
            ? "Currently processing. Review the totals below before publishing payslips."
            : "Upcoming run for the current pay period."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="min-w-0 rounded-xl border border-border/70 p-4">
            <p className="text-xs text-muted-foreground">Pay date</p>
            <p className="mt-1 truncate text-lg font-semibold tracking-tight tabular-nums">
              {formatDateLong(run.payDate)}
            </p>
          </div>
          <div className="min-w-0 rounded-xl border border-border/70 p-4">
            <p className="text-xs text-muted-foreground">Eligible employees</p>
            <p className="mt-1 truncate text-lg font-semibold tracking-tight tabular-nums">{eligible.length}</p>
          </div>
          <div className="min-w-0 rounded-xl border border-border/70 p-4">
            <p className="text-xs text-muted-foreground">Projected gross</p>
            <p className="mt-1 truncate text-lg font-semibold tracking-tight tabular-nums">
              {formatCurrency(projectedGross)}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2 border-t-0 bg-transparent pt-0">
        {run.status === "scheduled" ? (
          tenant.payrollDisclaimerAcceptedAt != null ? (
            <Button onClick={handleStart} disabled={isStarting}>
              {isStarting ? <Loader2 className="animate-spin" /> : <Play />}
              {isStarting ? "Starting..." : "Start payroll run"}
            </Button>
          ) : (
            <Button onClick={() => setDisclaimerOpen(true)} disabled={isStarting}>
              <Play />
              Start payroll run
            </Button>
          )
        ) : (
          <Button onClick={() => setConfirmOpen(true)}>
            <CheckCircle2 />
            Finalize &amp; publish payslips
          </Button>
        )}
      </CardFooter>

      {/* Payroll compliance disclaimer gate (first run only) */}
      <Dialog open={disclaimerOpen} onOpenChange={(open) => { if (!open) handleDisclaimerCancel(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payroll compliance acknowledgement</DialogTitle>
            <DialogDescription>
              Please read and accept the following before processing your first payroll run.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto rounded-lg border p-4 text-sm space-y-3">
            <p>
              NovaHR is <strong>software</strong> that helps you administer HR and payroll: it stores
              records, computes statutory amounts using published SARS and BCEA parameters, generates
              payslips, and produces reports. Nothing in the Service, its outputs, documentation, or
              support communications constitutes tax, legal, accounting, or financial advice.
            </p>

            <div>
              <p className="font-semibold mb-2">Division of responsibility</p>
              <ul className="space-y-1.5">
                <li>
                  <span className="font-medium">Tax tables and statutory rates:</span> NovaHR
                  maintains published SARS parameters. You must verify the configuration fits your
                  circumstances.
                </li>
                <li>
                  <span className="font-medium">Calculations:</span> NovaHR computes PAYE, UIF, SDL,
                  and leave from the data you enter. You must enter correct data: salaries,
                  allowances, dates of birth, dependants, pension rates, and working patterns.
                </li>
                <li>
                  <span className="font-medium">Payslips:</span> NovaHR generates BCEA-compliant
                  payslips from your data. You must review before publishing and deliver any required
                  printed copies.
                </li>
                <li>
                  <span className="font-medium">SARS submissions:</span> NovaHR provides the figures
                  and reports. You must file and pay EMP201 by the 7th, submit EMP501
                  reconciliations, and issue IRP5s.
                </li>
                <li>
                  <span className="font-medium">UIF declarations:</span> NovaHR provides contribution
                  amounts. You must register with UIF and submit UI-19/uFiling declarations.
                </li>
                <li>
                  <span className="font-medium">Employment law:</span> NovaHR provides BCEA-minimum
                  defaults. You must configure policies per your contracts, sector rules, and
                  bargaining councils.
                </li>
                <li>
                  <span className="font-medium">Record retention:</span> NovaHR retains data per the
                  Data Retention Policy while you subscribe. You must export and retain statutory
                  records (SARS 5 years, BCEA 3 years), especially before cancellation.
                </li>
                <li>
                  <span className="font-medium">Data protection:</span> NovaHR fulfils operator
                  duties under the DPA. You, as employer, fulfil Responsible Party duties under
                  POPIA toward your employees.
                </li>
              </ul>
            </div>

            <div className="rounded-lg border-l-4 border-primary bg-muted p-4">
              <p className="italic">
                "I understand that NovaHR is a software tool, that my company remains responsible for
                the accuracy of its payroll data and all statutory submissions, and that NovaHR does
                not provide tax, legal, or accounting advice."
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 pt-1">
            <Checkbox
              id="disclaimer-accept"
              checked={disclaimerChecked}
              onCheckedChange={(checked) => setDisclaimerChecked(checked === true)}
            />
            <label htmlFor="disclaimer-accept" className="text-sm leading-snug cursor-pointer">
              I have read and accept the payroll compliance terms above, on behalf of{" "}
              <span className="font-medium">{tenant.name}</span>.
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleDisclaimerCancel} disabled={isAccepting}>
              Cancel
            </Button>
            <Button
              onClick={handleDisclaimerContinue}
              disabled={!disclaimerChecked || isAccepting}
            >
              {isAccepting ? <Loader2 className="animate-spin" /> : null}
              {isAccepting ? "Recording..." : "Continue to payroll run"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Finalize confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalize {formatMonthYear(run.period)} payroll?</DialogTitle>
            <DialogDescription>
              This will generate payslips for {eligible.length} employees and mark this run as
              completed. Employees will be notified once payslips are published.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="min-w-0 rounded-xl border border-border/70 p-3">
              <p className="text-xs text-muted-foreground">Total gross</p>
              <p className="mt-1 truncate text-base font-semibold tabular-nums">{formatCurrency(projectedGross)}</p>
            </div>
            <div className="min-w-0 rounded-xl border border-border/70 p-3">
              <p className="text-xs text-muted-foreground">Total net</p>
              <p className="mt-1 truncate text-base font-semibold tabular-nums">{formatCurrency(projectedNet)}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={isFinalizing}>
              Cancel
            </Button>
            <Button onClick={handleFinalize} disabled={isFinalizing}>
              {isFinalizing ? <Loader2 className="animate-spin" /> : null}
              {isFinalizing ? "Publishing..." : "Confirm & publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
