"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Users, ShieldCheck, CalendarRange } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/lib/auth/auth-provider";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { createCompanyAccount } from "./actions";

const HIGHLIGHTS = [
  { icon: Users, text: "Add your whole team in one go" },
  { icon: ShieldCheck, text: "POPIA-ready and South African payroll compliant" },
  { icon: CalendarRange, text: "Leave, payslips, and payroll from one place" },
];

export default function SignupPage() {
  const router = useRouter();
  const { user, isLoading, refresh } = useAuth();

  const [companyName, setCompanyName] = React.useState("");
  const [yourName, setYourName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [agreed, setAgreed] = React.useState(false);
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
    if (!agreed) {
      return;
    }
    setError("");
    setSubmitting(true);

    const result = await createCompanyAccount({ companyName, yourName, email, password });

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
        <div className="hidden md:flex md:w-[45%] relative flex-col justify-between p-10 overflow-hidden bg-sidebar">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/20 blur-[100px]" />
            <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-primary/10 blur-[80px]" />
          </div>
          <div className="relative"><Link href="/"><Logo height={32} /></Link></div>
          <div className="relative">
            <h2 className="text-2xl font-bold text-sidebar-foreground leading-snug">Almost there.</h2>
            <p className="mt-3 text-sm text-sidebar-foreground/70 leading-relaxed max-w-xs">
              We just need to confirm it is really you before your company workspace goes live.
            </p>
          </div>
          <p className="relative text-[11px] text-sidebar-foreground/50">&copy; {new Date().getFullYear()} NovaHR. All rights reserved.</p>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm space-y-6">
            <div className="mb-8">
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
      <div className="hidden md:flex md:w-[45%] relative flex-col justify-between p-10 overflow-hidden bg-sidebar">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/20 blur-[100px]" />
          <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-primary/10 blur-[80px]" />
        </div>

        <div className="relative">
          <Link href="/"><Logo height={32} /></Link>
        </div>

        <div className="relative space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-sidebar-foreground leading-snug">
              Set up your company<br />in minutes.
            </h2>
            <p className="mt-3 text-sm text-sidebar-foreground/70 leading-relaxed max-w-xs">
              Create your workspace, add your team, and run your first payroll, all from one place.
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
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">Create your company</h1>
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
            <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
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
              <Label htmlFor="email" className="text-sm font-medium text-muted-foreground">Work email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. john.smith@company.co.za" autoComplete="email" required className="h-10 rounded-lg border-border bg-muted/30 text-foreground placeholder:text-muted-foreground/50 focus:border-primary" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-muted-foreground">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 characters" autoComplete="new-password" minLength={8} required className="h-10 rounded-lg border-border bg-muted/30 text-foreground placeholder:text-muted-foreground/50 focus:border-primary pr-10" />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
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

            <Button type="submit" disabled={submitting || !agreed} className="w-full h-10 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium mt-2">
              {submitting && <Loader2 size={16} className="animate-spin mr-2" />}
              {submitting ? "Creating your company..." : "Create your company"}
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
