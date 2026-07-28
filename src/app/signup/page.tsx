"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Eye, EyeOff, Loader2, Users, ShieldCheck, CalendarRange, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label, OptionalTag } from "@/components/ui/label";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { FormAlert } from "@/components/ui/form-alert";
import { authMessageTone } from "@/lib/errors";
import { useAuth } from "@/lib/auth/auth-provider";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { PasswordChecklist, isPasswordValid } from "@/components/auth/password-checklist";
import { createCompanyAccount } from "./actions";

const HIGHLIGHTS = [
  { icon: Users, text: "Add your whole team in one go with bulk import" },
  { icon: Wallet, text: "Automatic PAYE, UIF and SDL on every payslip" },
  { icon: ShieldCheck, text: "POPIA ready and South African payroll compliant" },
  { icon: CalendarRange, text: "Leave, payslips and payroll in one place" },
];

export default function SignupPage() {
  const router = useRouter();
  const { user, isLoading, refresh } = useAuth();

  const [companyName, setCompanyName] = React.useState("");
  const [yourName, setYourName] = React.useState("");
  const [jobTitle, setJobTitle] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [agreed, setAgreed] = React.useState(false);

  const passwordValid = isPasswordValid(password);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const canSubmit = passwordValid && passwordsMatch && agreed;
  const [error, setError] = React.useState("");
  const [checkEmail, setCheckEmail] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!isLoading && user) {
      router.replace("/dashboard");
    }
  }, [isLoading, user, router]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    setError("");
    setSubmitting(true);

    const result = await createCompanyAccount({ companyName, yourName, jobTitle, email, password });

    if (result.status === "error") {
      setError(result.message);
      setSubmitting(false);
      return;
    }

    if (result.status === "check-email") {
      setCheckEmail(true);
      setSubmitting(false);
      return;
    }

    await refresh();
    router.push("/dashboard");
  }

  if (isLoading || user) {
    return null;
  }

  if (checkEmail) {
    return (
      <div className="min-h-screen flex bg-background">
        <div className="fixed top-4 right-4 z-10"><ThemeToggle /></div>
        <div className="hidden md:flex md:w-[45%] flex-col justify-between p-10 overflow-hidden bg-sidebar border-r border-sidebar-border">
          <div><Link href="/"><Logo height={32} /></Link></div>
          <div>
            <h2 className="text-2xl font-bold text-sidebar-foreground leading-snug">Almost there.</h2>
            <p className="mt-3 text-sm text-sidebar-foreground/70 leading-relaxed max-w-xs">
              We just need to confirm it is really you before your company workspace goes live.
            </p>
          </div>
          <p className="relative text-[11px] text-sidebar-foreground/50">&copy; {new Date().getFullYear()} NovaHR. All rights reserved.</p>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm space-y-6">
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-bold text-foreground">Check your email</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                We sent a confirmation link to <span className="font-medium text-foreground">{email}</span>. Click it, then sign in to set up {companyName || "your company"}.
              </p>
            </div>
            <Button asChild className="w-full h-10 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium">
              <Link href="/login">Go to sign in</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      <div className="fixed top-4 right-4 z-10"><ThemeToggle /></div>

      {/* Left branding panel */}
      <div className="hidden md:flex md:w-[45%] relative flex-col justify-between p-10 overflow-hidden bg-sidebar border-r border-sidebar-border">
        <div>
          <Link href="/"><Logo height={32} /></Link>
        </div>

        <div className="relative space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-sidebar-foreground leading-snug">
              Set your company up<br />in minutes.
            </h2>
            <p className="mt-3 text-sm text-sidebar-foreground/70 leading-relaxed max-w-sm">
              Add your team, run South African payroll, and manage leave and compliance, all in one place.
            </p>
          </div>

          <ul className="space-y-3">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                  <Icon size={14} className="text-primary" />
                </div>
                <span className="text-sm text-sidebar-foreground/70">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-[11px] text-sidebar-foreground/50">
          &copy; {new Date().getFullYear()} NovaHR. All rights reserved.
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="mb-8 md:hidden">
          <Link href="/"><Logo height={32} /></Link>
        </div>

        <div className="w-full max-w-sm">
          {/* Mobile-only: surface the branding value props as a collapsible. */}
          <details className="group mb-6 rounded-xl border bg-card md:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
              Why NovaHR?
              <ChevronDown className="size-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <div className="border-t px-4 py-4">
              <p className="text-sm text-muted-foreground">
                Add your team, run South African payroll, and manage leave and
                compliance, all in one place.
              </p>
              <ul className="mt-4 space-y-3">
                {HIGHLIGHTS.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-3">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                      <Icon size={14} className="text-primary" />
                    </div>
                    <span className="text-sm text-muted-foreground">{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </details>

          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-foreground">Sign your company up</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              You will be the first HR administrator for your new workspace.
            </p>
          </div>

          <GoogleSignInButton label="Continue with Google" />

          <div className="relative my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or create with email</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {error && (
            <FormAlert tone={authMessageTone(error)} className="mb-4">
              {error}
            </FormAlert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="companyName" className="text-sm font-medium text-muted-foreground">Company name</Label>
              <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Nova Technologies (Pty) Ltd" autoComplete="organization" required className="h-10 rounded-lg border-border bg-muted/30 text-foreground placeholder:text-muted-foreground/50 focus:border-primary" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="yourName" className="text-sm font-medium text-muted-foreground">Your name</Label>
              <Input id="yourName" value={yourName} onChange={(e) => setYourName(e.target.value)} placeholder="e.g. Jane Doe" autoComplete="name" required className="h-10 rounded-lg border-border bg-muted/30 text-foreground placeholder:text-muted-foreground/50 focus:border-primary" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="jobTitle">Your job title <OptionalTag /></Label>
              <Input id="jobTitle" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Founder, HR Manager, Financial Director" autoComplete="organization-title" className="h-10 rounded-lg border-border bg-muted/30 text-foreground placeholder:text-muted-foreground/50 focus:border-primary" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-muted-foreground">Work email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. john.smith@company.co.za" autoComplete="email" required className="h-10 rounded-lg border-border bg-muted/30 text-foreground placeholder:text-muted-foreground/50 focus:border-primary" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-muted-foreground">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password" autoComplete="new-password" minLength={8} required className="h-10 rounded-lg border-border bg-muted/30 text-foreground placeholder:text-muted-foreground/50 focus:border-primary pr-10" />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <PasswordChecklist password={password} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-muted-foreground">Confirm password</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                required
                className="h-10 rounded-lg border-border bg-muted/30 text-foreground placeholder:text-muted-foreground/50 focus:border-primary"
              />
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-xs text-warning">Passwords do not match yet.</p>
              )}
            </div>

            <div className="flex items-start gap-2.5 pt-1">
              <Checkbox
                id="agreeTerms"
                checked={agreed}
                onCheckedChange={(checked) => setAgreed(checked === true)}
                className="mt-0.5"
                aria-required="true"
              />
              <Label htmlFor="agreeTerms" className="text-xs font-normal leading-relaxed text-muted-foreground cursor-pointer">
                <span>
                  I agree to the{" "}
                  <Link href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:opacity-80 font-medium transition-opacity">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:opacity-80 font-medium transition-opacity">
                    Privacy Policy
                  </Link>
                  , and accept the{" "}
                  <Link href="/legal/dpa" target="_blank" rel="noopener noreferrer" className="text-primary hover:opacity-80 font-medium transition-opacity">
                    Data Processing Agreement
                  </Link>{" "}
                  on behalf of my company.
                </span>
              </Label>
            </div>

            <Button type="submit" disabled={submitting || !canSubmit} className="w-full h-10 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium mt-2">
              {submitting && <Loader2 size={16} className="animate-spin mr-2" />}
              {submitting ? "Signing your company up..." : "Sign your company up"}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:opacity-80 font-medium transition-opacity">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
