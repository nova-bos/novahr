import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { LeaveStatus } from "@/lib/types";

const STATUS_CONFIG: Record<LeaveStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-warning/10 text-warning" },
  approved: { label: "Approved", className: "bg-success/10 text-success" },
  rejected: { label: "Rejected", className: "bg-destructive/10 text-destructive" },
};

export function LeaveStatusBadge({
  status,
  className,
}: {
  status: LeaveStatus;
  className?: string;
}) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={cn("border-transparent font-medium", config.className, className)}>
      {config.label}
    </Badge>
  );
}
