import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PayrollRunStatus } from "@/lib/types";

const STATUS_CONFIG: Record<PayrollRunStatus, { label: string; className: string }> = {
  scheduled: { label: "Scheduled", className: "bg-muted text-muted-foreground" },
  processing: { label: "Processing", className: "bg-warning/10 text-warning" },
  completed: { label: "Completed", className: "bg-success/10 text-success" },
};

export function PayrollStatusBadge({
  status,
  className,
}: {
  status: PayrollRunStatus;
  className?: string;
}) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={cn("border-transparent font-medium", config.className, className)}>
      {config.label}
    </Badge>
  );
}
