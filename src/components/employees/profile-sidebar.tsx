import { Calendar, CalendarClock, Mail, Phone, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, formatDate, leaveTypeLabel, plural } from "@/lib/format";
import { calculateMonthlyPayroll } from "@/lib/payroll/calculator";
import { useLeaveRequests } from "@/lib/store/hooks";
import type { Employee } from "@/lib/types";

function formatTenure(startDate: string): string {
  const start = new Date(startDate);
  const now = new Date();
  let months =
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  months = Math.max(0, months);

  const years = Math.floor(months / 12);
  const remMonths = months % 12;

  if (years === 0) return `${remMonths} ${remMonths === 1 ? "month" : "months"}`;
  if (remMonths === 0) return `${years} ${years === 1 ? "year" : "years"}`;
  return `${years} ${years === 1 ? "year" : "years"}, ${remMonths} ${remMonths === 1 ? "month" : "months"}`;
}

export function ProfileSidebar({ employee }: { employee: Employee }) {
  const breakdown = calculateMonthlyPayroll(employee);
  const annualLeave = employee.leaveBalances.find((b) => b.type === "annual");
  const allLeaveRequests = useLeaveRequests();
  const annualPendingDays = allLeaveRequests
    .filter((r) => r.employeeId === employee.id && r.type === "annual" && r.status === "pending")
    .reduce((sum, r) => sum + r.days, 0);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Mail className="size-4 text-muted-foreground" />
            <span className="truncate">{employee.email}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Phone className="size-4 text-muted-foreground" />
            <span>{employee.phone}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tenure</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="size-4 text-muted-foreground" />
            <div>
              <p className="font-medium">{formatDate(employee.startDate)}</p>
              <p className="text-xs text-muted-foreground">Start date</p>
            </div>
          </div>
          <Separator />
          <div className="flex items-center gap-3 text-sm">
            <CalendarClock className="size-4 text-muted-foreground" />
            <div>
              <p className="font-medium">{formatTenure(employee.startDate)}</p>
              <p className="text-xs text-muted-foreground">At the company</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pay snapshot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Wallet className="size-4 text-muted-foreground" />
            <div>
              <p className="font-medium tabular-nums">{formatCurrency(breakdown.netPay)}</p>
              <p className="text-xs text-muted-foreground">Net pay per month</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {annualLeave ? (
        <Card>
          <CardHeader>
            <CardTitle>Annual leave</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {annualLeave.total - annualLeave.used - annualPendingDays} {plural(annualLeave.total - annualLeave.used - annualPendingDays, "day")} remaining
              </span>
              <span className="font-medium">
                {annualLeave.used + annualPendingDays}/{annualLeave.total}
              </span>
            </div>
            <Progress
              value={((annualLeave.used + annualPendingDays) / annualLeave.total) * 100}
              className="mt-3"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {annualLeave.used} approved
              {annualPendingDays > 0 ? ` · ${annualPendingDays} pending` : ""}
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
