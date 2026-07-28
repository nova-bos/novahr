"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { ThemeProvider } from "next-themes";

/**
 * Single theme provider with a route-aware default:
 * - The public landing page ("/") defaults to dark (premium marketing look).
 * - Everywhere else (the app, auth, legal) defaults to the visitor's system
 *   preference.
 *
 * `defaultTheme` only affects visitors with no saved preference, so once a user
 * toggles the theme their choice is respected everywhere. Using one provider
 * (rather than nesting) avoids the html-class race between competing providers.
 */
export function ThemeManager({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme={isLanding ? "dark" : "system"}
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
