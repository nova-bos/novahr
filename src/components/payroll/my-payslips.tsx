"use client";

import * as React from "react";
import { Banknote, CalendarClock, FileText, FileX, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCardGrid, type StatItem } from "@/components/dashboard/stat-card-grid";
import { useCurrentEmployee } from "@/lib/auth/scope";
import { usePayrollRuns, usePayslipsByEmployee } from "@/lib/store/hooks";
import { calculateMonthlyPayroll } from "@/lib/payroll/calculator";
import { formatCurrency, formatCurrencyCompact, formatDate, formatMonthYear } from "@/lib/format";
import type { Payslip } from "@/lib/types";
import { PayslipDialog } from "./payslip-dialog";

export function MyPayslips() {
  const employee = useCurrentEmployee();
  const payslips = usePayslipsByEmployee(employee?.id);
  const runs = usePayrollRuns();

  const [selected, setSelected] = React.useState<Payslip | null>(null);
  const [open, setOpen] = React.useState(false);

  if (!employee) return null;

  const latest = payslips[0];
  const ytdNet = payslips.reduce((sum, p) => sum + p.netPay, 0);
  const monthly = calculateMonthlyPayroll(employee);
  const upcomingRun = runs.find((r) => r.status === "scheduled" || r.status === "processing");

  const stats: StatItem[] = [
    {
      label: "Latest net pay",
      value: latest ? formatCurrency(latest.netPay) : "—",
      detail: latest ? formatMonthYear(latest.period) : "No payslips yet",
      icon: Wallet,
      iconClassName: "bg-primary/10 text-primary",
    },
    {
      label: "Monthly gross",
      value: formatCurrency(monthly.grossPay),
      detail: "Current salary",
      icon: Banknote,
      iconClassName: "bg-success/10 text-success",
    },
    {
      label: "Year to date",
      value: formatCurrencyCompact(ytdNet),
      detail: `${payslips.length} payslip${payslips.length === 1 ? "" : "s"}`,
      icon: FileText,
      iconClassName: "bg-info/10 text-info",
    },
    {
      label: "Next pay date",
      value: upcomingRun ? formatDate(upcomingRun.payDate, { day: "numeric", month: "short" }) : "—",
      detail: upcomingRun ? formatMonthYear(upcomingRun.period) : "No run scheduled",
      icon: CalendarClock,
      iconClassName: "bg-warning/10 text-warning",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <StatCardGrid stats={stats} />
      <Card>
        <CardHeader>
          <CardTitle>Payslip history</CardTitle>
        </CardHeader>
        <CardContent>
          {payslips.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
                <FileX className="size-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No payslips have been published yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Pay date</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {payslips.map((payslip) => (
                  <TableRow key={payslip.id}>
                    <TableCell className="font-medium">{formatMonthYear(payslip.period)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(payslip.payDate)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatCurrency(payslip.grossPay)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatCurrency(payslip.netPay)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelected(payslip);
                          setOpen(true);
                        }}
                      >
                        <FileText />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <PayslipDialog employee={employee} payslip={selected} open={open} onOpenChange={setOpen} />
    </div>
  );
}
