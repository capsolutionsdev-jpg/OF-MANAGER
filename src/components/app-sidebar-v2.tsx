"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Search } from "lucide-react";
import type { Role } from "@prisma/client";
import { getVisibleGroups, type NavigationGroup } from "@/lib/navigation-groups";
import { cn } from "@/lib/utils";

type NavUser = {
  role: Role;
  permissions?: string[];
  fonctionnalites?: string[];
};

/**
 * AppSidebarV2 — Reorganized with 6 métiers (groups)
 *
 * Structure:
 * - SidebarHeader (logo + organisme name)
 * - SidebarNav
 *   - GlobalSearch (Cmd+K)
 *   - SidebarGroups (6 groups, collapsible)
 * - SidebarFooter (profile, theme toggle, logout)
 */
export function AppSidebarV2({
  user,
  organisme,
  onNavigate,
}: {
  user: NavUser;
  organisme?: { name: string; logo?: string };
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const groups = getVisibleGroups(
    user.role,
    user.permissions ?? [],
    user.fonctionnalites ?? [],
  );

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  // Track which group the current page belongs to
  const activeGroup = groups.find((g) =>
    g.items.some((it) => isActive(it.href))
  );

  // Collapsible groups state (persist to localStorage)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ofm.sidebar.groups");
      if (saved) setExpanded(JSON.parse(saved));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (activeGroup) {
      setExpanded((prev) =>
        prev[activeGroup.key] ? prev : { ...prev, [activeGroup.key]: true }
      );
    }
  }, [activeGroup]);

  const toggleGroup = (key: string) => {
    setExpanded((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem("ofm.sidebar.groups", JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const isGroupExpanded = (key: string) =>
    expanded[key] ?? key === activeGroup?.key;

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r bg-sidebar text-sidebar-foreground",
        "w-64" // Fixed width (can be made collapsible later)
      )}
    >
      {/* HEADER */}
      <div className="border-b px-4 py-4">
        <div className="flex items-center gap-2">
          {organisme?.logo && (
            <img
              src={organisme.logo}
              alt={organisme.name}
              className="h-8 w-8 rounded"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">
              {organisme?.name ?? "OF Manager"}
            </p>
          </div>
        </div>
      </div>

      {/* GLOBAL SEARCH */}
      <div className="px-4 py-2">
        <button
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm",
            "bg-sidebar-accent/50 text-sidebar-foreground hover:bg-sidebar-accent",
            "transition-colors"
          )}
          onClick={() => {
            // TODO: Open command palette (Cmd+K)
          }}
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left text-muted-foreground">
            Rechercher...
          </span>
          <span className="text-xs text-muted-foreground/70">⌘K</span>
        </button>
      </div>

      {/* NAVIGATION GROUPS */}
      <nav
        className="flex-1 overflow-y-auto px-2 py-4 space-y-1"
        aria-label="Navigation principale"
      >
        {groups.map((group) => (
          <div key={group.key} className="space-y-1">
            {/* Group Header (Collapsible) */}
            <button
              onClick={() => toggleGroup(group.key)}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium",
                "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
                "transition-colors"
              )}
              aria-expanded={isGroupExpanded(group.key)}
            >
              <div className="flex items-center gap-2">
                <group.icon className="h-4 w-4" />
                <span>{group.label}</span>
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  isGroupExpanded(group.key) ? "rotate-180" : ""
                )}
              />
            </button>

            {/* Group Items (Collapsible) */}
            {isGroupExpanded(group.key) && (
              <div className="space-y-1 pl-2">
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
                        "transition-colors",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                      )}
                      aria-current={active ? "page" : undefined}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* FOOTER */}
      <div className="border-t px-4 py-4 space-y-2">
        <button
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm",
            "text-sidebar-foreground/70 hover:bg-sidebar-accent/50",
            "transition-colors"
          )}
        >
          <span>Profil</span>
        </button>
        <button
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm",
            "text-sidebar-foreground/70 hover:bg-sidebar-accent/50",
            "transition-colors"
          )}
          onClick={() => {
            // TODO: Toggle dark mode
          }}
        >
          <span>Thème</span>
        </button>
        <button
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm",
            "text-destructive hover:bg-destructive/10",
            "transition-colors"
          )}
        >
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}
