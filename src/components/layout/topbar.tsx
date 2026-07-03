"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-provider";
import { getNavItems, type NavItem } from "./nav-config";
import { TenantSwitcher } from "./tenant-switcher";
import { NotificationsMenu } from "./notifications-menu";
import { SupportHub } from "./support-hub";
import { CommandMenu } from "./command-menu";
import { ThemeToggle } from "@/components/ui/theme-toggle";

function pageTitle(pathname: string, navItems: NavItem[]): string {
  const match = navItems.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );
  return match?.title ?? "NovaHR";
}

export function Topbar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const navItems = getNavItems(user);
  const canSwitchTenant = user?.role === "hr" || user?.role === "exco";

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 overflow-x-hidden border-b border-border/70 bg-background/80 px-4 backdrop-blur-sm sm:gap-3 sm:px-6">
      <h1 className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight text-foreground">
        {pageTitle(pathname, navItems)}
      </h1>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <SupportHub />
        <NotificationsMenu />
        <ThemeToggle />
        {canSwitchTenant && <TenantSwitcher />}
        <CommandMenu />
      </div>
    </header>
  );
}
