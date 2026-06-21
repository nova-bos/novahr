"use client";

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
import { useScopedEmployees } from "@/lib/auth/scope";
import { getInitials } from "@/lib/format";
import type { LeaveType } from "@/lib/types";

const COLUMNS: { type: LeaveType; label: string }[] = [
  { type: "annual", label: "Annual" },
  { type: "sick", label: "Sick" },
  { type: "family", label: "Family" },
  { type: "unpaid", label: "Unpaid" },
];

export function LeaveBalancesTable() {
  const employees = useScopedEmployees();
  const active = employees.filter((e) => e.status !== "terminated");

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
                  const remaining = balance.total - balance.used;
                  const percentage =
                    balance.total > 0 ? (balance.used / balance.total) * 100 : 0;
                  return (
                    <TableCell key={col.type}>
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium">{remaining} left</span>
                          <span className="text-muted-foreground">
                            {balance.used}/{balance.total}
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
