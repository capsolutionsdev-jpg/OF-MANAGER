"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationGroups } from "@/lib/navigation-groups";
import { cn } from "@/lib/utils";

/**
 * Phase 3.5 — Mobile Bottom Navigation
 * 6 main métiers accessible from bottom on mobile
 */
export function MobileBottomNav() {
  const pathname = usePathname();

  // Get first 6 groups (one per tab)
  const groups = navigationGroups.slice(0, 6);

  type NavGroup = (typeof navigationGroups)[number];
  const getGroupHref = (group: NavGroup) => {
    // Navigate to first item in group
    return group.items[0]?.href || "/dashboard";
  };

  const isGroupActive = (group: NavGroup) => {
    return group.items.some((item) => pathname.startsWith(item.href));
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 md:hidden border-t bg-background z-40"
      aria-label="Navigation mobile"
    >
      <div className="flex justify-around">
        {groups.map((group) => {
          const href = getGroupHref(group);
          const isActive = isGroupActive(group);

          return (
            <Link
              key={group.key}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-3 px-2 text-xs font-medium transition-colors",
                "min-h-16", // 48px minimum touch target
                isActive
                  ? "text-primary border-t-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <group.icon className="h-6 w-6 mb-1" />
              <span className="truncate">{group.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
