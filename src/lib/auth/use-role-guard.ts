"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-provider";
import type { UserRole } from "./types";

/**
 * Redirects away from a page unless the logged-in user's role is allowed.
 * Returns true once the current user is confirmed to have access.
 */
export function useRoleGuard(allowedRoles: UserRole[], redirectTo = "/dashboard"): boolean {
  const { user } = useAuth();
  const router = useRouter();
  const allowed = !!user && allowedRoles.includes(user.role);

  React.useEffect(() => {
    if (user && !allowed) router.replace(redirectTo);
  }, [user, allowed, router, redirectTo]);

  return allowed;
}
