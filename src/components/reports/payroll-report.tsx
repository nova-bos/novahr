"use client";

import { useRouter } from "next/navigation";
import { Banknote, FileText, History, ShieldCheck, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePayrollRuns } from "@/lib/store/hooks";
import { formatCurrency, formatCurrencyCompact, formatDate, formatMonthYear } from "@/lib/format";
import { PayrollStatusBadge } from "@/components/payroll/payroll-status-badge";
import { StatCardGrid, type StatItem } from "@/components/dashboard/stat-card-grid";
import { PayrollCompositionChart } from "./payroll-composition-chart";

export function PayrollReport() {
  const runs = usePayrollRuns();
  const router = useRouter();
  const completed = runs.filter((r) => r.status === "completed");
  const sorted = completed.slice().sort((a, b) => (a.period < b.period ? 1 : -1));

  const ytdGross = completed.reduce((sum, r) => sum + r.totalGross, 0);
  const ytdNet = completed.reduce((sum, r) => sum + r.totalNet, 0);
  const ytdPaye = completed.reduce((sum, r) => sum + r.totalPaye, 0);
  const ytdUif = completed.reduce((sum, r) => sum + r.totalUif, 0);

  const stats: StatItem[] = [
    {
      label: "YTD gross pay",
      value: formatCurrencyCompact(ytdGross),
      detail: `${completed.length} completed pay runs`,
      icon: Wallet,
      iconClassName: "bg-primary/10 text-primary",
    },
    {
      label: "YTD net pay",
      value: formatCurrencyCompact(ytdNet),
      detail: "Paid out to employees",
      icon: Banknote,
      iconClassName: "bg-success/10 text-success",
    },
    {
      label: "YTD PAYE withheld",
      value: formatCurrencyCompact(ytdPaye),
      detail: "Remitted to SARS",
      icon: FileText,
      iconClassName: "bg-info/10 text-info",
    },
    {
      label: "YTD UIF contributions",
      value: formatCurrencyCompact(ytdUif),
      detail: "Capped at R177.12 / employee",
      icon: ShieldCheck,
      iconClassName: "bg-warning/10 text-warning",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <StatCardGrid stats={stats} />

      <PayrollCompositionChart />

      <Card>
        <CardHeader>
          <CardTitle>Payroll run history</CardTitle>
        </CardHeader>
        <CardContent>
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
                <History className="size-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No payroll runs yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Pay date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Employees</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">PAYE</TableHead>
                  <TableHead className="text-right">UIF</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((run) => (
                  <TableRow
                    key={run.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/payroll/${run.id}`)}
                  >
                    <TableCell className="font-medium">{formatMonthYear(run.period)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(run.payDate)}
                    </TableCell>
                    <TableCell>
                      <PayrollStatusBadge status={run.status} />
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {run.employeeCount}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(run.totalGross)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {formatCurrency(run.totalPaye)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {formatCurrency(run.totalUif)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(run.totalNet)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
