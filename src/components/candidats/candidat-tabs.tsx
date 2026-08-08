import Link from "next/link";
import { User, CalendarDays, CreditCard, Target, History } from "lucide-react";

export type CandidatTabKey =
  | "profil"
  | "inscriptions"
  | "paiements"
  | "crm"
  | "historique";

/**
 * Navigation par onglets de la fiche candidat
 * (Profil / Inscriptions / Paiements / CRM / Historique).
 * Composant serveur : simples liens avec surlignage de l'onglet actif.
 */
export function CandidatTabs({
  candidatId,
  active,
}: {
  candidatId: string;
  active: CandidatTabKey;
}) {
  const tabs = [
    { key: "profil", label: "Profil", href: `/candidats/${candidatId}`, icon: User },
    { key: "inscriptions", label: "Inscriptions", href: `/candidats/${candidatId}/inscriptions`, icon: CalendarDays },
    { key: "paiements", label: "Paiements", href: `/candidats/${candidatId}/paiements`, icon: CreditCard },
    { key: "crm", label: "CRM", href: `/candidats/${candidatId}/crm`, icon: Target },
    { key: "historique", label: "Historique", href: `/candidats/${candidatId}/historique`, icon: History },
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
          </Link>
        );
      })}
    </div>
  );
}
