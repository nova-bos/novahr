"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-provider";
import { useApp } from "@/lib/store/app-provider";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const { state, setTenant } = useApp();

  React.useEffect(() => {
    if (!isLoading && !user) {
      // Hard navigation so the browser sends a fresh request after signOut()
      // clears the session cookie. A soft router.replace can race with cookie
      // propagation and leave the loading screen stuck.
      window.location.replace("/login");
    }
  }, [isLoading, user]);

  React.useEffect(() => {
    if (user && state.tenantId !== user.tenantId) {
      setTenant(user.tenantId);
    }
  }, [user, state.tenantId, setTenant]);

  const tenantReady = state.currentTenant?.id === user?.tenantId;

  if (isLoading || !user || !tenantReady) {
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
