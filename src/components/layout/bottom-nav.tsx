"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-provider";
import { cn } from "@/lib/utils";
import { getNavItems } from "./nav-config";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const PRIMARY_NAV_COUNT = 4;

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [moreOpen, setMoreOpen] = React.useState(false);

  const allItems = getNavItems(user);

  if (!allItems.length) return null;

  const primaryItems = allItems.slice(0, PRIMARY_NAV_COUNT);
  const overflowItems = allItems.slice(PRIMARY_NAV_COUNT);
  const hasOverflow = overflowItems.length > 0;

  const isOverflowActive = overflowItems.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );

  function handleOverflowNavClick(href: string) {
    setMoreOpen(false);
    router.push(href);
  }

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden border-t border-border bg-background/95 backdrop-blur-sm"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {primaryItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon
                className={cn("size-5 shrink-0", isActive && "stroke-[2.5px]")}
              />
              <span className="truncate">{item.title}</span>
            </Link>
          );
        })}

        {hasOverflow && (
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
              isOverflowActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <MoreHorizontal
              className={cn(
                "size-5 shrink-0",
                isOverflowActive && "stroke-[2.5px]"
              )}
            />
            <span className="truncate">More</span>
          </button>
        )}
      </nav>

      {hasOverflow && (
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetContent side="bottom" showCloseButton className="pb-safe">
            <SheetHeader>
              <SheetTitle>More</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-1 p-4 pt-2">
              {overflowItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                return (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => handleOverflowNavClick(item.href)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left w-full",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "size-5 shrink-0",
                        isActive && "stroke-[2.5px]"
                      )}
                    />
                    {item.title}
                  </button>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}
