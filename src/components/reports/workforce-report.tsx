"use client";

import { Building2, TrendingUp, UserPlus, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDepartments, useEmployees } from "@/lib/store/hooks";
import { calculateMonthlyPayroll } from "@/lib/payroll/calculator";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format";
import { StatCardGrid, type StatItem } from "@/components/dashboard/stat-card-grid";
import { HeadcountChart } from "./headcount-chart";
import { EmploymentMixChart } from "./employment-mix-chart";

function averageTenureYears(startDates: string[]): number {
  if (startDates.length === 0) return 0;
  const now = new Date();
  const totalYears = startDates.reduce((sum, date) => {
    const start = new Date(date);
    const years = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    return sum + years;
  }, 0);
  return totalYears / startDates.length;
}

export function WorkforceReport() {
  const employees = useEmployees();
  const departments = useDepartments();

  const active = employees.filter((e) => e.status !== "terminated");
  const onProbation = active.filter((e) => e.status === "probation").length;

  const currentYear = new Date().getFullYear().toString();
  const newHires = active.filter((e) => e.startDate.startsWith(currentYear)).length;

  const monthlyCost = active.reduce((sum, e) => sum + calculateMonthlyPayroll(e).grossPay, 0);
  const avgTenure = averageTenureYears(active.map((e) => e.startDate));

  const stats: StatItem[] = [
    {
      label: "Total headcount",
      value: active.length.toString(),
      detail: onProbation > 0 ? `${onProbation} on probation` : "All confirmed",
      icon: Users,
      iconClassName: "bg-info/10 text-info",
    },
    {
      label: "Monthly payroll cost",
      value: formatCurrencyCompact(monthlyCost),
      detail: "Gross, current roster",
      icon: TrendingUp,
      iconClassName: "bg-primary/10 text-primary",
    },
    {
      label: "Average tenure",
      value: `${avgTenure.toFixed(1)} yrs`,
      detail: `Across ${departments.length} departments`,
      icon: Building2,
      iconClassName: "bg-success/10 text-success",
    },
    {
      label: "New hires this year",
      value: newHires.toString(),
      detail: `${currentYear} so far`,
      icon: UserPlus,
      iconClassName: "bg-warning/10 text-warning",
    },
  ];

  const departmentRows = departments.map((dept) => {
    const members = active.filter((e) => e.department === dept.name);
    const cost = members.reduce((sum, e) => sum + calculateMonthlyPayroll(e).grossPay, 0);
    const annualCost = cost * 12;
    const utilization = dept.budget > 0 ? Math.min(100, (annualCost / dept.budget) * 100) : 0;
    return { dept, headcount: members.length, cost, annualCost, utilization };
  });

  return (
    <div className="flex flex-col gap-6">
      <StatCardGrid stats={stats} />

      <div className="grid gap-4 lg:grid-cols-3">
        <HeadcountChart />
        <EmploymentMixChart />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Department cost summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">Headcount</TableHead>
                <TableHead className="text-right">Monthly cost</TableHead>
                <TableHead className="text-right">Annual budget</TableHead>
                <TableHead className="w-48">Budget utilization</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departmentRows.map(({ dept, headcount, cost, utilization }) => (
                <TableRow key={dept.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: dept.color }}
                      />
                      <span className="font-medium">{dept.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{headcount}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(cost)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatCurrency(dept.budget)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={utilization} className="h-1.5" />
                      <span className="w-10 shrink-0 text-right text-xs text-muted-foreground">
                        {Math.round(utilization)}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
