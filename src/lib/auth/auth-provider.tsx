"use client";

import * as React from "react";
import { demoUsers, findDemoUser, getDemoUserById } from "./demo-users";
import type { DemoUser } from "./types";

const STORAGE_KEY = "novahr.auth.userId";

interface AuthContextValue {
  user: DemoUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => DemoUser | null;
  logout: () => void;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<DemoUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const storedId = window.localStorage.getItem(STORAGE_KEY);
    if (storedId) {
      const found = getDemoUserById(storedId);
      if (found) setUser(found);
    }
    setIsLoading(false);
  }, []);

  const login = React.useCallback((email: string, password: string) => {
    const found = findDemoUser(email, password);
    if (found) {
      setUser(found);
      window.localStorage.setItem(STORAGE_KEY, found.id);
    }
    return found;
  }, []);

  const logout = React.useCallback(() => {
    setUser(null);
    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({ user, isLoading, login, logout }),
    [user, isLoading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}

export { demoUsers };
export type { DemoUser };
