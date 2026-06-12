"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Banknote, Receipt, ReceiptText, Wallet } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDateLong, getInitials } from "@/lib/format";
import { useEmployees, usePayslipsByRun } from "@/lib/store/hooks";
import type { PayrollRun, Payslip } from "@/lib/types";
import { StatCardGrid, type StatItem } from "@/components/dashboard/stat-card-grid";
import { PayrollStatusBadge } from "./payroll-status-badge";
import { PayslipDialog } from "./payslip-dialog";

export function PayrollRunDetail({ run }: { run: PayrollRun }) {
  const payslips = usePayslipsByRun(run.id);
  const employees = useEmployees();
  const [selected, setSelected] = React.useState<Payslip | null>(null);

  const employeeById = React.useMemo(() => {
    const map = new Map<string, (typeof employees)[number]>();
    for (const employee of employees) map.set(employee.id, employee);
    return map;
  }, [employees]);

  const selectedEmployee = selected ? employeeById.get(selected.employeeId) : undefined;

  const stats: StatItem[] = [
    {
      label: "Total gross",
      value: formatCurrency(run.totalGross),
      icon: Banknote,
      iconClassName: "bg-primary/10 text-primary",
    },
    {
      label: "PAYE withheld",
      value: formatCurrency(run.totalPaye),
      icon: Receipt,
      iconClassName: "bg-warning/10 text-warning",
    },
    {
      label: "UIF contributions",
      value: formatCurrency(run.totalUif),
      icon: ReceiptText,
      iconClassName: "bg-info/10 text-info",
    },
    {
      label: "Total net pay",
      value: formatCurrency(run.totalNet),
      icon: Wallet,
      iconClassName: "bg-success/10 text-success",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/payroll"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to payroll
      </Link>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight">{run.label}</h2>
            <PayrollStatusBadge status={run.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Pay date {formatDateLong(run.payDate)}
            {run.processedOn ? ` · Processed ${formatDateLong(run.processedOn)}` : ""}
          </p>
        </div>
      </div>

      <StatCardGrid stats={stats} />

      <Card>
        <CardHeader>
          <CardTitle>Payslips ({payslips.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Deductions</TableHead>
                <TableHead className="text-right">Net pay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payslips.map((payslip) => {
                const employee = employeeById.get(payslip.employeeId);
                if (!employee) return null;
                return (
                  <TableRow
                    key={payslip.id}
                    className="cursor-pointer"
                    onClick={() => setSelected(payslip)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar size="sm">
                          <AvatarFallback
                            className="text-white"
                            style={{ backgroundColor: employee.avatarColor }}
                          >
                            {getInitials(employee.firstName, employee.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-sm font-medium">
                            {employee.firstName} {employee.lastName}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {employee.jobTitle}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{employee.department}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatCurrency(payslip.grossPay)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                      -{formatCurrency(payslip.totalDeductions)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium tabular-nums">
                      {formatCurrency(payslip.netPay)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedEmployee ? (
        <PayslipDialog
          employee={selectedEmployee}
          payslip={selected}
          open={Boolean(selected)}
          onOpenChange={(open) => !open && setSelected(null)}
        />
      ) : null}
    </div>
  );
}
