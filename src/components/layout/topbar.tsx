"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, HelpCircle, LogOut, Settings, UserRound } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-provider";
import { ROLE_LABELS } from "@/lib/auth/types";
import { TenantSwitcher } from "./tenant-switcher";
import { NotificationsMenu } from "./notifications-menu";
import { SupportHub } from "./support-hub";
import { CommandMenu } from "./command-menu";
import { LogoIcon } from "./logo";
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
      <DropdownMenuContent align="end" sideOffset={8} collisionPadding={12} className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {ROLE_LABELS[user.role]}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {user.employeeId && (
          <DropdownMenuItem asChild>
            <Link href={`/employees/${user.employeeId}`}>
              <UserRound className="size-4" />
              My profile
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link href="/account">
            <Settings className="size-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        {user.role === "hr" && (
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <Building2 className="size-4" />
              Company settings
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <a href="mailto:support@novabos.co.za">
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
  const { user } = useAuth();
  const canSwitchTenant = user?.role === "hr" || user?.role === "exco";

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full shrink-0 items-center gap-3 overflow-x-hidden border-b border-border/70 bg-background/80 px-4 backdrop-blur-sm sm:px-6">
      {/* Logo visible on mobile only; sidebar carries it on desktop */}
      <Link href="/dashboard" className="flex md:hidden shrink-0 items-center" aria-label="Home">
        <LogoIcon size={28} />
      </Link>

      {/* Search bar - flex-1 so right icons stay pinned to the right edge */}
      <div className="flex-1 min-w-0">
        <CommandMenu />
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <SupportHub />
        <NotificationsMenu />
        {canSwitchTenant && <TenantSwitcher />}
        <MobileProfileMenu />
      </div>
    </header>
  );
}
