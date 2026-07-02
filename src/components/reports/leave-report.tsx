"use client";

import * as React from "react";
import { CalendarCheck, CheckCircle2, Clock, Download, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEmployees, useLeaveRequests } from "@/lib/store/hooks";
import { leaveTypeLabel } from "@/lib/format";
import { toCSV, downloadCSV } from "@/lib/export/csv";
import { StatCardGrid, type StatItem } from "@/components/dashboard/stat-card-grid";
import type { LeaveType } from "@/lib/types";
import { LeaveUsageChart } from "./leave-usage-chart";

const TYPES: LeaveType[] = ["annual", "sick", "family", "unpaid"];

export function LeaveReport() {
  const requests = useLeaveRequests();
  const employees = useEmployees();
  const active = employees.filter((e) => e.status !== "terminated");

  const approved = requests.filter((r) => r.status === "approved");
  const pending = requests.filter((r) => r.status === "pending");
  const rejected = requests.filter((r) => r.status === "rejected");

  const approvedDays = approved.reduce((sum, r) => sum + r.days, 0);
  const decided = approved.length + rejected.length;
  const approvalRate = decided > 0 ? (approved.length / decided) * 100 : 100;

  const balanceRows = React.useMemo(() => {
    return TYPES.map((type) => {
      const balances = active
        .map((e) => e.leaveBalances.find((b) => b.type === type))
        .filter((b): b is NonNullable<typeof b> => Boolean(b));
      const totalSum = balances.reduce((sum, b) => sum + b.total, 0);
      const usedSum = balances.reduce((sum, b) => sum + b.used, 0);
      const avgTotal = balances.length > 0 ? totalSum / balances.length : 0;
      const avgUsed = balances.length > 0 ? usedSum / balances.length : 0;
      const utilization = totalSum > 0 ? (usedSum / totalSum) * 100 : 0;
      return { type, avgTotal, avgUsed, avgRemaining: avgTotal - avgUsed, utilization };
    });
  }, [active]);

  const overallUtilization =
    balanceRows.reduce((sum, r) => sum + r.utilization, 0) / balanceRows.length;

  function handleExport() {
    const csv = toCSV(
      ["Leave Type", "Avg. Entitlement (days)", "Avg. Used (days)", "Avg. Remaining (days)", "Utilization (%)"],
      balanceRows.map((row) => [
        leaveTypeLabel(row.type),
        row.avgTotal.toFixed(1),
        row.avgUsed.toFixed(1),
        row.avgRemaining.toFixed(1),
        Math.round(row.utilization),
      ])
    );
    downloadCSV(csv, `leave-report-${new Date().toISOString().slice(0, 10)}`);
  }

  const stats: StatItem[] = [
    {
      label: "Approved leave days",
      value: approvedDays.toString(),
      detail: `${approved.length} requests approved`,
      icon: CalendarCheck,
      iconClassName: "bg-success/10 text-success",
    },
    {
      label: "Pending requests",
      value: pending.length.toString(),
      detail: "Awaiting review",
      icon: Clock,
      iconClassName: "bg-warning/10 text-warning",
    },
    {
      label: "Approval rate",
      value: `${Math.round(approvalRate)}%`,
      detail: `${rejected.length} declined`,
      icon: CheckCircle2,
      iconClassName: "bg-info/10 text-info",
    },
    {
      label: "Avg balance used",
      value: `${Math.round(overallUtilization)}%`,
      detail: "Across all leave types",
      icon: Gauge,
      iconClassName: "bg-primary/10 text-primary",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <StatCardGrid stats={stats} />

      <LeaveUsageChart />

      <Card>
        <CardHeader>
          <CardTitle>Leave balance utilization</CardTitle>
          <CardAction>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="size-4" />
              Export CSV
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border border-border">
          <Table className="min-w-[560px] w-full">
            <TableHeader>
              <TableRow>
                <TableHead>Leave type</TableHead>
                <TableHead className="text-right">Avg. entitlement</TableHead>
                <TableHead className="text-right">Avg. used</TableHead>
                <TableHead className="text-right">Avg. remaining</TableHead>
                <TableHead className="w-48">Utilization</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {balanceRows.map((row) => (
                <TableRow key={row.type}>
                  <TableCell className="font-medium">{leaveTypeLabel(row.type)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {row.avgTotal.toFixed(1)} days
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.avgUsed.toFixed(1)} days
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {row.avgRemaining.toFixed(1)} days
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={row.utilization} className="h-1.5" />
                      <span className="w-10 shrink-0 text-right text-xs text-muted-foreground">
                        {Math.round(row.utilization)}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
