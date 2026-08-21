import { CalendarDays, MapPin, Users } from "lucide-react";
import { requireEntreprise } from "@/lib/entreprise-portal";
import { getEntreprisePlanning, getEntrepriseCandidats } from "@/lib/entreprise-data";
import { RubriqueHeader, EmptyState, Badge, fmtDate } from "@/components/entreprise/portal-ui";
import { DemandeInscriptionDialog } from "@/components/entreprise/demande-inscription-dialog";

export const dynamic = "force-dynamic";

const MODALITE_LABEL: Record<string, string> = {
  PRESENTIEL: "Présentiel",
  DISTANCIEL: "Distanciel",
  MIXTE: "Mixte",
};

export default async function FormationPage() {
  const entreprise = await requireEntreprise();
  const [sessions, candidats] = await Promise.all([
    getEntreprisePlanning(),
    getEntrepriseCandidats(entreprise.id),
  ]);
  return (
    <div>
      <RubriqueHeader
        title="Formations à venir"
        subtitle="Le planning des prochaines sessions de votre organisme de formation."
      />
      {sessions.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-8 w-8" />}
          title="Aucune session à venir"
          hint="De nouvelles sessions apparaîtront ici dès leur programmation."
        />
      ) : (
        <div className="grid gap-3">
          {sessions.map((s) => (
            <div key={s.id} className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium">{s.titre}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {fmtDate(s.dateDebut)} → {fmtDate(s.dateFin)}
                    </span>
                    {s.lieu && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {s.lieu}
                      </span>
                    )}
                    <span>{MODALITE_LABEL[s.modalite] ?? s.modalite}</span>
                  </div>
                </div>
                <Badge tone={s.placesRestantes > 0 ? "success" : "danger"}>
                  <Users className="mr-1 h-3 w-3" />
                  {s.placesRestantes > 0
                    ? `${s.placesRestantes} place${s.placesRestantes > 1 ? "s" : ""}`
                    : "Complet"}
                </Badge>
              </div>
              <div className="mt-3 flex justify-end border-t pt-3">
                <DemandeInscriptionDialog
                  sessionId={s.id}
                  sessionLabel={`${s.titre} — ${fmtDate(s.dateDebut)}`}
                  candidats={candidats}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
