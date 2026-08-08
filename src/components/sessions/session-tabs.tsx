import Link from "next/link";
import { FileText, Users, ClipboardCheck, ShieldCheck } from "lucide-react";

export type SessionTabKey =
  | "details"
  | "participants"
  | "dossiers"
  | "documents"
  | "validation";

/**
 * Navigation par onglets de la page Session
 * (Vue d'ensemble / Participants / Dossiers / Documents / Validation).
 * Composant serveur : simples liens avec surlignage de l'onglet actif.
 */
export function SessionTabs({
  sessionId,
  active,
  validationBadge,
}: {
  sessionId: string;
  active: SessionTabKey;
  validationBadge?: { percentage: number; ok: boolean };
}) {
  const tabs = [
    { key: "details", label: "Vue d'ensemble", href: `/sessions/${sessionId}`, icon: FileText },
    { key: "participants", label: "Participants", href: `/sessions/${sessionId}/participants`, icon: Users },
    { key: "dossiers", label: "Dossiers", href: `/sessions/${sessionId}/dossiers`, icon: ClipboardCheck },
    { key: "documents", label: "Documents", href: `/sessions/${sessionId}/documents`, icon: FileText },
    {
      key: "validation",
      label: "Validation",
      href: `/sessions/${sessionId}/validation`,
      icon: ShieldCheck,
    },
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
            {t.key === "validation" && validationBadge && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                  validationBadge.ok
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
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
