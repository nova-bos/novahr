"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { HelpCircle, LogOut, Settings, User } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-provider";
import { ROLE_LABELS } from "@/lib/auth/types";
import { getNavItems, type NavItem } from "./nav-config";
import { TenantSwitcher } from "./tenant-switcher";
import { NotificationsMenu } from "./notifications-menu";
import { SupportHub } from "./support-hub";
import { CommandMenu } from "./command-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function pageTitle(pathname: string, navItems: NavItem[]): string {
  const match = navItems.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );
  return match?.title ?? "NovaHR";
}

function MobileProfileMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden size-8 rounded-full p-0"
          aria-label="Account menu"
        >
          <Avatar className="size-7">
            <AvatarFallback
              className="text-xs font-semibold text-white"
              style={{ backgroundColor: user.avatarColor }}
            >
              {user.initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {ROLE_LABELS[user.role]}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account">
            <User className="size-4" />
            My account
          </Link>
        </DropdownMenuItem>
        {user.role === "hr" && (
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <Settings className="size-4" />
              Settings
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <a href="mailto:hello@novahr.co.za">
            <HelpCircle className="size-4" />
            Help &amp; support
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
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
        {canSwitchTenant && <TenantSwitcher />}
        <CommandMenu />
        <MobileProfileMenu />
      </div>
    </header>
  );
}
