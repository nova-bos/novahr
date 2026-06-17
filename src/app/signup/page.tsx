"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/auth/auth-shell";
import { useAuth } from "@/lib/auth/auth-provider";
import { createCompanyAccount } from "./actions";

export default function SignupPage() {
  const router = useRouter();
  const { user, isLoading, refresh } = useAuth();

  const [companyName, setCompanyName] = React.useState("");
  const [yourName, setYourName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
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
      <AuthShell
        heading="Almost there."
        description="We just need to confirm it's really you before your company workspace goes live."
      >
        <div className="space-y-1.5 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Check your email</h2>
          <p className="text-sm text-muted-foreground">
            We&apos;ve sent a confirmation link to <span className="font-medium">{email}</span>.
            Click it, then come back and sign in to set up {companyName || "your company"}.
          </p>
        </div>
        <Button asChild size="lg" className="w-full">
          <Link href="/login">Go to sign in</Link>
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      heading="Set up your company in minutes."
      description="Create your workspace, add your team, and run your first payroll - all from one place."
    >
      <div className="space-y-1.5">
        <h2 className="text-2xl font-semibold tracking-tight">Create your company</h2>
        <p className="text-sm text-muted-foreground">
          You&apos;ll be the first HR administrator for your new workspace.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="companyName">Company name</Label>
          <Input
            id="companyName"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Acme Co"
            autoComplete="organization"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="yourName">Your name</Label>
          <Input
            id="yourName"
            value={yourName}
            onChange={(e) => setYourName(e.target.value)}
            placeholder="Jane Doe"
            autoComplete="name"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="pr-10"
              minLength={8}
              required
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
          <p className="text-xs text-muted-foreground">At least 8 characters.</p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? "Creating your company..." : "Create your company"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
