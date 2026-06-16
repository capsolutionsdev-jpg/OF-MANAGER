"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, Palette, LifeBuoy } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/console", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { href: "/console/organismes", label: "Organismes", icon: Building2 },
  { href: "/console/support", label: "Support", icon: LifeBuoy, badgeKey: "support" as const },
  { href: "/console/designs", label: "Designs", icon: Palette },
];

export function ConsoleNav({ supportUnread = 0 }: { supportUnread?: number }) {
  const pathname = usePathname();
  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="flex items-center gap-1">
      {ITEMS.map((it) => {
        const active = isActive(it.href, it.exact);
        const badge = it.badgeKey === "support" && supportUnread > 0 ? supportUnread : 0;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              "relative flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <it.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{it.label}</span>
            {badge > 0 && (
              <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                {badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
