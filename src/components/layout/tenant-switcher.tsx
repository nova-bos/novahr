"use client";

import { Building2, Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { useApp } from "@/lib/store/app-provider";
import { useCurrentTenant, useTenants } from "@/lib/store/hooks";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function TenantSwitcher() {
  const tenant = useCurrentTenant();
  const tenants = useTenants();
  const { setTenant } = useApp();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-9 justify-between gap-2 border-border/70 bg-background px-2 sm:max-w-[220px] sm:px-2.5 font-normal shadow-none"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span
              className="flex size-6 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold text-white"
              style={{ backgroundColor: tenant.color }}
            >
              {tenant.initials}
            </span>
            <span className="hidden truncate text-sm font-medium sm:inline">{tenant.name}</span>
          </span>
          <ChevronsUpDown className="hidden size-3.5 shrink-0 text-muted-foreground sm:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
          Switch workspace
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {tenants.map((t) => (
          <DropdownMenuItem
            key={t.id}
            onClick={() => setTenant(t.id)}
            className="gap-2 py-2"
          >
            <span
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold text-white"
              style={{ backgroundColor: t.color }}
            >
              {t.initials}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">{t.name}</span>
              <span className="truncate text-xs text-muted-foreground">{t.industry}</span>
            </span>
            <Check
              className={cn(
                "ml-auto size-4 text-primary",
                t.id === tenant.id ? "opacity-100" : "opacity-0"
              )}
            />
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2 text-muted-foreground" disabled>
          <Building2 className="size-4" />
          Manage workspaces
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
