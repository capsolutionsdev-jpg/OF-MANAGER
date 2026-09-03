import Link from "next/link";
import { FileText, Award, CalendarDays } from "lucide-react";

export type FormationTabKey = "fiche" | "diplomes" | "sessions";

/**
 * Navigation par onglets de la fiche formation (Fiche / Diplômes / Sessions).
 * Composant serveur : simples liens avec surlignage de l'onglet actif et
 * compteurs (nb de diplômes délivrés, nb de sessions programmées).
 */
export function FormationTabs({
  formationId,
  active,
  diplomesCount,
  sessionsCount,
}: {
  formationId: string;
  active: FormationTabKey;
  diplomesCount: number;
  sessionsCount: number;
}) {
  const tabs = [
    { key: "fiche", label: "Fiche", href: `/formations/${formationId}`, icon: FileText, count: null },
    { key: "diplomes", label: "Diplômes", href: `/formations/${formationId}/diplomes`, icon: Award, count: diplomesCount },
    { key: "sessions", label: "Sessions", href: `/formations/${formationId}/sessions`, icon: CalendarDays, count: sessionsCount },
  ] as const;

  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b">
      {tabs.map((t) => {
        const isActive = t.key === active;
        const Icon = t.icon;
        return (
          <Link
            key={t.key}
            href={t.href}
            className={`-mb-px inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
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
