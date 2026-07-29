"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Check, HelpCircle, LogOut, UserCog, UserRound } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-provider";
import { useApp } from "@/lib/store/app-provider";
import { useCurrentTenant, useTenants } from "@/lib/store/hooks";
import { ROLE_LABELS } from "@/lib/auth/types";
import { TenantSwitcher } from "./tenant-switcher";
import { NotificationsMenu } from "./notifications-menu";
import { SupportHub } from "./support-hub";
import { CommandMenu } from "./command-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
  const { setTenant } = useApp();
  const tenant = useCurrentTenant();
  const tenants = useTenants();
  const router = useRouter();
  const canSwitchTenant = user?.role === "hr" || user?.role === "exco";

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
      <DropdownMenuContent align="end" sideOffset={8} collisionPadding={12} className="w-60">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">{ROLE_LABELS[user.role]}</p>
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
            <UserCog className="size-4" />
            My account
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

        {canSwitchTenant && tenants.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
              Workspace
            </DropdownMenuLabel>
            {tenants.map((t) => (
              <DropdownMenuItem key={t.id} onClick={() => setTenant(t.id)} className="gap-2 py-2">
                <span
                  className="flex size-6 shrink-0 items-center justify-center rounded-md overflow-hidden text-[11px] font-semibold text-white"
                  style={{ backgroundColor: t.logoUrl ? "transparent" : t.color }}
                >
                  {t.logoUrl ? (
                    <Image src={t.logoUrl} alt={t.name} width={24} height={24} className="h-full w-full object-contain" unoptimized />
                  ) : (
                    t.initials
                  )}
                </span>
                <span className="truncate text-sm">{t.name}</span>
                <Check className={cn("ml-auto size-4 text-primary", t.id === tenant.id ? "opacity-100" : "opacity-0")} />
              </DropdownMenuItem>
            ))}
          </>
        )}

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
      {/* Search bar - flex-1 so right icons stay pinned to the right edge */}
      <div className="flex-1 min-w-0">
        <CommandMenu />
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <SupportHub />
        <NotificationsMenu />
        {/* Workspace switcher: desktop only — mobile shows it inside the profile menu */}
        {canSwitchTenant && <span className="hidden md:flex"><TenantSwitcher /></span>}
        <MobileProfileMenu />
      </div>
    </header>
  );
}
