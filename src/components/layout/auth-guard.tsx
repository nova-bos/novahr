"use client";

import * as React from "react";
import { Loader2, TriangleAlert } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-provider";
import { useApp } from "@/lib/store/app-provider";
import { Button } from "@/components/ui/button";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const { state, setTenant, reloadWorkspace } = useApp();

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

  // The workspace fetch failed (network, expired session, server error). Without
  // this branch the guard would spin on "Loading NovaHR..." forever.
  if (user && state.loadError && !tenantReady) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <div className="flex max-w-sm flex-col items-center gap-3 text-center">
          <div className="flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <TriangleAlert className="size-5" />
          </div>
          <p className="text-sm font-medium">We could not load your workspace</p>
          <p className="text-sm text-muted-foreground">
            Please check your connection and try again. If this keeps happening, sign out and back in.
          </p>
          <Button onClick={reloadWorkspace} className="mt-1">
            Try again
          </Button>
        </div>
      </div>
    );
  }

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
