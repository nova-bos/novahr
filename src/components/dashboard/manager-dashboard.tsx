"use client";

import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, CalendarClock, Check, ClipboardList, Users, Wallet, X } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/employees/status-badge";
import { useAuth } from "@/lib/auth/auth-provider";
import { useCanDecideRequest, useScopedEmployees, useScopedLeaveRequests } from "@/lib/auth/scope";
import { useApp } from "@/lib/store/app-provider";
import { calculateMonthlyPayroll } from "@/lib/payroll/calculator";
import { formatCurrencyCompact, formatDate, formatDateLong, getInitials, leaveTypeLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DashboardHeader } from "./dashboard-header";
import { StatCardGrid, type StatItem } from "./stat-card-grid";

export function ManagerDashboard() {
  const { user } = useAuth();
  const { decideLeaveRequest } = useApp();
  const scopedEmployees = useScopedEmployees();
  const team = scopedEmployees.filter((e) => e.id !== user?.employeeId);
  const requests = useScopedLeaveRequests();
  const canDecide = useCanDecideRequest();

  const activeTeam = team.filter((e) => e.status !== "terminated");
  const onLeaveToday = activeTeam.filter((e) => e.status === "on_leave").length;
  const monthlyPayroll = activeTeam.reduce(
    (sum, e) => sum + calculateMonthlyPayroll(e).grossPay,
    0
  );
  const pendingRequests = requests
    .filter((r) => r.status === "pending" && canDecide(r.employeeId))
    .slice(0, 4);

  async function handleDecision(id: string, status: "approved" | "rejected", name: string) {
    try {
      await decideLeaveRequest(id, status, user?.name ?? "Manager");
      toast(status === "approved" ? "Leave request approved" : "Leave request rejected", {
        description: `${name}'s leave request has been ${status}.`,
      });
    } catch {
      toast.error("Couldn't update leave request", {
        description: "Please try again.",
      });
    }
  }

  const stats: StatItem[] = [
    {
      label: "My team",
      value: activeTeam.length.toString(),
      detail: `${onLeaveToday} on leave today`,
      icon: Users,
      iconClassName: "bg-info/10 text-info",
    },
    {
      label: "Pending approvals",
      value: pendingRequests.length.toString(),
      detail: "Leave requests to review",
      icon: ClipboardList,
      iconClassName: "bg-warning/10 text-warning",
    },
    {
      label: "Team payroll",
      value: formatCurrencyCompact(monthlyPayroll),
      detail: "Gross, per month",
      icon: Wallet,
      iconClassName: "bg-primary/10 text-primary",
    },
    {
      label: "On leave today",
      value: onLeaveToday.toString(),
      detail: `Out of ${activeTeam.length} team members`,
      icon: CalendarClock,
      iconClassName: "bg-success/10 text-success",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader
        subtitle={`Here's how your team is doing today, ${formatDateLong(new Date())}.`}
      />
      <StatCardGrid stats={stats} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>My team</CardTitle>
            <CardDescription>
              {activeTeam.length} direct report{activeTeam.length === 1 ? "" : "s"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {team.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                You don&apos;t have any direct reports yet.
              </p>
            ) : (
              <div className="flex flex-col">
                {team.map((employee, index) => (
                  <Link
                    key={employee.id}
                    href={`/employees/${employee.id}`}
                    className={cn(
                      "flex items-center gap-3 py-3 transition-colors hover:bg-muted/40",
                      index !== team.length - 1 && "border-b border-border/60"
                    )}
                  >
                    <Avatar size="sm">
                      <AvatarFallback
                        className="text-white"
                        style={{ backgroundColor: employee.avatarColor }}
                      >
                        {getInitials(employee.firstName, employee.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium">
                        {employee.firstName} {employee.lastName}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {employee.jobTitle}
                      </span>
                    </div>
                    <StatusBadge status={employee.status} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t-0 bg-transparent p-(--card-spacing) pt-0">
            <Button asChild variant="outline" className="w-full">
              <Link href="/employees">
                View full team
                <ArrowRight />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leave approvals</CardTitle>
            <CardDescription>
              {pendingRequests.length === 0
                ? "Nothing pending"
                : `${pendingRequests.length} request${pendingRequests.length > 1 ? "s" : ""} need your review`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingRequests.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                All caught up. No pending requests.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {pendingRequests.map((request) => {
                  const employee = team.find((e) => e.id === request.employeeId);
                  if (!employee) return null;
                  return (
                    <div key={request.id} className="flex items-start gap-3">
                      <Avatar size="sm" className="mt-0.5">
                        <AvatarFallback
                          className="text-white"
                          style={{ backgroundColor: employee.avatarColor }}
                        >
                          {getInitials(employee.firstName, employee.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <p className="truncate text-sm font-medium">
                          {employee.firstName} {employee.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {leaveTypeLabel(request.type)} · {request.days} day
                          {request.days > 1 ? "s" : ""}
                        </p>
                        <p className="text-xs text-muted-foreground/70">
                          {formatDate(request.startDate)} to {formatDate(request.endDate)}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        <Button
                          size="icon-sm"
                          variant="outline"
                          className="text-success hover:bg-success/10 hover:text-success"
                          onClick={() =>
                            handleDecision(
                              request.id,
                              "approved",
                              `${employee.firstName} ${employee.lastName}`
                            )
                          }
                        >
                          <Check className="size-3.5" />
                          <span className="sr-only">Approve</span>
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="outline"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() =>
                            handleDecision(
                              request.id,
                              "rejected",
                              `${employee.firstName} ${employee.lastName}`
                            )
                          }
                        >
                          <X className="size-3.5" />
                          <span className="sr-only">Reject</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
