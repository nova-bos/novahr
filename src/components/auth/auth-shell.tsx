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
      {/* Mobile gradient banner */}
      <div className="relative flex flex-col gap-3 overflow-hidden bg-sidebar px-6 pb-12 pt-8 text-sidebar-foreground lg:hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            background:
              "radial-gradient(circle at 15% 0%, var(--sidebar-primary) 0%, transparent 50%), radial-gradient(circle at 85% 25%, var(--primary) 0%, transparent 40%), radial-gradient(circle at 40% 100%, var(--sidebar-primary) 0%, transparent 45%)",
          }}
        />
        <div className="relative flex items-center">
          <Logo height={26} forceDark />
        </div>
        <p className="relative max-w-sm text-sm text-sidebar-foreground/70">{description}</p>
        <svg
          className="pointer-events-none absolute inset-x-0 bottom-0 h-10 w-full"
          viewBox="0 0 400 40"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0,40 L0,20 C50,4 100,32 150,18 C200,4 250,32 300,16 C340,4 370,26 400,12 L400,40 Z"
            fill="var(--background)"
          />
        </svg>
      </div>

      {/* Branding panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-45"
          style={{
            background:
              "radial-gradient(circle at 10% 15%, var(--sidebar-primary) 0%, transparent 45%), radial-gradient(circle at 85% 10%, var(--primary) 0%, transparent 40%), radial-gradient(circle at 75% 90%, var(--sidebar-primary) 0%, transparent 50%), radial-gradient(circle at 20% 95%, var(--primary) 0%, transparent 40%)",
          }}
        />
        <div className="relative flex items-center">
          <Logo height={26} forceDark />
        </div>
        <div className="relative flex max-w-md flex-col gap-6">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">{heading}</h1>
          <p className="text-sm text-sidebar-foreground/70">{description}</p>
        </div>
        <p className="relative text-xs text-sidebar-foreground/50">
          © {new Date().getFullYear()} NovaHR. Modern HR &amp; payroll for growing teams.
        </p>
        <svg
          className="pointer-events-none absolute inset-x-0 bottom-0 h-32 w-full"
          viewBox="0 0 600 200"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0,120 C150,180 300,60 450,110 C520,130 560,90 600,100 L600,200 L0,200 Z"
            fill="var(--primary)"
            opacity="0.15"
          />
          <path
            d="M0,150 C140,100 320,190 480,140 C540,120 580,160 600,150 L600,200 L0,200 Z"
            fill="var(--sidebar-primary)"
            opacity="0.3"
          />
        </svg>
      </div>

      {/* Content panel */}
      <div className="relative flex w-full flex-1 items-center justify-center overflow-hidden bg-gradient-to-br from-background via-background to-primary/[0.06] px-4 py-10 sm:px-6 lg:w-1/2">
        <div className="absolute right-4 top-4 z-10">
          <ThemeToggle />
        </div>
        <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-16 size-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative z-10 flex w-full max-w-md flex-col gap-6">{children}</div>
      </div>
    </div>
  );
}
