"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import type { Role } from "@prisma/client";
import { buildNav, type NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type NavUser = {
  role: Role;
  permissions?: string[];
  fonctionnalites?: string[];
};

/** Contenu de navigation (rail desktop + tiroir mobile). Groupé par catégories. */
export function SidebarNav({
  user,
  onNavigate,
}: {
  user: NavUser;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { standalone, groups, footer } = buildNav(
    user.role,
    user.permissions ?? [],
    user.fonctionnalites ?? [],
  );
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const activeGroup =
    groups.find((g) => g.items.some((it) => isActive(it.href)))?.name ?? null;

  // Repli par groupe, persistant (localStorage). Par défaut seul le groupe de
  // la page courante est ouvert → le rail reste court.
  const [open, setOpen] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      const raw = localStorage.getItem("ofm.nav.groups");
      if (raw) setOpen(JSON.parse(raw));
    } catch {
      /* stockage indisponible : on garde les valeurs par défaut */
    }
  }, []);
  useEffect(() => {
    if (activeGroup) {
      setOpen((prev) =>
        prev[activeGroup] ? prev : { ...prev, [activeGroup]: true },
      );
    }
  }, [activeGroup]);
  const isOpen = (name: string) => open[name] ?? name === activeGroup;
  const toggle = (name: string) =>
    setOpen((prev) => {
      const cur = prev[name] ?? name === activeGroup;
      const next = { ...prev, [name]: !cur };
      try {
        localStorage.setItem("ofm.nav.groups", JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });

  const renderItem = (it: NavItem) => {
    const active = isActive(it.href);
    return (
      <Link
        key={it.href}
        href={it.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group/nav flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
      >
        <it.icon
          className={cn(
            "h-[17px] w-[17px] shrink-0 transition-colors",
            active
              ? "text-sidebar-accent-foreground"
              : "text-muted-foreground/80 group-hover/nav:text-foreground",
          )}
        />
        <span className="min-w-0 truncate">{it.label}</span>
      </Link>
    );
  };

  return (
    <nav
      aria-label="Navigation principale"
      className="flex-1 space-y-5 overflow-y-auto px-3 py-4"
    >
      {standalone.length > 0 && (
        <div className="space-y-0.5">{standalone.map(renderItem)}</div>
      )}
      {groups.map((g) => {
        const expanded = isOpen(g.name);
        return (
          <div key={g.name} className="space-y-0.5">
            <button
              type="button"
              onClick={() => toggle(g.name)}
              aria-expanded={expanded}
              className="flex w-full items-center gap-1.5 rounded-md px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/70 transition-colors hover:text-foreground"
            >
              <ChevronDown
                className={cn(
                  "h-3 w-3 shrink-0 transition-transform duration-200",
                  expanded ? "" : "-rotate-90",
                )}
              />
              <span>{g.name}</span>
            </button>
            {expanded && g.items.map(renderItem)}
          </div>
        );
      })}
      {footer.length > 0 && (
        <div className="space-y-0.5 border-t border-sidebar-border pt-3">
          {footer.map(renderItem)}
        </div>
      )}
    </nav>
  );
}

/** En-tête de marque du rail (logo tenant ou nom). */
export function SidebarBrand({
  brand,
}: {
  brand?: { nom: string; logoUrl: string | null };
}) {
  return (
    <Link
      href="/dashboard"
      className="flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border px-4"
    >
      {brand?.logoUrl ? (
        // Logo personnalisé (data URL) — next/image ne gère pas les data: URLs.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={brand.logoUrl} alt={brand.nom} className="h-7 w-auto" />
      ) : (
        <span className="font-heading text-[15px] font-semibold tracking-tight text-foreground">
          {brand?.nom ?? "CAP Compétences"}
        </span>
      )}
      <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
        Manager
      </span>
    </Link>
  );
}

/** Rail latéral persistant (desktop ≥ lg). Sur mobile : tiroir via la barre du haut. */
export function AppSidebar({
  user,
  brand,
}: {
  user: NavUser;
  brand?: { nom: string; logoUrl: string | null };
}) {
  return (
    <aside data-app-chrome className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
      <SidebarBrand brand={brand} />
      <SidebarNav user={user} />
    </aside>
  );
}

/* ── Compat rétro : anciens noms utilisés par app-topnav / app-header (désormais
   remplacés par le shell sidebar). Délèguent aux nouveaux composants. ── */
export function Brand(_props?: { tone?: "light" | "dark" }) {
  return <SidebarBrand />;
}
export function NavLinks({
  role,
  permissions = [],
  fonctionnalites = [],
  onNavigate,
}: {
  role: Role;
  permissions?: string[];
  fonctionnalites?: string[];
  onNavigate?: () => void;
  tone?: "light" | "dark";
}) {
  return (
    <SidebarNav
      user={{ role, permissions, fonctionnalites }}
      onNavigate={onNavigate}
    />
  );
}
