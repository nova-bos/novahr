"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyAuthError } from "@/lib/errors";
import { getCurrentUserProfile, signOutAction, throttleLogin } from "./actions";
import type { AppUser } from "./types";

interface AuthContextValue {
  user: AppUser | null;
  isLoading: boolean;
  /** Returns an error message on failure, or `null` on success. */
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  /** Re-fetches the user profile - call after a server action changes it (e.g. signup). */
  refresh: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const supabase = createClient();
    let active = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        if (active) {
          setUser(null);
          setIsLoading(false);
        }
        return;
      }
      const profile = await getCurrentUserProfile();
      if (active) {
        setUser(profile);
        setIsLoading(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = React.useCallback(async (email: string, password: string) => {
    const throttled = await throttleLogin(email);
    if (throttled) return throttled;

    const { error } = await createClient().auth.signInWithPassword({ email, password });
    if (error) return friendlyAuthError(error);

    const profile = await getCurrentUserProfile();
    setUser(profile);
    return null;
  }, []);

  const logout = React.useCallback(async () => {
    // Sign out server-side first so the auth cookie is cleared in the response
    // headers before the browser sends the next request. Client-side signOut
    // alone can race with the middleware's cookie check.
    await signOutAction();
    window.location.replace("/login");
  }, []);

  const refresh = React.useCallback(async () => {
    const profile = await getCurrentUserProfile();
    setUser(profile);
    setIsLoading(false);
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({ user, isLoading, login, logout, refresh }),
    [user, isLoading, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
