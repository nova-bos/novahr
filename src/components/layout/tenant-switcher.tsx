"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCurrentTenant } from "@/lib/store/hooks";
import {
  listMyTenantsAction,
  switchTenantAction,
  type TenantMembershipDto,
} from "@/lib/auth/membership-actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function TenantBadge({ withChevron }: { withChevron?: boolean }) {
  const tenant = useCurrentTenant();
  return (
    <>
      <span
        className="flex size-6 shrink-0 items-center justify-center rounded-md overflow-hidden text-[11px] font-semibold text-white"
        style={{ backgroundColor: tenant.logoUrl ? "transparent" : tenant.color }}
      >
        {tenant.logoUrl ? (
          <Image
            src={tenant.logoUrl}
            alt={tenant.name}
            width={24}
            height={24}
            className="h-full w-full object-contain"
            unoptimized
          />
        ) : (
          tenant.initials
        )}
      </span>
      <span className="hidden truncate sm:inline">{tenant.name}</span>
      {withChevron ? <ChevronsUpDown className="ml-auto hidden size-3.5 opacity-60 sm:inline" /> : null}
    </>
  );
}

const TRIGGER_CLASS =
  "flex h-9 items-center gap-2 rounded-md border border-border/70 bg-background px-2.5 text-sm font-medium hover:bg-muted transition-colors sm:max-w-[220px]";

export function TenantSwitcher() {
  const [tenants, setTenants] = React.useState<TenantMembershipDto[] | null>(null);
  const [switching, setSwitching] = React.useState(false);

  React.useEffect(() => {
    listMyTenantsAction()
      .then(setTenants)
      .catch(() => setTenants([]));
  }, []);

  async function switchTo(tenantId: string) {
    setSwitching(true);
    try {
      await switchTenantAction(tenantId);
      // Full reload so the workspace re-loads for the newly active tenant.
      window.location.href = "/dashboard";
    } catch (err) {
      setSwitching(false);
      toast.error("Could not switch workspace", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  }

  // One (or unknown) workspace: keep the original badge that links to settings.
  if (!tenants || tenants.length <= 1) {
    return (
      <Link href="/settings" className={TRIGGER_CLASS} aria-label="Company settings">
        <TenantBadge />
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={TRIGGER_CLASS} aria-label="Switch workspace" disabled={switching}>
        {switching ? <Loader2 className="size-4 animate-spin" /> : <TenantBadge withChevron />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>Switch workspace</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {tenants.map((t) => (
          <DropdownMenuItem
            key={t.tenantId}
            disabled={switching}
            onClick={() => (t.isActive ? undefined : switchTo(t.tenantId))}
          >
            <span className="truncate">{t.tenantName}</span>
            {t.isActive ? <Check className="ml-auto size-4 text-primary" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
