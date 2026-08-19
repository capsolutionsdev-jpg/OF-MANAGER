import Link from "next/link";
import { FileText, Users, ClipboardCheck, ShieldCheck, CarTaxiFront, type LucideIcon } from "lucide-react";

export type SessionTabKey =
  | "details"
  | "participants"
  | "parcours-t3p"
  | "dossiers"
  | "documents"
  | "validation";

/**
 * Navigation par onglets de la page Session
 * (Vue d'ensemble / Participants / [Parcours T3P] / Dossiers / Documents / Validation).
 * L'onglet « Parcours T3P » n'apparaît que pour les sessions Taxi/VTC quand la
 * fonctionnalité est activée (cf. getSessionDetail → t3pTab).
 * Composant serveur : simples liens avec surlignage de l'onglet actif.
 */
export function SessionTabs({
  sessionId,
  active,
  validationBadge,
  showT3P = false,
}: {
  sessionId: string;
  active: SessionTabKey;
  validationBadge?: { percentage: number; ok: boolean };
  showT3P?: boolean;
}) {
  const tabs: { key: SessionTabKey; label: string; href: string; icon: LucideIcon }[] = [
    { key: "details", label: "Vue d'ensemble", href: `/sessions/${sessionId}`, icon: FileText },
    { key: "participants", label: "Participants", href: `/sessions/${sessionId}/participants`, icon: Users },
    ...(showT3P
      ? [{ key: "parcours-t3p" as const, label: "Parcours T3P", href: `/sessions/${sessionId}/parcours-t3p`, icon: CarTaxiFront }]
      : []),
    { key: "dossiers", label: "Dossiers", href: `/sessions/${sessionId}/dossiers`, icon: ClipboardCheck },
    { key: "documents", label: "Documents", href: `/sessions/${sessionId}/documents`, icon: FileText },
    { key: "validation", label: "Validation", href: `/sessions/${sessionId}/validation`, icon: ShieldCheck },
  ];

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
            {t.key === "validation" && validationBadge && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                  validationBadge.ok
                    ? "bg-success/10 text-success"
                    : "bg-warning/10 text-warning"
                }`}
              >
                {validationBadge.percentage}%
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
