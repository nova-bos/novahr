import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { formatDate, leaveTypeLabel, plural } from "@/lib/format";
import { useLeaveRequests } from "@/lib/store/hooks";
import type { Employee, LeaveStatus } from "@/lib/types";

const STATUS_STYLES: Record<LeaveStatus, string> = {
  pending: "bg-warning/10 text-warning",
  approved: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

const STATUS_LABELS: Record<LeaveStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Declined",
  cancelled: "Cancelled",
};

export function ProfileLeave({ employee }: { employee: Employee }) {
  const requests = useLeaveRequests().filter((request) => request.employeeId === employee.id);
  const sortedRequests = requests.slice().sort((a, b) => (a.appliedOn < b.appliedOn ? 1 : -1));

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Leave balances</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {employee.leaveBalances.map((balance) => {
              const pendingDays = requests
                .filter((r) => r.type === balance.type && r.status === "pending")
                .reduce((sum, r) => sum + r.days, 0);
              const effectiveUsed = balance.used + pendingDays;
              const remaining = balance.total - effectiveUsed;
              const percentage = balance.total > 0 ? (effectiveUsed / balance.total) * 100 : 0;
              return (
                <div key={balance.type} className="rounded-xl border border-border/70 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{leaveTypeLabel(balance.type)}</p>
                    <p className="text-sm text-muted-foreground">
                      {remaining} of {balance.total} {plural(balance.total, "day")} left
                    </p>
                  </div>
                  <Progress value={percentage} className="mt-3" />
                  <p className="mt-2 text-xs text-muted-foreground">
                    {balance.used} {plural(balance.used, "day")} approved
                    {pendingDays > 0 ? ` · ${pendingDays} pending` : ""}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Leave history</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedRequests.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No leave requests on record.
            </p>
          ) : (
            <div className="divide-y divide-border/70">
              {sortedRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium">{leaveTypeLabel(request.type)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(request.startDate)} to {formatDate(request.endDate)} ·{" "}
                      {request.days} {request.days === 1 ? "day" : "days"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{request.reason}</p>
                  </div>
                  <Badge variant="outline" className={`w-fit border-transparent font-medium ${STATUS_STYLES[request.status]}`}>
                    {STATUS_LABELS[request.status]}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
