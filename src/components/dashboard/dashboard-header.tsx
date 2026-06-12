"use client";

import { useAuth } from "@/lib/auth/auth-provider";
import { useCurrentTenant } from "@/lib/store/hooks";
import { formatDateLong } from "@/lib/format";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function DashboardHeader({ subtitle }: { subtitle?: string }) {
  const { user } = useAuth();
  const tenant = useCurrentTenant();
  const firstName = user?.name.split(" ")[0] ?? "there";

  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-2xl font-semibold tracking-tight">
        {getGreeting()}, {firstName}
      </h2>
      <p className="text-sm text-muted-foreground">
        {subtitle ??
          `Here's what's happening at ${tenant.name} today, ${formatDateLong(new Date())}.`}
      </p>
    </div>
  );
}
