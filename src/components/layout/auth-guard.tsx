"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-provider";
import { useApp } from "@/lib/store/app-provider";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { state, setTenant } = useApp();

  React.useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  React.useEffect(() => {
    if (user && state.tenantId !== user.tenantId) {
      setTenant(user.tenantId);
    }
  }, [user, state.tenantId, setTenant]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          Loading NovaHR...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
