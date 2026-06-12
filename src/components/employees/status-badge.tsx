import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EmploymentStatus } from "@/lib/types";

const STATUS_CONFIG: Record<EmploymentStatus, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-success/10 text-success" },
  on_leave: { label: "On leave", className: "bg-info/10 text-info" },
  probation: { label: "Onboarding", className: "bg-warning/10 text-warning" },
  terminated: { label: "Terminated", className: "bg-muted text-muted-foreground" },
};

export function StatusBadge({
  status,
  className,
}: {
  status: EmploymentStatus;
  className?: string;
}) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={cn("border-transparent font-medium", config.className, className)}>
      {config.label}
    </Badge>
  );
}
