import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface StatItem {
  label: string;
  value: string;
  detail?: string;
  icon: LucideIcon;
  iconClassName: string;
}

export function StatCardGrid({ stats }: { stats: StatItem[] }) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="truncate text-2xl font-semibold tracking-tight tabular-nums">{stat.value}</p>
              {stat.detail ? (
                <p className="truncate text-xs text-muted-foreground">{stat.detail}</p>
              ) : null}
            </div>
            <div
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg",
                stat.iconClassName
              )}
            >
              <stat.icon className="size-4" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
