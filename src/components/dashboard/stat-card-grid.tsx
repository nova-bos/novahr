import type * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface StatItem {
  label: string;
  value: React.ReactNode;
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
                <p className="truncate text-sm text-muted-foreground">{stat.label}</p>
                <p
                  className={cn(
                    "truncate text-2xl font-semibold tracking-tight tabular-nums transition-[filter] duration-200",
                    blurred && "blur-sm select-none"
                  )}
                >
                  {stat.value}
                </p>
                {stat.detail ? (
                  <p className="truncate text-xs text-muted-foreground">{stat.detail}</p>
                ) : null}
              </div>

              {stat.sensitive ? (
                <div className="flex shrink-0 flex-col items-end justify-between self-stretch gap-2">
                  <div
                    className={cn(
                      "flex size-9 items-center justify-center rounded-lg",
                      stat.iconClassName
                    )}
                  >
                    <stat.icon className="size-4" />
                  </div>
                  <button
                    type="button"
                    onClick={onToggle}
                    className="rounded p-0.5 text-muted-foreground/50 transition-colors hover:text-muted-foreground"
                    aria-label={blurred ? `Reveal ${stat.label}` : `Hide ${stat.label}`}
                  >
                    {blurred ? (
                      <Eye className="size-4" />
                    ) : (
                      <EyeOff className="size-4" />
                    )}
                  </button>
                </div>
              ) : (
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg",
                    stat.iconClassName
                  )}
                >
                  <stat.icon className="size-4" />
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
