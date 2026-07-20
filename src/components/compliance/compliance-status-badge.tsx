import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ComplianceStatus } from "@prisma/client";
import { isOverdue } from "@/lib/compliance/utils";

interface ComplianceStatusBadgeProps {
  status: ComplianceStatus;
  dueDate?: string | null;
  className?: string;
}

const STATUS_CONFIG: Record<ComplianceStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-warning/10 text-warning" },
  submitted: { label: "Submitted", className: "bg-info/10 text-info" },
  accepted: { label: "Accepted", className: "bg-success/10 text-success" },
  rejected: { label: "Rejected", className: "bg-destructive/10 text-destructive" },
};

export function ComplianceStatusBadge({ status, dueDate, className }: ComplianceStatusBadgeProps) {
  const overdue = status === "pending" && dueDate ? isOverdue(new Date(dueDate)) : false;

  if (overdue) {
    return (
      <Badge variant="outline" className={cn("border-transparent font-medium bg-destructive/10 text-destructive", className)}>
        Overdue
      </Badge>
    );
  }

  const config = STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={cn("border-transparent font-medium", config.className, className)}>
      {config.label}
    </Badge>
  );
}
