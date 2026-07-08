"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Building2, Users, Wallet, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SetupStep {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
}

const SETUP_STEPS: SetupStep[] = [
  {
    icon: Building2,
    title: "Set up your company profile",
    description: "Add your legal name, registration number, and address.",
    href: "/settings",
  },
  {
    icon: Users,
    title: "Add your employees",
    description: "Onboard your team, individually or via CSV import.",
    href: "/employees/new",
  },
  {
    icon: Wallet,
    title: "Configure payroll settings",
    description: "Set up tax, UIF, SDL, and pay frequencies.",
    href: "/settings?tab=payroll",
  },
  {
    icon: UserPlus,
    title: "Invite your team members",
    description: "Give managers and executives access to NovaHR.",
    href: "/settings?tab=users",
  },
];

interface WelcomeModalProps {
  companyName: string;
  tenantId: string;
}

export function WelcomeModal({ companyName, tenantId }: WelcomeModalProps) {
  const router = useRouter();
  const storageKey = `novahr_welcome_seen_${tenantId}`;

  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem(storageKey);
    if (!seen) {
      setOpen(true);
    }
  }, [storageKey]);

  function dismiss() {
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, "1");
    }
    setOpen(false);
  }

  function handleGetStarted() {
    dismiss();
    router.push("/settings");
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) dismiss(); }}>
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-lg">
            Welcome to NovaHR, {companyName}!
          </DialogTitle>
          <DialogDescription>
            You are all set. Here are a few quick steps to get your workspace ready.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2">
          {SETUP_STEPS.map((step, idx) => (
            <div
              key={step.href}
              className="flex items-start gap-3 rounded-lg border border-border/60 p-3"
            >
              <div
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-md text-sm font-semibold",
                  "bg-primary/10 text-primary"
                )}
              >
                {idx + 1}
              </div>
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="text-sm font-medium leading-snug">{step.title}</p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-border" aria-hidden />
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <Button onClick={handleGetStarted} className="w-full">
            Let&apos;s get started
          </Button>
          <button
            type="button"
            onClick={dismiss}
            className="text-xs text-muted-foreground underline-offset-3 hover:underline self-center"
          >
            Skip for now
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
