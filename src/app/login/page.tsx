"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  CalendarRange,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  User,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/lib/auth/auth-provider";
import { demoUsers } from "@/lib/auth/demo-users";
import { ROLE_LABELS, type UserRole } from "@/lib/auth/types";
import { cn } from "@/lib/utils";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

const ROLE_ICONS: Record<UserRole, LucideIcon> = {
  employee: User,
  manager: Users,
  hr: ShieldCheck,
  exco: Building2,
};

// Demo personas (and their credentials) are only offered outside production.
// NEXT_PUBLIC_APP_ENV is inlined at build time, so production builds render a
// plain login form. Set to "development" or "staging" to restore the picker.
const SHOW_DEMO_ACCOUNTS = process.env.NEXT_PUBLIC_APP_ENV !== "production";

const FEATURES: { icon: LucideIcon; label: string }[] = [
  { icon: Wallet, label: "Run South African payroll in minutes" },
  { icon: CalendarRange, label: "Track leave balances and approvals" },
  { icon: Users, label: "A tailored view for every role in your org" },
];

export default function LoginPage() {
  const router = useRouter();
  const { user, isLoading, login } = useAuth();

  const [selectedId, setSelectedId] = React.useState(SHOW_DEMO_ACCOUNTS ? demoUsers[0].id : "");
  const [email, setEmail] = React.useState(SHOW_DEMO_ACCOUNTS ? demoUsers[0].email : "");
  const [password, setPassword] = React.useState(SHOW_DEMO_ACCOUNTS ? demoUsers[0].password : "");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!isLoading && user) {
      router.replace("/dashboard");
    }
  }, [isLoading, user, router]);

  function selectPersona(id: string) {
    const persona = demoUsers.find((candidate) => candidate.id === id);
    if (!persona) return;
    setSelectedId(id);
    setEmail(persona.email);
    setPassword(persona.password);
    setError("");
  }

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
      <div className="hidden md:flex md:w-[45%] relative flex-col justify-between p-10 overflow-hidden bg-sidebar">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/20 blur-[100px]" />
          <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-primary/10 blur-[80px]" />
        </div>

        <div className="relative">
          <Link href="/">
            <Logo height={32} />
          </Link>
        </div>

        <div className="relative space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-sidebar-foreground leading-snug">
              Modern HR &amp; payroll,<br />built for growing teams.
            </h2>
            <p className="mt-3 text-sm text-sidebar-foreground/70 leading-relaxed max-w-xs">
              {SHOW_DEMO_ACCOUNTS
                ? "Sign in as any persona below to preview NovaHR from their seat: employee, manager, HR, or executive."
                : "Payroll, leave, and people operations for South African teams, all in one place."}
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
            <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
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
              <Label htmlFor="password" className="text-sm font-medium text-muted-foreground">
                Password
              </Label>
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
                : SHOW_DEMO_ACCOUNTS
                  ? `Sign in as ${demoUsers.find((u) => u.id === selectedId)?.name.split(" ")[0] ?? "Demo"}`
                  : "Sign in"}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            New to NovaHR?{" "}
            <Link href="/signup" className="text-primary hover:opacity-80 font-medium transition-opacity">
              Create your company
            </Link>
          </p>

          {/* Demo personas */}
          {SHOW_DEMO_ACCOUNTS && (
          <div className="mt-6 rounded-xl border border-border bg-card p-4">
            <p className="mb-3 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              Demo accounts
            </p>
            <div className="space-y-2">
              {demoUsers.map((persona) => {
                const Icon = ROLE_ICONS[persona.role];
                const selected = persona.id === selectedId;
                return (
                  <button
                    key={persona.id}
                    type="button"
                    onClick={() => selectPersona(persona.id)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors",
                      selected
                        ? "border-primary/30 bg-primary/5"
                        : "border-border bg-muted/20 hover:border-primary/30 hover:bg-muted/30"
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Avatar className="h-5 w-5 shrink-0">
                        <AvatarFallback
                          className="text-[9px] text-white font-semibold"
                          style={{ backgroundColor: persona.avatarColor }}
                        >
                          {persona.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate text-xs text-muted-foreground">{persona.name}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground/60">
                      <Icon size={11} />
                      <span>{ROLE_LABELS[persona.role]}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-center text-[10px] text-muted-foreground/50">Click a row to prefill</p>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
