"use client";

import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth/auth-provider";
import { getNavItems, type NavItem } from "./nav-config";
import { TenantSwitcher } from "./tenant-switcher";
import { NotificationsMenu } from "./notifications-menu";
import { CommandMenu } from "./command-menu";

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
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border/70 bg-background/80 px-4 backdrop-blur-sm sm:px-6">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-5 data-[orientation=vertical]:h-5" />
      <h1 className="truncate text-sm font-semibold tracking-tight text-foreground">
        {pageTitle(pathname, navItems)}
      </h1>
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <CommandMenu />
        {canSwitchTenant && <TenantSwitcher />}
        <NotificationsMenu />
      </div>
    </header>
  );
}
