"use client";

import * as React from "react";
import { Check, FileText, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useApp } from "@/lib/store/app-provider";
import { useAuth } from "@/lib/auth/auth-provider";
import { useEmployees, useLeaveRequests } from "@/lib/store/hooks";
import { useCanDecideRequest } from "@/lib/auth/scope";
import { formatDate, getInitials, leaveTypeLabel } from "@/lib/format";
import { requestLeaveDocumentationRecord } from "@/lib/leave/actions";
import { LeaveDocumentLink } from "./leave-document-link";
import { LeaveStatusBadge } from "./leave-status-badge";
import { RejectLeaveDialog } from "./reject-leave-dialog";

interface LeaveDetailSheetProps {
  requestId: string | null;
  onClose: () => void;
}

export function LeaveDetailSheet({ requestId, onClose }: LeaveDetailSheetProps) {
  const leaveRequests = useLeaveRequests();
  const employees = useEmployees();
  const { user } = useAuth();
  const { decideLeaveRequest } = useApp();
  const canDecide = useCanDecideRequest();
  const [acting, setActing] = React.useState(false);
  const [requestingDocs, setRequestingDocs] = React.useState(false);

  const request = leaveRequests.find((r) => r.id === requestId) ?? null;
  const employee = request ? (employees.find((e) => e.id === request.employeeId) ?? null) : null;

  const isReviewer =
    user?.role === "hr" || user?.role === "manager" || user?.role === "exco";

  async function handleDecision(status: "approved" | "rejected", note?: string) {
    if (!request) return;
    setActing(true);
    try {
      await decideLeaveRequest(request.id, status, note);
      const name = `${employee?.firstName ?? ""} ${employee?.lastName ?? ""}`.trim();
      toast(status === "approved" ? "Leave approved" : "Leave declined", {
        description: `${name}'s leave has been ${status === "approved" ? "approved" : "declined"}.`,
      });
    } catch (err) {
      toast.error("Could not update leave", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setActing(false);
    }
  }

  async function handleRequestDocs() {
    if (!request) return;
    setRequestingDocs(true);
    try {
      await requestLeaveDocumentationRecord(request.id);
      toast.success("Documents requested", {
        description: `${employee?.firstName ?? "The employee"} has been notified to upload supporting documents.`,
      });
    } catch {
      toast.error("Could not send request. Please try again.");
    } finally {
      setRequestingDocs(false);
    }
  }

  return (
    <Sheet open={!!requestId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md">
        {request && employee ? (
          <>
            <SheetHeader className="p-4 pb-0">
              <SheetTitle>Leave request</SheetTitle>
              <SheetDescription>
                Full details and review options for this request.
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-5 p-4">
              {/* Employee header */}
              <div className="flex items-center gap-3">
                <Avatar size="sm">
                  {employee.photoUrl ? (
                    <AvatarImage
                      src={employee.photoUrl}
                      alt={`${employee.firstName} ${employee.lastName}`}
                    />
                  ) : null}
                  <AvatarFallback className="text-white" style={{ backgroundColor: employee.avatarColor }}>
                    {getInitials(employee.firstName, employee.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-medium">
                    {employee.firstName} {employee.lastName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {employee.jobTitle} · {employee.department}
                  </span>
                </div>
                <LeaveStatusBadge status={request.status} className="shrink-0" />
              </div>

              <Separator />

              {/* Leave details grid */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">Type</span>
                  <span className="font-medium">{leaveTypeLabel(request.type)}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">Duration</span>
                  <span className="font-medium">
                    {request.days} {request.days === 1 ? "day" : "days"}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">From</span>
                  <span className="font-medium">{formatDate(request.startDate)}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">To</span>
                  <span className="font-medium">{formatDate(request.endDate)}</span>
                </div>
                <div className="col-span-2 flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">Applied on</span>
                  <span className="font-medium">{formatDate(request.appliedOn)}</span>
                </div>
              </div>

              {/* Reason */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">Reason</span>
                {request.reason ? (
                  <p className="rounded-lg bg-muted/50 px-3 py-2.5 text-sm leading-relaxed">
                    {request.reason}
                  </p>
                ) : (
                  <p className="text-sm italic text-muted-foreground">No reason provided.</p>
                )}
              </div>

              {/* Supporting document */}
              {request.documentPath ? (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">Supporting document</span>
                  <LeaveDocumentLink
                    leaveRequestId={request.id}
                    className="inline-flex items-center gap-2 text-sm font-medium"
                  />
                </div>
              ) : null}

              {/* Decision info (shown when leave is not pending) */}
              {request.status !== "pending" && (request.decidedBy || request.decisionNote) ? (
                <>
                  <Separator />
                  <div className="flex flex-col gap-3">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Decision record
                    </span>
                    {request.decidedBy ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-muted-foreground">
                          {request.status === "approved" ? "Approved" : "Declined"} by
                        </span>
                        <span className="text-sm font-medium">
                          {request.decidedBy}
                          {request.decidedOn ? `, ${formatDate(request.decidedOn)}` : ""}
                        </span>
                      </div>
                    ) : null}
                    {request.decisionNote ? (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs text-muted-foreground">Reason given</span>
                        <p className="rounded-lg bg-muted/50 px-3 py-2.5 text-sm leading-relaxed">
                          {request.decisionNote}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </>
              ) : null}

              {/* Actions (reviewers only) */}
              {isReviewer && canDecide(employee.id) ? (
                <>
                  <Separator />
                  <div className="flex flex-col gap-2.5">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Actions
                    </span>

                    <div className="flex flex-wrap gap-2">
                      {request.status !== "approved" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-success hover:bg-success/10 hover:text-success"
                          disabled={acting}
                          onClick={() => handleDecision("approved")}
                        >
                          <Check className="size-3.5" />
                          {request.status === "rejected" ? "Approve instead" : "Approve"}
                        </Button>
                      ) : null}

                      {request.status !== "rejected" ? (
                        <RejectLeaveDialog
                          employeeName={`${employee.firstName} ${employee.lastName}`}
                          disabled={acting}
                          onReject={(note) => handleDecision("rejected", note)}
                          trigger={
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              disabled={acting}
                            >
                              {request.status === "approved" ? "Revoke approval" : "Decline"}
                            </Button>
                          }
                        />
                      ) : null}

                      {!request.documentPath ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={requestingDocs || acting}
                          onClick={handleRequestDocs}
                        >
                          <FileText className="size-3.5" />
                          {requestingDocs ? "Sending..." : "Request documents"}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <SheetHeader className="sr-only">
              <SheetTitle>Leave request</SheetTitle>
              <SheetDescription>No request selected.</SheetDescription>
            </SheetHeader>
            <div className="flex h-full items-center justify-center p-8">
              <p className="text-sm text-muted-foreground">No request selected.</p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
