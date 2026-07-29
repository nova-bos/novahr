"use client";

import Image from "next/image";
import Link from "next/link";
import { useCurrentTenant } from "@/lib/store/hooks";

export function TenantSwitcher() {
  const tenant = useCurrentTenant();

  return (
    <Link
      href="/settings"
      className="flex h-9 items-center gap-2 rounded-md border border-border/70 bg-background px-2.5 text-sm font-medium hover:bg-muted transition-colors sm:max-w-[220px]"
      aria-label="Company settings"
    >
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
    </Link>
  );
}
