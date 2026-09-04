import Link from "next/link";
import { User, CalendarDays, CreditCard, Target, History, CarTaxiFront, type LucideIcon } from "lucide-react";

export type CandidatTabKey =
  | "profil"
  | "inscriptions"
  | "parcours-t3p"
  | "paiements"
  | "crm"
  | "historique";

/**
 * Navigation par onglets de la fiche candidat
 * (Profil / Inscriptions / [Parcours T3P] / Paiements / CRM / Historique).
 * L'onglet « Parcours T3P » n'apparaît que pour les candidats Taxi/VTC
 * (parcours existant ou formation T3P détectée) — cf. getCandidatDetail.
 * Composant serveur : simples liens avec surlignage de l'onglet actif.
 */
export function CandidatTabs({
  candidatId,
  active,
  showT3P = false,
}: {
  candidatId: string;
  active: CandidatTabKey;
  showT3P?: boolean;
}) {
  const tabs: { key: CandidatTabKey; label: string; href: string; icon: LucideIcon }[] = [
    { key: "profil", label: "Profil", href: `/candidats/${candidatId}`, icon: User },
    { key: "inscriptions", label: "Inscriptions", href: `/candidats/${candidatId}/inscriptions`, icon: CalendarDays },
    ...(showT3P
      ? [{ key: "parcours-t3p" as const, label: "Parcours T3P", href: `/candidats/${candidatId}/parcours-t3p`, icon: CarTaxiFront }]
      : []),
    { key: "paiements", label: "Paiements", href: `/candidats/${candidatId}/paiements`, icon: CreditCard },
    { key: "crm", label: "CRM", href: `/candidats/${candidatId}/crm`, icon: Target },
    { key: "historique", label: "Historique", href: `/candidats/${candidatId}/historique`, icon: History },
  ];

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
          </Link>
        );
      })}
    </div>
  );
}
