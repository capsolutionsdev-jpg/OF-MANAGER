"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Target,
  GraduationCap,
  Share2,
  Wallet,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@prisma/client";
import { buildNav } from "@/lib/navigation";
import { cn } from "@/lib/utils";

// Icône par groupe de la navigation réelle (lib/navigation.ts).
const GROUP_ICON: Record<string, LucideIcon> = {
  Commercial: Target,
  Formation: GraduationCap,
  Communication: Share2,
  Finance: Wallet,
  Qualité: ShieldCheck,
};

/**
 * Barre de navigation basse (mobile) pour les rôles « pilotage » (ADMIN /
 * RESPONSABLE_FORMATION) : Accueil + jusqu'à 4 métiers, en libellés COURTS.
 * Filtrée par rôle/permissions/fonctionnalités, avec zone sûre (barre gestuelle).
 * Masquée dès `md`. Les rôles formateur/apprenant utilisent MobileTabBar.
 */
export function MobileBottomNav({
  role,
  permissions,
  fonctionnalites,
}: {
  role: Role;
  permissions: string[];
  fonctionnalites: string[];
}) {
  const pathname = usePathname();
  const { groups } = buildNav(role, permissions, fonctionnalites);
  if (groups.length === 0) return null;

  type Tab = { key: string; label: string; href: string; icon: LucideIcon; active: boolean };
  const tabs: Tab[] = [
    {
      key: "home",
      label: "Accueil",
      href: "/dashboard",
      icon: Home,
      active: pathname === "/dashboard",
    },
    ...groups.slice(0, 4).map((g): Tab => ({
      key: g.name,
      label: g.name,
      href: g.items[0]?.href ?? "/dashboard",
      icon: GROUP_ICON[g.name] ?? Home,
      active: g.items.some((it) => pathname === it.href || pathname.startsWith(`${it.href}/`)),
    })),
  ];

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/90 backdrop-blur-md md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex items-stretch justify-around">
        {tabs.map((t) => (
          <li key={t.key} className="flex-1">
            <Link
              href={t.href}
              aria-current={t.active ? "page" : undefined}
              className={cn(
                "relative flex min-h-[3.25rem] flex-col items-center justify-center gap-1 px-1 pb-1.5 pt-2 text-[11px] font-medium transition-colors",
                t.active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.active && (
                <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-primary" />
              )}
              <t.icon className={cn("h-[22px] w-[22px]", t.active && "stroke-[2.4]")} />
              <span className="max-w-full truncate">{t.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
