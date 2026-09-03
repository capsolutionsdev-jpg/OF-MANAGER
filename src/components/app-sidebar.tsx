"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, HelpCircle, ArrowRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import type { Role } from "@prisma/client";
import { buildRail, type NavItem } from "@/lib/navigation";
import { PlusLauncher } from "@/components/plus-launcher";
import { useRail } from "@/components/rail-context";
import { cn } from "@/lib/utils";

type NavUser = {
  role: Role;
  permissions?: string[];
  fonctionnalites?: string[];
};

// Accent de l'item actif porté à un bleu plus clair (#8cbcff) → contraste AA
// sur le fond actif #1f3a6f (l'ancien #4D9FFF passait sous le seuil).
const ITEM_ACTIVE = "bg-[#1f3a6f] text-[#8cbcff]";
const ITEM_IDLE = "text-[#a8b9d1] hover:bg-[#1f2d47] hover:text-[#eaf0ff]";

/** Bouton « Rechercher… » du rail : ouvre la palette de commandes globale
 * (⌘K) au clic, pour la découvrabilité. Replié → icône seule. */
function RailSearchButton({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("ofm:command-palette"))}
      title="Rechercher (⌘K)"
      aria-label="Rechercher un module"
      className={cn(
        "flex items-center gap-2 rounded-lg border border-[#1f2d47] bg-[#122142] text-[#7a8aa3] transition-colors hover:border-[#2a3a52] hover:text-[#a8b9d1]",
        collapsed ? "h-9 w-9 justify-center" : "w-full px-2.5 py-2",
      )}
    >
      <Search className="h-[15px] w-[15px] shrink-0" />
      {!collapsed && (
        <>
          <span className="rail-label text-[12.5px]">Rechercher…</span>
          <kbd className="rail-label ml-auto rounded border border-[#2a3a52] px-1.5 py-0.5 font-sans text-[10px] leading-none">
            ⌘K
          </kbd>
        </>
      )}
    </button>
  );
}

/** Contenu de navigation (rail desktop + tiroir mobile). Barre épurée : recherche
 * ⌘K + 3 piliers quotidiens ; le reste est rangé dans le launcher « Plus ».
 * Liste plate en icônes quand le rail est replié. */
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
  const { standalone, pillars, secondary } = buildRail(
    user.role,
    user.permissions ?? [],
    user.fonctionnalites ?? [],
  );
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

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
              ? "text-[#8cbcff]"
              : "text-[#a8b9d1] group-hover/nav:text-[#eaf0ff]",
          )}
        />
        <span className="rail-label min-w-0 truncate">{it.label}</span>
      </Link>
    );
  };

  // Rail replié → recherche (icône) + liste plate des piliers en icônes + launcher.
  if (collapsed) {
    const flatIcons = [...standalone, ...pillars.flatMap((p) => p.items)];
    return (
      <nav
        id="main-nav"
        aria-label="Navigation principale"
        className="flex-1 space-y-1 overflow-y-auto px-3 py-4"
      >
        <div className="flex justify-center">
          <RailSearchButton collapsed />
        </div>
        <div className="space-y-0.5 pt-1">{flatIcons.map(renderItem)}</div>
        {secondary.length > 0 && (
          <div className="flex justify-center pt-1">
            <PlusLauncher secondary={secondary} collapsed onNavigate={onNavigate} />
          </div>
        )}
      </nav>
    );
  }

  return (
    <nav
      id="main-nav"
      aria-label="Navigation principale"
      className="flex-1 space-y-4 overflow-y-auto px-3 py-4"
    >
      <RailSearchButton />

      {standalone.length > 0 && (
        <div className="space-y-0.5">{standalone.map(renderItem)}</div>
      )}

      {pillars.map((p) => (
        <div key={p.name} className="space-y-0.5">
          <p className="px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-[#7a8aa3]">
            {p.name}
          </p>
          {p.items.map(renderItem)}
        </div>
      ))}

      <PlusLauncher secondary={secondary} onNavigate={onNavigate} />
    </nav>
  );
}

/** En-tête de marque du rail (logo tenant ou nom). Rail navy, texte bleu clair.
 * Une pastille-initiale apparaît quand le rail est replié (icône seule). */
export function SidebarBrand({
  brand,
}: {
  brand?: { nom: string; logoUrl: string | null };
}) {
  return (
    <Link
      href="/dashboard"
      className="rail-brand flex h-14 shrink-0 items-center gap-2 border-b border-[#1f2d47] px-4"
    >
      {/* Pastille-initiale, visible seulement en mode replié (CSS). */}
      <span
        className="rail-brand-mark h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#1f3a6f] font-heading text-[15px] font-semibold text-[#8cbcff]"
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
        <span className="rail-label font-heading text-[15px] font-semibold tracking-tight text-[#eaf0ff]">
          {brand?.nom ?? "OFManager"}
        </span>
      )}
      <span className="rail-label ml-auto rounded bg-[#1f2d47] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#a8b9d1]">
        Manager
      </span>
    </Link>
  );
}

/** Rail latéral persistant (desktop ≥ lg). Sur mobile : tiroir via la barre du haut.
 *
 * Navy très foncé (#0D1B3E), texte bleu clair. Rétractable : le contenu vit dans
 * `.rail-inner` (qui déborde en overlay au survol quand le rail est replié), tandis
 * que l'`aside` réserve la largeur dans la grille flex (le contenu ne se décale pas).
 */
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
      <div className="rail-inner flex h-full w-full flex-col border-r border-[#1f2d47] bg-[#0D1B3E] text-[#eaf0ff]">
        <SidebarBrand brand={brand} />
        <SidebarNav user={user} collapsed={collapsed} />

        {/* Carte "Besoin d'aide ?" en bas (icône seule quand replié). */}
        <div className="mt-auto border-t border-[#1f2d47] p-4">
          <Link
            href="/support"
            title="Besoin d'aide ?"
            className="rail-help flex items-start gap-3 rounded-xl bg-[#1f2d47] px-3 py-3 transition-colors hover:bg-[#2a3a52]"
          >
            <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#8cbcff]" />
            <div className="rail-label min-w-0 flex-1">
              <p className="text-sm font-medium text-[#eaf0ff]">Besoin d&apos;aide ?</p>
              <p className="mt-0.5 text-[11px] text-[#a8b9d1]">Consultez notre centre</p>
            </div>
            <ArrowRight className="rail-label mt-1 h-4 w-4 shrink-0 text-[#8cbcff]" />
          </Link>
        </div>

        {/* Bouton de repli VISIBLE sur le bord du rail (chevron). Le bouton de la
            barre du haut fait la même chose ; celui-ci est l'affordance conventionnelle. */}
        <button
          type="button"
          onClick={toggle}
          title={collapsed ? "Déplier le menu" : "Réduire le menu"}
          aria-label={collapsed ? "Déplier le menu" : "Réduire le menu"}
          className="rail-collapse-btn flex w-full items-center gap-2.5 border-t border-[#1f2d47] px-4 py-2.5 text-[12px] font-medium text-[#a8b9d1] transition-colors hover:bg-[#1f2d47] hover:text-[#eaf0ff]"
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
