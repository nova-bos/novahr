"use client";

import {
  CalendarCheck,
  CalendarX,
  ClipboardCheck,
  FileText,
  TrendingUp,
  UserMinus,
  UserPlus,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useActivity } from "@/lib/store/hooks";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ActivityType } from "@/lib/types";

function actorInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`.toUpperCase();
}

const ICONS: Record<ActivityType, LucideIcon> = {
  hire: UserPlus,
  leave_request: ClipboardCheck,
  leave_approved: CalendarCheck,
  leave_rejected: CalendarX,
  payroll_run: Wallet,
  promotion: TrendingUp,
  document: FileText,
  termination: UserMinus,
  onboarding: UserPlus,
};

const ICON_STYLES: Record<ActivityType, string> = {
  hire: "bg-success/10 text-success",
  leave_request: "bg-warning/10 text-warning",
  leave_approved: "bg-success/10 text-success",
  leave_rejected: "bg-destructive/10 text-destructive",
  payroll_run: "bg-primary/10 text-primary",
  promotion: "bg-info/10 text-info",
  document: "bg-muted text-muted-foreground",
  termination: "bg-destructive/10 text-destructive",
  onboarding: "bg-info/10 text-info",
};

export function ActivityFeed() {
  const activity = useActivity(8);

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>Latest updates across your workspace</CardDescription>
      </CardHeader>
      <CardContent>
        {activity.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No recent activity yet.
          </p>
        ) : (
          <div className="flex flex-col">
            {activity.map((item, index) => {
              const Icon = ICONS[item.type];
              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-start gap-3 py-3",
                    index !== activity.length - 1 && "border-b border-border/60"
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                      ICON_STYLES[item.type]
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="text-sm leading-snug">
                      <span className="font-medium">{item.actor}</span>{" "}
                      <span className="text-muted-foreground">{item.message}</span>
                    </p>
                    <span className="text-xs text-muted-foreground/70">
                      {formatRelativeTime(item.timestamp)}
                    </span>
                  </div>
                  <span
                    className="hidden size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground sm:flex"
                    aria-hidden
                  >
                    {actorInitials(item.actor)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
