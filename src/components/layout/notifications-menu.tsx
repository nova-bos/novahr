"use client";

import * as React from "react";
import { Bell, CheckCheck, CircleAlert, Info, Mail, MailOpen, PartyPopper, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useApp } from "@/lib/store/app-provider";
import { useNotifications, useUnreadNotificationCount } from "@/lib/store/hooks";
import { formatRelativeTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import type { NotificationItem } from "@/lib/types";

const ICONS: Record<NotificationItem["type"], React.ComponentType<{ className?: string }>> = {
  info: Info,
  success: PartyPopper,
  warning: CircleAlert,
};

const ICON_STYLES: Record<NotificationItem["type"], string> = {
  info: "bg-info/10 text-info",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
};

const INITIAL_VISIBLE = 8;

export function NotificationsMenu() {
  const notifications = useNotifications();
  const unreadCount = useUnreadNotificationCount();
  const { markNotificationRead, markNotificationUnread, markAllNotificationsRead } = useApp();
  const [open, setOpen] = React.useState(false);
  const [showAll, setShowAll] = React.useState(false);

  const visible = showAll ? notifications : notifications.slice(0, INITIAL_VISIBLE);
  const hiddenCount = notifications.length - INITIAL_VISIBLE;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative size-9 text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Bell className="size-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex size-2 rounded-full bg-primary ring-2 ring-background" />
        )}
        <span className="sr-only">Notifications</span>
      </Button>

      <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) setShowAll(false); }}>
        <SheetContent
          side="right"
          showCloseButton={false}
          aria-describedby={undefined}
          className="flex w-full flex-col p-0 sm:max-w-sm"
        >
          {/* Header row: title | mark-all-read | close */}
          <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
            <SheetTitle className="flex-1 text-base">Notifications</SheetTitle>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => void markAllNotificationsRead()}
              >
                <CheckCheck className="size-3.5" />
                Mark all read
              </Button>
            )}
            <SheetClose asChild>
              <Button variant="ghost" size="icon-sm" className="shrink-0 text-muted-foreground">
                <X className="size-4" />
                <span className="sr-only">Close</span>
              </Button>
            </SheetClose>
          </div>

          <div className="flex flex-1 flex-col overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-sm text-muted-foreground">You&apos;re all caught up.</p>
              </div>
            ) : (
              <>
                <div className="flex flex-col">
                  {visible.map((notification) => {
                    const Icon = ICONS[notification.type];
                    return (
                      <button
                        key={notification.id}
                        onClick={() => void markNotificationRead(notification.id)}
                        className={cn(
                          "flex w-full items-start gap-3 border-b border-border/60 px-4 py-3.5 text-left transition-colors last:border-b-0 hover:bg-muted/60",
                          !notification.read && "bg-accent"
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                            ICON_STYLES[notification.type]
                          )}
                        >
                          <Icon className="size-4" />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="text-sm font-medium leading-snug">{notification.title}</span>
                          <span className="text-xs leading-relaxed text-muted-foreground">
                            {notification.description}
                          </span>
                          <span className="mt-0.5 text-[11px] text-muted-foreground/70">
                            {formatRelativeTime(notification.timestamp)}
                          </span>
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (notification.read) {
                              void markNotificationUnread(notification.id);
                            } else {
                              void markNotificationRead(notification.id);
                            }
                          }}
                          className="shrink-0 self-start mt-0.5 text-muted-foreground/50 transition-colors hover:text-primary"
                          title={notification.read ? "Mark as unread" : "Mark as read"}
                        >
                          {notification.read ? (
                            <MailOpen className="size-3.5" />
                          ) : (
                            <Mail className="size-3.5 text-primary" />
                          )}
                        </button>
                      </button>
                    );
                  })}
                </div>

                {!showAll && hiddenCount > 0 && (
                  <button
                    onClick={() => setShowAll(true)}
                    className="flex w-full items-center justify-center border-t border-border px-4 py-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                  >
                    See all {notifications.length} notifications
                  </button>
                )}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
