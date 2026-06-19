"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  CalendarRange,
  Eye,
  EyeOff,
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

const ROLE_ICONS: Record<UserRole, LucideIcon> = {
  employee: User,
  manager: Users,
  hr: ShieldCheck,
  exco: Building2,
};

const ROLE_BLURBS: Record<UserRole, string> = {
  employee: "View your payslips, leave balance and personal profile.",
  manager: "Manage your team and approve their leave requests.",
  hr: "Full access to employees, payroll, leave and reports.",
  exco: "Group-wide view across every NovaHR company.",
};

const FEATURES: { icon: LucideIcon; label: string }[] = [
  { icon: Wallet, label: "Run South African payroll in minutes" },
  { icon: CalendarRange, label: "Track leave balances and approvals" },
  { icon: Users, label: "A tailored view for every role in your org" },
];

export default function LoginPage() {
  const router = useRouter();
  const { user, isLoading, login } = useAuth();

  const [selectedId, setSelectedId] = React.useState(demoUsers[0].id);
  const [email, setEmail] = React.useState(demoUsers[0].email);
  const [password, setPassword] = React.useState(demoUsers[0].password);
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
    <div className="flex min-h-svh flex-col lg:flex-row">
      {/* Mobile gradient banner */}
      <div className="relative flex flex-col gap-3 overflow-hidden bg-sidebar px-6 pb-12 pt-8 text-sidebar-foreground lg:hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            background:
              "radial-gradient(circle at 15% 0%, var(--chart-2) 0%, transparent 45%), radial-gradient(circle at 90% 30%, var(--sidebar-primary) 0%, transparent 50%), radial-gradient(circle at 30% 100%, var(--chart-4) 0%, transparent 40%)",
          }}
        />
        <div className="relative flex items-center">
          <Logo height={26} forceDark />
        </div>
        <p className="relative max-w-sm text-sm text-sidebar-foreground/70">
          Sign in as any persona below to preview NovaHR from their seat.
        </p>
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
              "radial-gradient(circle at 12% 18%, var(--chart-2) 0%, transparent 42%), radial-gradient(circle at 88% 12%, var(--sidebar-accent) 0%, transparent 40%), radial-gradient(circle at 78% 92%, var(--sidebar-primary) 0%, transparent 48%), radial-gradient(circle at 22% 100%, var(--chart-4) 0%, transparent 38%)",
          }}
        />
        <div className="relative flex items-center">
          <Logo height={26} forceDark />
        </div>
        <div className="relative flex max-w-md flex-col gap-6">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">
            Modern HR &amp; payroll, built for growing teams.
          </h1>
          <p className="text-sm text-sidebar-foreground/70">
            This is a live product walkthrough. Sign in as any persona below to see how NovaHR
            looks from their seat: employee, manager, HR, or the executive committee.
          </p>
          <ul className="flex flex-col gap-3">
            {FEATURES.map((feature) => (
              <li key={feature.label} className="flex items-center gap-3 text-sm">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-foreground/80">
                  <feature.icon className="size-4" />
                </span>
                {feature.label}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-sidebar-foreground/50">
          © {new Date().getFullYear()} NovaHR. All data shown is sample data.
        </p>
        <svg
          className="pointer-events-none absolute inset-x-0 bottom-0 h-32 w-full"
          viewBox="0 0 600 200"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0,120 C150,180 300,60 450,110 C520,130 560,90 600,100 L600,200 L0,200 Z"
            fill="var(--chart-2)"
            opacity="0.15"
          />
          <path
            d="M0,150 C140,100 320,190 480,140 C540,120 580,160 600,150 L600,200 L0,200 Z"
            fill="var(--sidebar-primary)"
            opacity="0.3"
          />
        </svg>
      </div>

      {/* Sign-in panel */}
      <div className="relative flex w-full flex-1 items-center justify-center overflow-hidden bg-gradient-to-br from-background via-background to-primary/[0.04] px-4 py-10 sm:px-6 lg:w-1/2">
        <div className="absolute right-4 top-4 z-10">
          <ThemeToggle />
        </div>
        <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-16 size-80 rounded-full bg-chart-2/10 blur-3xl" />
        <svg
          className="pointer-events-none absolute left-0 top-0 hidden h-full w-24 -translate-x-1/2 lg:block"
          viewBox="0 0 100 800"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="login-divider-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--sidebar-primary)" />
              <stop offset="100%" stopColor="var(--chart-2)" />
            </linearGradient>
          </defs>
          <path
            d="M100,0 C60,100 95,220 65,320 C35,420 95,520 65,620 C40,700 90,760 100,800 L0,800 L0,0 Z"
            fill="url(#login-divider-gradient)"
            opacity="0.12"
          />
        </svg>

        <div className="relative z-10 flex w-full max-w-md flex-col gap-6">
          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold tracking-tight">Sign in to NovaHR</h2>
            <p className="text-sm text-muted-foreground">
              Pick a role to preview the product as that person. We&apos;ll fill in their demo
              email and password for you. Then just hit{" "}
              <span className="font-medium text-foreground">Sign in</span>.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {demoUsers.map((persona) => {
              const Icon = ROLE_ICONS[persona.role];
              const selected = persona.id === selectedId;
              return (
                <button
                  key={persona.id}
                  type="button"
                  onClick={() => selectPersona(persona.id)}
                  aria-pressed={selected}
                  className={cn(
                    "flex flex-col gap-2 rounded-xl border p-3 text-left transition-colors",
                    selected
                      ? "border-primary bg-primary/[0.04] ring-1 ring-primary/30"
                      : "border-border/70 hover:border-primary/30 hover:bg-muted/40"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar size="sm">
                      <AvatarFallback
                        className="text-white"
                        style={{ backgroundColor: persona.avatarColor }}
                      >
                        {persona.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium">{persona.name}</span>
                      <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <Icon className="size-3" />
                        {ROLE_LABELS[persona.role]}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs leading-snug text-muted-foreground">
                    {ROLE_BLURBS[persona.role]}
                  </p>
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting
                ? "Signing in..."
                : `Sign in as ${demoUsers.find((u) => u.id === selectedId)?.name.split(" ")[0]}`}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Demo personas above use sample data. Sign out anytime from the sidebar to switch
            roles.
          </p>

          <p className="text-center text-sm text-muted-foreground">
            New to NovaHR?{" "}
            <Link href="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
              Create your company
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
