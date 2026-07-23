"use client";

import * as React from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useScopedEmployees, useScopedLeaveRequests } from "@/lib/auth/scope";
import { useAuth } from "@/lib/auth/auth-provider";
import { getInitials } from "@/lib/format";
import type { LeaveType } from "@/lib/types";

// Accrual-style balances shown per employee. Event-based statutory leave
// (maternity, parental, adoption, commissioning) is tracked when requested
// rather than as a running balance column.
const COLUMNS: { type: LeaveType; label: string }[] = [
  { type: "annual", label: "Annual" },
  { type: "sick", label: "Sick" },
  { type: "family", label: "Family" },
  { type: "study", label: "Study" },
  { type: "unpaid", label: "Unpaid" },
];

export function LeaveBalancesTable() {
  const employees = useScopedEmployees();
  const leaveRequests = useScopedLeaveRequests();
  const { user } = useAuth();
  const active = employees.filter((e) => e.status !== "terminated");

  // Pre-build a pending-days lookup keyed by "employeeId:type" so each cell
  // can subtract pending without scanning the full request list each time.
  const pendingMap = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const r of leaveRequests) {
      if (r.status !== "pending") continue;
      const key = `${r.employeeId}:${r.type}`;
      map.set(key, (map.get(key) ?? 0) + r.days);
    }
    return map;
  }, [leaveRequests]);

  const selfEmployee = active.find((employee) => employee.id === user?.employeeId);

  if (user?.role === "employee" && selfEmployee) {
    return (
      <Card>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm font-medium">Your leave balances</p>
            <p className="text-xs text-muted-foreground">
              Pending requests are included in the available balance.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {COLUMNS.map((col) => {
              const balance = selfEmployee.leaveBalances.find((item) => item.type === col.type);
              if (!balance) return null;
              const pendingDays = pendingMap.get(`${selfEmployee.id}:${col.type}`) ?? 0;
              const effectiveUsed = balance.used + pendingDays;
              const entitlement = balance.accrued ?? balance.total;
              const remaining = entitlement - effectiveUsed;
              const percentage =
                entitlement > 0 ? Math.min(100, (effectiveUsed / entitlement) * 100) : 0;
              return (
                <div key={col.type} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">{col.label}</span>
                    <span
                      className={`font-medium tabular-nums ${remaining < 0 ? "text-destructive" : ""}`}
                    >
                      {remaining} left
                    </span>
                  </div>
                  <Progress value={percentage} className="mt-2.5 h-1.5" />
                  <p className="mt-2 text-xs text-muted-foreground tabular-nums">
                    {effectiveUsed}/{entitlement} used
                    {pendingDays > 0 ? `, ${pendingDays} pending` : ""}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <div className="overflow-x-auto rounded-xl border border-border">
        <Table className="min-w-[600px] w-full">
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              {COLUMNS.map((col) => (
                <TableHead key={col.type} className="w-40">
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {active.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell>
                  <Link
                    href={`/employees/${employee.id}`}
                    className="flex items-center gap-3 hover:underline"
                  >
                    <Avatar size="sm">
                      {employee.photoUrl ? (
                        <AvatarImage src={employee.photoUrl} alt={`${employee.firstName} ${employee.lastName}`} />
                      ) : null}
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
                        {employee.department}
                      </span>
                    </div>
                  </Link>
                </TableCell>
                {COLUMNS.map((col) => {
                  const balance = employee.leaveBalances.find((b) => b.type === col.type);
                  if (!balance) return <TableCell key={col.type} />;
                  const pendingDays = pendingMap.get(`${employee.id}:${col.type}`) ?? 0;
                  const effectiveUsed = balance.used + pendingDays;
                  const entitlement = balance.accrued ?? balance.total;
                  const remaining = entitlement - effectiveUsed;
                  const percentage =
                    entitlement > 0 ? Math.min(100, (effectiveUsed / entitlement) * 100) : 0;
                  return (
                    <TableCell key={col.type}>
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className={`font-medium ${remaining < 0 ? "text-destructive" : ""}`}>
                            {remaining} left
                          </span>
                          <span className="text-muted-foreground">
                            {effectiveUsed}/{entitlement}
                            {pendingDays > 0 && (
                              <span className="ml-1 text-warning">({pendingDays} pending)</span>
                            )}
                          </span>
                        </div>
                        <Progress value={percentage} className="h-1.5" />
                      </div>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </CardContent>
    </Card>
  );
}
