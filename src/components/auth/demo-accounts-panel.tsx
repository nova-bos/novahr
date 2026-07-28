"use client";

import * as React from "react";
import { Building2, ShieldCheck, User, Users, type LucideIcon } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { demoUsers } from "@/lib/auth/demo-users";
import { ROLE_LABELS, type UserRole } from "@/lib/auth/types";
import { cn } from "@/lib/utils";

const ROLE_ICONS: Record<UserRole, LucideIcon> = {
  employee: User,
  manager: Users,
  hr: ShieldCheck,
  exco: Building2,
};

export interface DemoSelection {
  email: string;
  password: string;
  firstName: string;
}

/**
 * Development-only persona picker for the login screen. Lives in its own module
 * so that the demo credentials in `demo-users.ts` are code-split out of the main
 * login bundle and never loaded in production (this panel is dynamically
 * imported behind a build-time env flag).
 */
export function DemoAccountsPanel({
  onSelect,
}: {
  onSelect: (selection: DemoSelection) => void;
}) {
  const [selectedId, setSelectedId] = React.useState(demoUsers[0].id);

  const select = React.useCallback(
    (id: string) => {
      const persona = demoUsers.find((candidate) => candidate.id === id);
      if (!persona) return;
      setSelectedId(id);
      onSelect({
        email: persona.email,
        password: persona.password,
        firstName: persona.name.split(" ")[0],
      });
    },
    [onSelect],
  );

  // Prefill the first persona once on mount.
  React.useEffect(() => {
    select(demoUsers[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
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
              onClick={() => select(persona.id)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors",
                selected
                  ? "border-primary/30 bg-primary/5"
                  : "border-border bg-muted/20 hover:border-primary/30 hover:bg-muted/30",
              )}
            >
              <div className="flex min-w-0 items-center gap-2">
                <Avatar className="h-5 w-5 shrink-0">
                  <AvatarFallback
                    className="text-[9px] font-semibold text-white"
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
  );
}
