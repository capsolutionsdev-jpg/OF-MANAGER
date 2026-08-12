"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import { visibleNavItems, type NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

// Sections mises en avant dans la barre du bas (ordre = priorité), tous rôles
// confondus : personnel (candidats/sessions…), formateur et apprenant (mes-*).
// On ne garde que celles réellement visibles pour l'utilisateur.
const PRIORITE = [
  "/candidats", "/sessions", "/planning", "/crm",
  "/mes-sessions", "/mes-emargements", "/mes-cours", "/mes-formations", "/mes-documents",
  "/formations", "/taches",
];

/**
 * Barre de navigation basse (mobile uniquement) : accès au pouce aux 4 sections
 * les plus utilisées + le tableau de bord. Masquée dès `md` (le menu burger et
 * la barre supérieure prennent le relais). Respecte la safe-area iOS.
 */
export function MobileTabBar({
  role,
  permissions,
  fonctionnalites,
}: {
  role: Role;
  permissions: string[];
  fonctionnalites: string[];
}) {
  const pathname = usePathname();
  const items = visibleNavItems(role, permissions, fonctionnalites);
  if (items.length === 0) return null;

  // Accueil = 1re entrée du menu du rôle (/dashboard pour le personnel,
  // /mon-espace pour un apprenant…) : jamais de route codée en dur.
  const home = items[0];
  const byHref = new Map(items.map((i) => [i.href, i]));
  const prioritaires = PRIORITE.map((h) => byHref.get(h))
    .filter((x): x is NavItem => !!x && x.href !== home.href);
  // Complète avec le début du menu si peu de sections prioritaires sont visibles.
  const complement = items
    .slice(1)
    .filter((i) => !prioritaires.some((p) => p.href === i.href));
  const tabs = [home, ...prioritaires, ...complement].slice(0, 5);
  if (tabs.length < 2) return null; // rien d'utile à afficher

  const isActive = (href: string) =>
    href === home.href ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav
      aria-label="Navigation rapide"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur-md md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex items-stretch justify-around">
        {tabs.map((it) => {
          const active = isActive(it.href);
          return (
            <li key={it.href} className="flex-1">
              <Link
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  // min-h-14 : cible tactile confortable (>= 44px recommandé)
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <it.icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
                <span className="max-w-full text-center leading-tight line-clamp-2">{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
