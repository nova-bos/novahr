import * as React from "react";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";

/**
 * Shared two-panel layout for the auth pages (signup, forgot/reset password):
 * a branding panel on the left (collapses to a top banner on mobile) and the
 * form content on the right. `/login` keeps its own richer version of this
 * panel (persona picker + feature list).
 */
export function AuthShell({
  heading,
  description,
  children,
}: {
  heading: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col lg:flex-row">
      {/* Mobile banner */}
      <div className="flex flex-col gap-3 bg-sidebar px-6 pb-8 pt-8 text-sidebar-foreground lg:hidden">
        <div className="flex items-center">
          <Logo height={26} forceDark />
        </div>
        <p className="max-w-sm text-sm text-sidebar-foreground/70">{description}</p>
      </div>

      {/* Branding panel */}
      <div className="hidden w-1/2 flex-col justify-between border-r border-sidebar-border bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div className="flex items-center">
          <Logo height={26} forceDark />
        </div>
        <div className="flex max-w-md flex-col gap-6">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">{heading}</h1>
          <p className="text-sm text-sidebar-foreground/70">{description}</p>
        </div>
        <p className="text-xs text-sidebar-foreground/50">
          © {new Date().getFullYear()} NovaHR. Modern HR &amp; payroll for growing teams.
        </p>
      </div>

      {/* Content panel */}
      <div className="relative flex w-full flex-1 items-center justify-center bg-background px-4 py-10 sm:px-6 lg:w-1/2">
        <div className="absolute right-4 top-4 z-10">
          <ThemeToggle />
        </div>
        <div className="flex w-full max-w-md flex-col gap-6">{children}</div>
      </div>
    </div>
  );
}
