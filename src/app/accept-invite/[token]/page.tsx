"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/auth/auth-shell";
import { FormAlert } from "@/components/ui/form-alert";
import { PasswordChecklist, isPasswordValid } from "@/components/auth/password-checklist";
import { authMessageTone } from "@/lib/errors";
import { createClient } from "@/lib/supabase/client";
import {
  acceptInviteAction,
  getInviteByTokenAction,
  type PublicInviteInfo,
} from "@/lib/invites/actions";

export default function AcceptInvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;

  const [invite, setInvite] = React.useState<PublicInviteInfo | null>(null);
  const [loadError, setLoadError] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  const [name, setName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    getInviteByTokenAction(token)
      .then((result) => {
        if (!active) return;
        if (result.invite) {
          setInvite(result.invite);
          setName(result.invite.name);
        } else {
          setLoadError(result.error ?? "This invitation is no longer valid.");
        }
      })
      .catch(() => {
        if (active) setLoadError("Couldn't load this invitation. Please try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (!isPasswordValid(password)) {
      setError("Please choose a password that meets all the requirements shown.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    const result = await acceptInviteAction({ token, name: name.trim(), password });
    if (result.status === "error") {
      setError(result.message);
      setSubmitting(false);
      return;
    }

    const { error: signInError } = await createClient().auth.signInWithPassword({
      email: result.email,
      password,
    });
    if (signInError) {
      // Account exists; the password just set works, so send them to login.
      router.replace("/login");
      return;
    }

    router.replace("/dashboard");
  }

  if (loading) {
    return (
      <AuthShell heading="Checking your invitation." description="One moment while we verify your invite link.">
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Verifying invitation...
        </div>
      </AuthShell>
    );
  }

  if (loadError || !invite) {
    return (
      <AuthShell
        heading="This invitation isn't valid."
        description="Invite links expire after 7 days and can only be used once."
      >
        <div className="space-y-1.5 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Invitation unavailable</h2>
          <p className="text-sm text-muted-foreground">{loadError}</p>
        </div>
        <Button asChild size="lg" className="w-full">
          <Link href="/login">Go to sign in</Link>
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      heading={`Join ${invite.companyName} on NovaHR.`}
      description="Set a password to activate your account and get started."
    >
      <div className="space-y-1.5">
        <h2 className="text-2xl font-semibold tracking-tight">Accept your invitation</h2>
        <p className="text-sm text-muted-foreground">
          You&apos;re joining <span className="font-medium text-foreground">{invite.companyName}</span>{" "}
          as {invite.email}.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Your name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            minLength={2}
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
          <PasswordChecklist password={password} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
          {confirmPassword.length > 0 && password !== confirmPassword && (
            <p className="text-xs text-warning">Passwords do not match yet.</p>
          )}
        </div>

        {error && <FormAlert tone={authMessageTone(error)}>{error}</FormAlert>}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={submitting || !isPasswordValid(password) || password !== confirmPassword}
        >
          {submitting ? "Creating your account..." : "Accept and join"}
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
