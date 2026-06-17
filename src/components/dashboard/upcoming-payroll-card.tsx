"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEmployees, usePayrollRuns } from "@/lib/store/hooks";
import { calculateMonthlyPayroll } from "@/lib/payroll/calculator";
import { formatCurrency, formatDateLong, formatMonthYear } from "@/lib/format";

export function UpcomingPayrollCard() {
  const runs = usePayrollRuns();
  const employees = useEmployees();
  const upcoming = runs.find((r) => r.status === "scheduled" || r.status === "processing");

  if (!upcoming) {
    return null;
  }

  const eligible = employees.filter(
    (e) => e.status !== "terminated" && e.startDate <= upcoming.payDate
  );
  const projectedGross = eligible.reduce((sum, e) => sum + calculateMonthlyPayroll(e).grossPay, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="size-4 text-muted-foreground" />
          {formatMonthYear(upcoming.period)} payroll
        </CardTitle>
        <CardDescription>
          {upcoming.status === "processing" ? "Currently processing" : "Scheduled run"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="truncate text-muted-foreground">Pay date</span>
          <span className="shrink-0 font-medium">{formatDateLong(upcoming.payDate)}</span>
        </div>
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="truncate text-muted-foreground">Employees</span>
          <span className="shrink-0 font-medium">{eligible.length}</span>
        </div>
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="truncate text-muted-foreground">Projected gross</span>
          <span className="shrink-0 font-mono font-medium tabular-nums">{formatCurrency(projectedGross)}</span>
        </div>
      </CardContent>
      <CardFooter className="border-t-0 bg-transparent p-(--card-spacing) pt-0">
        <Button asChild variant="outline" className="w-full">
          <Link href="/payroll">
            Go to payroll
            <ArrowRight />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
