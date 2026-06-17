"use client";

import { Bell, CheckCheck, CircleAlert, Info, PartyPopper } from "lucide-react";

import { cn } from "@/lib/utils";
import { useApp } from "@/lib/store/app-provider";
import { useNotifications, useUnreadNotificationCount } from "@/lib/store/hooks";
import { formatRelativeTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

export function NotificationsMenu() {
  const notifications = useNotifications();
  const unreadCount = useUnreadNotificationCount();
  const { markNotificationRead, markAllNotificationsRead, state } = useApp();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative size-9 text-muted-foreground">
          <Bell className="size-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex size-2 rounded-full bg-primary ring-2 ring-background" />
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-90 p-0" sideOffset={10}>
        <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
          <p className="text-sm font-semibold">Notifications</p>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs text-muted-foreground"
              onClick={() => void markAllNotificationsRead(state.tenantId)}
            >
              <CheckCheck className="size-3.5" />
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          {notifications.length === 0 ? (
            <p className="px-3.5 py-8 text-center text-sm text-muted-foreground">
              You&apos;re all caught up.
            </p>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notification) => {
                const Icon = ICONS[notification.type];
                return (
                  <button
                    key={notification.id}
                    onClick={() => void markNotificationRead(notification.id)}
                    className={cn(
                      "flex w-full items-start gap-3 border-b border-border/60 px-3.5 py-3 text-left transition-colors last:border-b-0 hover:bg-muted/60",
                      !notification.read && "bg-primary/[0.03]"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
                        ICON_STYLES[notification.type]
                      )}
                    >
                      <Icon className="size-3.5" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{notification.title}</span>
                        {!notification.read && (
                          <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                        )}
                      </span>
                      <span className="text-xs leading-relaxed text-muted-foreground">
                        {notification.description}
                      </span>
                      <span className="text-[11px] text-muted-foreground/70">
                        {formatRelativeTime(notification.timestamp)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
