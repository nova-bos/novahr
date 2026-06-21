"use client";

import { useRouter } from "next/navigation";
import { History } from "lucide-react";
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
import { formatCurrency, formatDate, formatMonthYear } from "@/lib/format";
import { PayrollStatusBadge } from "./payroll-status-badge";

export function PayrollHistory() {
  const runs = usePayrollRuns();
  const router = useRouter();

  const sorted = runs
    .filter((run) => run.status === "completed")
    .sort((a, b) => (a.period < b.period ? 1 : -1));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payroll history</CardTitle>
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
          <div className="overflow-x-auto rounded-xl border border-border">
          <Table className="min-w-[600px] w-full">
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Pay date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Employees</TableHead>
                <TableHead className="text-right">Gross</TableHead>
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
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(run.totalNet)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
