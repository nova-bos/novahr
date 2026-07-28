"use client";

import * as React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Banknote,
  CalendarRange,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { FormAlert } from "@/components/ui/form-alert";
import { authMessageTone } from "@/lib/errors";
import { useAuth } from "@/lib/auth/auth-provider";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

// Demo personas (and their credentials) are only offered outside production.
// NEXT_PUBLIC_APP_ENV is inlined at build time, so production builds render a
// plain login form. Set to "development" or "staging" to restore the picker.
// The picker is loaded lazily so the demo credentials are code-split out of the
// main login bundle and never shipped to production.
const SHOW_DEMO_ACCOUNTS = process.env.NEXT_PUBLIC_APP_ENV !== "production";

const DemoAccountsPanel = dynamic(
  () => import("@/components/auth/demo-accounts-panel").then((m) => m.DemoAccountsPanel),
  { ssr: false },
);

const FEATURES: { icon: LucideIcon; label: string }[] = [
  { icon: Wallet, label: "Run payroll with automatic PAYE, UIF and SDL" },
  { icon: Banknote, label: "Pay salaries straight to the bank with NetCash" },
  { icon: CalendarRange, label: "Track leave balances, requests and approvals" },
  { icon: ShieldCheck, label: "Stay compliant with EMP201, employment equity and POPIA" },
  { icon: Users, label: "A tailored view for every role in your organisation" },
];

export default function LoginPage() {
  const router = useRouter();
  const { user, isLoading, login } = useAuth();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [demoName, setDemoName] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!isLoading && user) {
      router.replace("/dashboard");
    }
  }, [isLoading, user, router]);

  const handleDemoSelect = React.useCallback(
    (selection: { email: string; password: string; firstName: string }) => {
      setEmail(selection.email);
      setPassword(selection.password);
      setDemoName(selection.firstName);
      setError("");
    },
    [],
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    const message = await login(email, password);
    if (message) {
      setError(message);
      setSubmitting(false);
      return;
    }

    router.push("/dashboard");
  }

  if (isLoading || user) {
    return null;
  }

  return (
    <div className="min-h-screen flex bg-background overflow-x-hidden">
      {/* Theme toggle */}
      <div className="fixed top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      {/* Left branding panel */}
      <div className="hidden md:flex md:w-[45%] relative flex-col justify-between p-10 overflow-hidden bg-sidebar border-r border-sidebar-border">
        <div>
          <Link href="/">
            <Logo height={32} />
          </Link>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-sidebar-foreground leading-snug">
              HR and payroll,<br />built for South African teams.
            </h2>
            <p className="mt-3 text-sm text-sidebar-foreground/70 leading-relaxed max-w-sm">
              {SHOW_DEMO_ACCOUNTS
                ? "Sign in as any persona below to preview NovaHR from their seat: employee, manager, HR, or executive."
                : "From onboarding and leave to payslips, bank payments and compliance, NovaHR runs your people operations in one place."}
            </p>
          </div>

          <ul className="space-y-3">
            {FEATURES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                  <Icon size={14} className="text-primary" />
                </div>
                <span className="text-sm text-sidebar-foreground/70">{label}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-[11px] text-sidebar-foreground/50">
          &copy; {new Date().getFullYear()} NovaHR. All rights reserved.
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex min-w-0 flex-1 flex-col items-center justify-center px-6 py-12">
        {/* Mobile logo */}
        <div className="mb-8 md:hidden">
          <Link href="/">
            <Logo height={32} />
          </Link>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in to your NovaHR account
            </p>
          </div>

          {error && (
            <FormAlert tone={authMessageTone(error)} className="mb-4">
              {error}
            </FormAlert>
          )}

          <GoogleSignInButton label="Continue with Google" />

          <div className="relative my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or sign in with email</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-muted-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                autoComplete="email"
                className="h-10 rounded-lg border-border bg-muted/30 text-foreground placeholder:text-muted-foreground/50 focus:border-primary"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-muted-foreground">
                  Password
                </Label>
                <Link href="/forgot-password" className="text-xs text-primary hover:opacity-80 font-medium transition-opacity">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  autoComplete="current-password"
                  className="h-10 rounded-lg border-border bg-muted/30 text-foreground placeholder:text-muted-foreground/50 focus:border-primary pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-10 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium mt-2"
            >
              {submitting && <Loader2 size={16} className="animate-spin mr-2" />}
              {submitting
                ? "Signing in..."
                : demoName
                  ? `Sign in as ${demoName}`
                  : "Sign in"}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            New to NovaHR?{" "}
            <Link href="/signup" className="text-primary hover:opacity-80 font-medium transition-opacity">
              Sign your company up
            </Link>
          </p>

          {SHOW_DEMO_ACCOUNTS && <DemoAccountsPanel onSelect={handleDemoSelect} />}
        </div>
      </div>
    </div>
  );
}
