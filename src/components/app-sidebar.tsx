"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, HelpCircle, ArrowRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import type { Role } from "@prisma/client";
import { buildNav, type NavItem } from "@/lib/navigation";
import { useRail } from "@/components/rail-context";
import { cn } from "@/lib/utils";

type NavUser = {
  role: Role;
  permissions?: string[];
  fonctionnalites?: string[];
};

// Couleurs pilotées par les tokens de thème du tenant (--sidebar-*), pour que le
// rail respecte le design/white-label du client (fond, texte, accent) au lieu
// d'une palette navy figée. Item actif = accent du thème ; icône/texte = primaire.
const ITEM_ACTIVE = "bg-sidebar-accent text-sidebar-accent-foreground";
const ITEM_IDLE =
  "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground";

/** Contenu de navigation (rail desktop + tiroir mobile). Groupé par catégories ;
 * liste plate en icônes quand le rail est replié. */
export function SidebarNav({
  user,
  onNavigate,
  collapsed = false,
}: {
  user: NavUser;
  onNavigate?: () => void;
  collapsed?: boolean;
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
  const toggleGroup = (name: string) =>
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
        title={it.label}
        className={cn(
          "group/nav flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors",
          active ? ITEM_ACTIVE : ITEM_IDLE,
        )}
      >
        <it.icon
          className={cn(
            "h-[17px] w-[17px] shrink-0 transition-colors",
            active
              ? "text-sidebar-accent-foreground"
              : "text-sidebar-foreground/60 group-hover/nav:text-sidebar-foreground",
          )}
        />
        <span className="rail-label min-w-0 truncate">{it.label}</span>
      </Link>
    );
  };

  // Rail replié → liste plate (toutes les entrées en icônes), sans en-têtes de
  // groupe (sinon les groupes fermés cacheraient leurs items).
  if (collapsed) {
    const flat = [...standalone, ...groups.flatMap((g) => g.items)];
    return (
      <nav
        id="main-nav"
        aria-label="Navigation principale"
        className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4"
      >
        {flat.map(renderItem)}
        {footer.length > 0 && (
          <div className="mt-3 space-y-0.5 border-t border-sidebar-border pt-3">
            {footer.map(renderItem)}
          </div>
        )}
      </nav>
    );
  }

  return (
    <nav
      id="main-nav"
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
              onClick={() => toggleGroup(g.name)}
              aria-expanded={expanded}
              className="flex w-full items-center gap-1.5 rounded-md px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-sidebar-foreground/50 transition-colors hover:text-sidebar-foreground"
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

/** En-tête de marque du rail (logo tenant ou nom). Couleurs pilotées par le thème
 * du tenant. Une pastille-initiale apparaît quand le rail est replié (icône seule). */
export function SidebarBrand({
  brand,
}: {
  brand?: { nom: string; logoUrl: string | null };
}) {
  return (
    <Link
      href="/dashboard"
      className="rail-brand flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border px-4"
    >
      {/* Pastille-initiale, visible seulement en mode replié (CSS). */}
      <span
        className="rail-brand-mark h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary font-heading text-[15px] font-semibold text-sidebar-primary-foreground"
        aria-hidden
      >
        {(brand?.nom ?? "CAP").charAt(0).toUpperCase()}
      </span>
      {brand?.logoUrl ? (
        // Logo personnalisé (data URL) — next/image ne gère pas les data: URLs.
        // Pastille claire pour garantir la lisibilité quel que soit le fond du logo.
        <span className="rail-label flex items-center rounded-md bg-white px-1.5 py-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={brand.logoUrl} alt={brand.nom} className="h-6 w-auto" />
        </span>
      ) : (
        <span className="rail-label font-heading text-[15px] font-semibold tracking-tight text-sidebar-foreground">
          {brand?.nom ?? "OFManager"}
        </span>
      )}
      <span className="rail-label ml-auto rounded bg-sidebar-accent px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-sidebar-foreground/70">
        Manager
      </span>
    </Link>
  );
}

/** Rail latéral persistant (desktop ≥ lg). Sur mobile : tiroir via la barre du haut.
 *
 * Fond/texte/accent pilotés par les tokens de thème du tenant (--sidebar-*).
 * Rétractable : le contenu vit dans `.rail-inner` (qui déborde en overlay au survol
 * quand le rail est replié), tandis que l'`aside` réserve la largeur dans la grille. */
export function AppSidebar({
  user,
  brand,
}: {
  user: NavUser;
  brand?: { nom: string; logoUrl: string | null };
}) {
  const { collapsed, toggle } = useRail();
  return (
    <aside
      data-app-chrome
      className="app-rail sticky top-0 hidden h-screen w-60 shrink-0 lg:block"
    >
      <div className="rail-inner flex h-full w-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <SidebarBrand brand={brand} />
        <SidebarNav user={user} collapsed={collapsed} />

        {/* Carte "Besoin d'aide ?" en bas (icône seule quand replié). */}
        <div className="mt-auto border-t border-sidebar-border p-4">
          <Link
            href="/support"
            title="Besoin d'aide ?"
            className="rail-help flex items-start gap-3 rounded-xl bg-sidebar-accent px-3 py-3 transition-colors hover:bg-sidebar-accent/80"
          >
            <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-sidebar-primary" />
            <div className="rail-label min-w-0 flex-1">
              <p className="text-sm font-medium text-sidebar-foreground">Besoin d&apos;aide ?</p>
              <p className="mt-0.5 text-[11px] text-sidebar-foreground/60">Consultez notre centre</p>
            </div>
            <ArrowRight className="rail-label mt-1 h-4 w-4 shrink-0 text-sidebar-primary" />
          </Link>
        </div>

        {/* Bouton de repli VISIBLE sur le bord du rail (chevron). Le bouton de la
            barre du haut fait la même chose ; celui-ci est l'affordance conventionnelle. */}
        <button
          type="button"
          onClick={toggle}
          title={collapsed ? "Déplier le menu" : "Réduire le menu"}
          aria-label={collapsed ? "Déplier le menu" : "Réduire le menu"}
          className="rail-collapse-btn flex w-full items-center gap-2.5 border-t border-sidebar-border px-4 py-2.5 text-[12px] font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          {collapsed ? (
            <ChevronsRight className="h-[18px] w-[18px] shrink-0" />
          ) : (
            <ChevronsLeft className="h-[18px] w-[18px] shrink-0" />
          )}
          <span className="rail-label">Réduire le menu</span>
        </button>
      </div>
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
