import Link from "next/link";
import { ArrowRight, Banknote, Landmark } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate, maskAccountNumber } from "@/lib/format";
import { calculateMonthlyPayroll } from "@/lib/payroll-calc";
import { usePayslipsByEmployee } from "@/lib/store/hooks";
import type { Employee } from "@/lib/types";

export function ProfileCompensation({ employee }: { employee: Employee }) {
  const breakdown = calculateMonthlyPayroll(employee);
  const payslips = usePayslipsByEmployee(employee.id);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Monthly pay breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="min-w-0 rounded-xl border border-border/70 p-4">
              <p className="text-xs text-muted-foreground">Gross pay</p>
              <p className="mt-1 truncate text-xl font-semibold tracking-tight">
                {formatCurrency(breakdown.grossPay)}
              </p>
            </div>
            <div className="min-w-0 rounded-xl border border-border/70 p-4">
              <p className="text-xs text-muted-foreground">Total deductions</p>
              <p className="mt-1 truncate text-xl font-semibold tracking-tight text-destructive">
                -{formatCurrency(breakdown.totalDeductions)}
              </p>
            </div>
            <div className="min-w-0 rounded-xl border border-border/70 bg-primary/[0.03] p-4">
              <p className="text-xs text-muted-foreground">Net pay</p>
              <p className="mt-1 truncate text-xl font-semibold tracking-tight text-primary">
                {formatCurrency(breakdown.netPay)}
              </p>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="mb-3 text-sm font-medium">Earnings</p>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-muted-foreground">Basic salary</span>
                  <span className="shrink-0 font-medium">{formatCurrency(breakdown.basicSalary)}</span>
                </div>
                {breakdown.earnings.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate text-muted-foreground">{item.label}</span>
                    <span className="shrink-0 font-medium">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex items-center justify-between gap-2 text-sm font-semibold">
                  <span className="truncate">Gross pay</span>
                  <span className="shrink-0">{formatCurrency(breakdown.grossPay)}</span>
                </div>
              </div>
            </div>
            <div>
              <p className="mb-3 text-sm font-medium">Deductions</p>
              <div className="space-y-2.5">
                {breakdown.deductions.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate text-muted-foreground">{item.label}</span>
                    <span className="shrink-0 font-medium">-{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex items-center justify-between gap-2 text-sm font-semibold">
                  <span className="truncate">Total deductions</span>
                  <span className="shrink-0">-{formatCurrency(breakdown.totalDeductions)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Salary structure</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Banknote className="size-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Annual gross salary</p>
                <p className="text-sm font-medium">
                  {formatCurrency(employee.salary.annualGross)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Banknote className="size-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pay frequency</p>
                <p className="text-sm font-medium capitalize">{employee.salary.payFrequency}</p>
              </div>
            </div>
            {employee.salary.pensionContributionPct ? (
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Banknote className="size-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pension contribution</p>
                  <p className="text-sm font-medium">
                    {(employee.salary.pensionContributionPct * 100).toFixed(0)}% of basic salary
                  </p>
                </div>
              </div>
            ) : null}
            {employee.salary.medicalAid ? (
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Banknote className="size-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Medical aid contribution</p>
                  <p className="text-sm font-medium">
                    {formatCurrency(employee.salary.medicalAid)} / month
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Banking details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-5 sm:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Landmark className="size-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Bank</p>
                <p className="text-sm font-medium">{employee.bankDetails.bank}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Landmark className="size-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Account number</p>
                <p className="text-sm font-medium">
                  {maskAccountNumber(employee.bankDetails.accountNumber)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Landmark className="size-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Account type</p>
                <p className="text-sm font-medium">
                  {employee.bankDetails.accountType} · Branch {employee.bankDetails.branchCode}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {payslips.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Payslip history</CardTitle>
            <CardAction>
              <Button asChild variant="ghost" size="sm">
                <Link href="/payroll">
                  View all
                  <ArrowRight />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border/70">
              {payslips
                .slice()
                .reverse()
                .slice(0, 4)
                .map((payslip) => (
                  <div
                    key={payslip.id}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{formatDate(payslip.payDate)}</p>
                      <p className="truncate text-xs text-muted-foreground">Net pay</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-sm font-semibold">
                        {formatCurrency(payslip.netPay)}
                      </span>
                      <Badge variant="secondary">Paid</Badge>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
