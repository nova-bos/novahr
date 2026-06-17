"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUserProfile } from "./actions";
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
  const [supabase] = React.useState(() => createClient());

  React.useEffect(() => {
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
  }, [supabase]);

  const login = React.useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return error.message;

      const profile = await getCurrentUserProfile();
      setUser(profile);
      return null;
    },
    [supabase],
  );

  const logout = React.useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, [supabase]);

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
