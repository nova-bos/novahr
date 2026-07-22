import { Eye, EyeOff } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface StatItem {
  label: string;
  value: string;
  detail?: string;
  icon: LucideIcon;
  iconClassName: string;
  sensitive?: boolean;
}

export function StatCardGrid({
  stats,
  revealed = true,
  onToggle,
}: {
  stats: StatItem[];
  revealed?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const blurred = stat.sensitive && !revealed;
        return (
          <Card key={stat.label}>
            <CardContent className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                {stat.sensitive ? (
                  <button
                    type="button"
                    onClick={onToggle}
                    className="flex items-center gap-1.5 text-left"
                    aria-label={blurred ? `Reveal ${stat.label}` : `Hide ${stat.label}`}
                  >
                    <span
                      className={cn(
                        "text-2xl font-semibold tracking-tight tabular-nums transition-all duration-200",
                        blurred && "blur-sm select-none"
                      )}
                    >
                      {stat.value}
                    </span>
                    {blurred ? (
                      <Eye className="size-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <EyeOff className="size-4 shrink-0 text-muted-foreground/50" />
                    )}
                  </button>
                ) : (
                  <p className="truncate text-2xl font-semibold tracking-tight tabular-nums">
                    {stat.value}
                  </p>
                )}
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
        );
      })}
    </div>
  );
}
