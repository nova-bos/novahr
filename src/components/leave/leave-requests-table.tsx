"use client";

import * as React from "react";
import { toast } from "sonner";
import { Check, ClipboardList } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApp } from "@/lib/store/app-provider";
import { useAuth } from "@/lib/auth/auth-provider";
import { useCanDecideRequest, useScopedEmployees, useScopedLeaveRequests } from "@/lib/auth/scope";
import { formatDate, getInitials, leaveTypeLabel } from "@/lib/format";
import { LeaveStatusBadge } from "./leave-status-badge";
import { LeaveDocumentLink } from "./leave-document-link";
import { RejectLeaveDialog } from "./reject-leave-dialog";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "annual", label: "Annual leave" },
  { value: "sick", label: "Sick leave" },
  { value: "family", label: "Family responsibility" },
  { value: "unpaid", label: "Unpaid leave" },
];

export function LeaveRequestsTable() {
  const requests = useScopedLeaveRequests();
  const employees = useScopedEmployees();
  const { user } = useAuth();
  const canDecide = useCanDecideRequest();
  const { decideLeaveRequest } = useApp();
  const showActions = user?.role === "hr" || user?.role === "manager";

  const [status, setStatus] = React.useState("all");
  const [type, setType] = React.useState("all");
  const [decidingId, setDecidingId] = React.useState<string | null>(null);

  const employeeById = React.useMemo(() => {
    const map = new Map<string, (typeof employees)[number]>();
    for (const employee of employees) map.set(employee.id, employee);
    return map;
  }, [employees]);

  const filtered = React.useMemo(() => {
    return requests
      .filter((r) => (status === "all" ? true : r.status === status))
      .filter((r) => (type === "all" ? true : r.type === type))
      .slice()
      .sort((a, b) => (a.appliedOn < b.appliedOn ? 1 : -1));
  }, [requests, status, type]);

  async function handleDecision(id: string, decision: "approved" | "rejected", name: string, note?: string) {
    setDecidingId(id);
    try {
      await decideLeaveRequest(id, decision, note);
      toast(decision === "approved" ? "Leave request approved" : "Leave request declined", {
        description: `${name}'s leave request has been ${decision === "approved" ? "approved" : "declined"}.`,
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
      <CardContent>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
              <ClipboardList className="size-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">No leave requests found</p>
              <p className="text-sm text-muted-foreground">Try adjusting your filters.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
          <Table className="min-w-[700px] w-full">
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead className="text-right">Days</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="w-10">Doc</TableHead>
                <TableHead>Status</TableHead>
                {showActions && <TableHead className="w-28 text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((request) => {
                const employee = employeeById.get(request.employeeId);
                if (!employee) return null;
                return (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
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
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {leaveTypeLabel(request.type)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(request.startDate)} to {formatDate(request.endDate)}
                    </TableCell>
                    <TableCell className="text-right text-sm">{request.days}</TableCell>
                    <TableCell className="max-w-56 truncate text-sm text-muted-foreground">
                      {request.reason}
                    </TableCell>
                    <TableCell>
                      {request.documentPath ? (
                        <LeaveDocumentLink leaveRequestId={request.id} />
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <LeaveStatusBadge status={request.status} />
                    </TableCell>
                    {showActions && (
                      <TableCell className="text-right">
                        {request.status === "pending" && canDecide(employee.id) ? (
                          <div className="flex justify-end gap-1.5">
                            <Button
                              size="icon-sm"
                              variant="outline"
                              className="text-success hover:bg-success/10 hover:text-success"
                              disabled={decidingId === request.id}
                              onClick={() =>
                                handleDecision(
                                  request.id,
                                  "approved",
                                  `${employee.firstName} ${employee.lastName}`
                                )
                              }
                            >
                              <Check className="size-3.5" />
                              <span className="sr-only">{decidingId === request.id ? "Approving..." : "Approve"}</span>
                            </Button>
                            <RejectLeaveDialog
                              employeeName={`${employee.firstName} ${employee.lastName}`}
                              disabled={decidingId === request.id}
                              onReject={(note) =>
                                handleDecision(
                                  request.id,
                                  "rejected",
                                  `${employee.firstName} ${employee.lastName}`,
                                  note
                                )
                              }
                            />
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {request.decidedBy ?? "-"}
                          </span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
