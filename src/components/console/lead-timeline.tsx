import {
  Circle,
  FlaskConical,
  Mail,
  Rocket,
  StickyNote,
  Tag,
  Upload,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { LEAD_EVENT_TYPES } from "@/lib/growth/events";

/**
 * Timeline verticale des événements d'un lead (Server Component).
 * Chaque type d'événement a son icône ; les événements qui rapportent des
 * points affichent leur contribution au score.
 */

export type LeadEventItem = {
  id: string;
  type: string;
  titre: string;
  createdAt: Date;
};

/** Icône lucide selon le type d'événement (Circle si type inconnu). */
function iconePourType(type: string): LucideIcon {
  if (type === "creation") return UserPlus;
  if (type === "conversion") return Rocket;
  if (type.startsWith("demo_")) return FlaskConical;
  if (type.startsWith("email_")) return Mail;
  if (type === "statut") return Tag;
  if (type === "note") return StickyNote;
  if (type === "import") return Upload;
  return Circle;
}

/** Date + heure au format français (ex. « 09 août 2026 à 14:32 »). */
function fmtDateHeure(d: Date) {
  const date = new Date(d);
  return `${date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })} à ${date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
}

export function LeadTimeline({ events }: { events: LeadEventItem[] }) {
  if (events.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Aucun événement pour le moment.
      </p>
    );
  }

  return (
    <ol className="relative ml-3 space-y-5 border-l border-border/70 pl-6">
      {events.map((e) => {
        const Icone = iconePourType(e.type);
        const bareme = (LEAD_EVENT_TYPES as Record<string, { label: string; score: number }>)[
          e.type
        ];
        return (
          <li key={e.id} className="relative">
            {/* Pastille sur la ligne verticale de connexion */}
            <span className="absolute top-0 -left-[35px] flex h-[18px] w-[18px] items-center justify-center rounded-full border bg-background ring-2 ring-background">
              <Icone className="h-3 w-3 text-muted-foreground" />
            </span>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <p className="text-sm font-medium">{e.titre}</p>
              {bareme && bareme.score > 0 && (
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  +{bareme.score} pts
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{fmtDateHeure(e.createdAt)}</p>
          </li>
        );
      })}
    </ol>
  );
}
