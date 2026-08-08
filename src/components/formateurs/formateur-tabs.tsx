import Link from "next/link";
import { User, CalendarDays, Receipt } from "lucide-react";

export type FormateurTabKey = "profil" | "planning" | "facturation";

/**
 * Navigation par onglets de la fiche formateur (Profil / Planning / Facturation).
 * Composant serveur : simples liens avec surlignage de l'onglet actif et
 * compteurs (nb de sessions à animer, nb de factures).
 */
export function FormateurTabs({
  formateurId,
  active,
  planningCount,
  facturesCount,
}: {
  formateurId: string;
  active: FormateurTabKey;
  planningCount: number;
  facturesCount: number;
}) {
  const tabs = [
    { key: "profil", label: "Profil", href: `/formateurs/${formateurId}`, icon: User, count: null },
    { key: "planning", label: "Planning", href: `/formateurs/${formateurId}/sessions`, icon: CalendarDays, count: planningCount },
    { key: "facturation", label: "Facturation", href: `/formateurs/${formateurId}/factures`, icon: Receipt, count: facturesCount },
  ] as const;

  return (
    <div className="flex items-center gap-1 border-b">
      {tabs.map((t) => {
        const isActive = t.key === active;
        const Icon = t.icon;
        return (
          <Link
            key={t.key}
            href={t.href}
            className={`-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {t.label}
            {t.count !== null && t.count > 0 && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                {t.count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
