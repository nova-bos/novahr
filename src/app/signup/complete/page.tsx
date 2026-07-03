"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/lib/auth/auth-provider";
import { completeGoogleSignup } from "../actions";

export default function CompleteSetupPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [companyName, setCompanyName] = React.useState("");
  const [error, setError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    const result = await completeGoogleSignup(companyName);

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

      <div className="hidden md:flex md:w-[45%] relative flex-col justify-between p-10 overflow-hidden bg-sidebar">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/20 blur-[100px]" />
          <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-primary/10 blur-[80px]" />
        </div>
        <div className="relative">
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
            Tell us your company name to finish setting up your NovaHR workspace. You can update everything else from Settings later.
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
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">Complete your setup</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your company name to create your workspace.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
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
                placeholder="Acme Co"
                autoComplete="organization"
                required
                autoFocus
                className="h-10 rounded-lg border-border bg-muted/30 text-foreground placeholder:text-muted-foreground/50 focus:border-primary"
              />
            </div>

            <Button
              type="submit"
              disabled={submitting || !companyName.trim()}
              className="w-full h-10 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium mt-2"
            >
              {submitting && <Loader2 size={16} className="animate-spin mr-2" />}
              {submitting ? "Setting up..." : "Create my workspace"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
