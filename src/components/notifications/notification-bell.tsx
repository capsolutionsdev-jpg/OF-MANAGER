"use client";

import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { markNotificationsRead } from "@/lib/actions/notification-actions";
import type { NotificationsData, NotifSeverity } from "@/lib/notifications";

const DOT: Record<NotifSeverity, string> = {
  info: "bg-blue-500",
  warn: "bg-amber-500",
  danger: "bg-red-500",
};

function ago(iso: string) {
  const d = new Date(iso);
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  const days = Math.floor(s / 86400);
  if (days < 30) return `il y a ${days} j`;
  return d.toLocaleDateString("fr-FR");
}

export function NotificationBell({ data }: { data: NotificationsData }) {
  const { items, unread, seenAt } = data;
  const seen = seenAt ? new Date(seenAt) : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative text-muted-foreground"
            aria-label={`Notifications${unread > 0 ? ` (${unread} non lues)` : ""}`}
          />
        }
      >
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          {items.length > 0 && (
            <form action={markNotificationsRead}>
              <button
                type="submit"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Tout marquer comme lu
              </button>
            </form>
          )}
        </div>

        <div className="max-h-[380px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-1 px-4 py-10 text-center">
              <Bell className="h-6 w-6 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Aucune notification</p>
            </div>
          ) : (
            items.map((n) => {
              const isUnread = !seen || new Date(n.date) > seen;
              return (
                <Link
                  key={n.key}
                  href={n.href}
                  className={`flex gap-2.5 border-b px-3 py-2.5 text-sm last:border-0 hover:bg-muted ${
                    isUnread ? "bg-primary/[0.04]" : ""
                  }`}
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[n.severity]}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {n.category}
                    </span>
                    <span className="block truncate font-medium">{n.title}</span>
                    {n.detail && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {n.detail}
                      </span>
                    )}
                    <span className="text-[11px] text-muted-foreground/70">{ago(n.date)}</span>
                  </span>
                </Link>
              );
            })
          )}
        </div>

        <div className="border-t px-3 py-2 text-center">
          <Link href="/notifications" className="text-xs font-medium text-primary hover:underline">
            Voir toutes les notifications
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
