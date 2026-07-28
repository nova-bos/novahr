"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { FormAlert } from "@/components/ui/form-alert";
import { authMessageTone } from "@/lib/errors";
import { useAuth } from "@/lib/auth/auth-provider";
import { completeGoogleSignup } from "../actions";

export default function CompleteSetupPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [companyName, setCompanyName] = React.useState("");
  const [agreed, setAgreed] = React.useState(false);
  const [error, setError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const canSubmit = companyName.trim().length >= 2 && agreed;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setError("");
    setSubmitting(true);

    const result = await completeGoogleSignup(companyName, agreed);

    if (result.status === "error") {
      setError(result.message);
      setSubmitting(false);
      return;
    }

    await refresh();
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex bg-background overflow-x-hidden">
      <div className="fixed top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="hidden md:flex md:w-[45%] flex-col justify-between p-10 overflow-hidden bg-sidebar border-r border-sidebar-border">
        <div>
          <Logo height={32} />
        </div>
        <div className="relative space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
            <Building2 size={22} className="text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-sidebar-foreground leading-snug">
            One last step.
          </h2>
          <p className="text-sm text-sidebar-foreground/70 leading-relaxed max-w-xs">
            Tell us your company name to finish setting up NovaHR. You can update everything else from Settings later.
          </p>
        </div>
        <p className="relative text-[11px] text-sidebar-foreground/50">
          &copy; {new Date().getFullYear()} NovaHR. All rights reserved.
        </p>
      </div>

      <div className="flex min-w-0 flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="mb-8 md:hidden">
          <Logo height={32} />
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-foreground">Complete your setup</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your company name to get started.
            </p>
          </div>

          {error && (
            <FormAlert tone={authMessageTone(error)} className="mb-4">
              {error}
            </FormAlert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="companyName" className="text-sm font-medium text-muted-foreground">
                Company name
              </Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => { setCompanyName(e.target.value); setError(""); }}
                placeholder="e.g. Nova Technologies (Pty) Ltd"
                autoComplete="organization"
                required
                autoFocus
                className="h-10 rounded-lg border-border bg-muted/30 text-foreground placeholder:text-muted-foreground/50 focus:border-primary"
              />
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

            <Button
              type="submit"
              disabled={submitting || !canSubmit}
              className="w-full h-10 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium mt-2"
            >
              {submitting && <Loader2 size={16} className="animate-spin mr-2" />}
              {submitting ? "Setting up..." : "Create my company"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
