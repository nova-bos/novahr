"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/store/app-provider";
import { useEmployees, useLeaveRequests } from "@/lib/store/hooks";
import { formatDate, getInitials, leaveTypeLabel } from "@/lib/format";
import { LeaveDocumentLink } from "@/components/leave/leave-document-link";
import { RejectLeaveDialog } from "@/components/leave/reject-leave-dialog";

export function LeaveApprovals() {
  const leaveRequests = useLeaveRequests();
  const employees = useEmployees();
  const { decideLeaveRequest } = useApp();
  const [decidingId, setDecidingId] = React.useState<string | null>(null);

  const pending = leaveRequests.filter((r) => r.status === "pending").slice(0, 4);

  async function handleDecision(id: string, status: "approved" | "rejected", name: string, note?: string) {
    setDecidingId(id);
    try {
      await decideLeaveRequest(id, status, note);
      toast(status === "approved" ? "Leave request approved" : "Leave request declined", {
        description: `${name}'s leave request has been ${status === "approved" ? "approved" : "declined"}.`,
      });
    } catch {
      toast.error("Couldn't update leave request", {
        description: "Please try again.",
      });
    } finally {
      setDecidingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leave approvals</CardTitle>
        <CardDescription>
          {pending.length === 0 ? "Nothing pending" : `${pending.length} request${pending.length === 1 ? "" : "s"} need${pending.length === 1 ? "s" : ""} your review`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pending.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            All caught up. No pending requests.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {pending.map((request) => {
              const employee = employees.find((e) => e.id === request.employeeId);
              if (!employee) return null;
              return (
                <div key={request.id} className="flex items-start gap-3">
                  <Avatar size="sm" className="mt-0.5">
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
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="truncate text-sm font-medium">
                      {employee.firstName} {employee.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {leaveTypeLabel(request.type)} · {request.days} day{request.days > 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      {formatDate(request.startDate)} to {formatDate(request.endDate)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    {request.documentPath ? (
                      <LeaveDocumentLink
                        leaveRequestId={request.id}
                        className="size-7 justify-center rounded-md border border-input hover:bg-accent hover:text-foreground"
                      />
                    ) : null}
                    <Button
                      size="icon-sm"
                      variant="outline"
                      className="text-success hover:bg-success/10 hover:text-success"
                      disabled={decidingId === request.id}
                      onClick={() =>
                        handleDecision(request.id, "approved", `${employee.firstName} ${employee.lastName}`)
                      }
                    >
                      <Check className="size-3.5" />
                      <span className="sr-only">{decidingId === request.id ? "Approving..." : "Approve"}</span>
                    </Button>
                    <RejectLeaveDialog
                      employeeName={`${employee.firstName} ${employee.lastName}`}
                      disabled={decidingId === request.id}
                      onReject={(note) =>
                        handleDecision(request.id, "rejected", `${employee.firstName} ${employee.lastName}`, note)
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
