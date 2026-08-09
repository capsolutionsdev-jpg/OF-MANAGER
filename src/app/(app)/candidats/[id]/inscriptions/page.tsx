import { notFound } from "next/navigation";
import Link from "next/link";
import { CalendarDays, Send } from "lucide-react";
import { getCandidatDetail } from "@/lib/candidats/detail";
import { CandidatDetailHeader } from "@/components/candidats/candidat-detail-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { INSCRIPTION_STATUT_LABELS } from "@/lib/validators/inscription";
import { resendParcoursAction } from "@/lib/actions/parcours-actions";
import { DossierChecklist } from "@/components/inscriptions/dossier-checklist";
import { PieceValidation } from "@/components/inscriptions/piece-validation";

// Les actions serveur de cet onglet génèrent des PDF via puppeteer/Chromium
// (relance du parcours). Le démarrage du navigateur dépasse la durée par
// défaut → on aligne sur les autres routes PDF.
export const maxDuration = 60;

export default async function CandidatInscriptionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getCandidatDetail(id);
  if (!detail) notFound();

  const { candidat } = detail;

  return (
    <div className="space-y-6">
      <CandidatDetailHeader candidat={candidat} active="inscriptions" t3pTab={detail.t3pTab} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4" /> Inscriptions (
            {candidat.inscriptions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {candidat.inscriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ce candidat n&apos;est inscrit à aucune session.
            </p>
          ) : (
            <ul className="space-y-4">
              {candidat.inscriptions.map((i) => (
                <li key={i.id} className="rounded-lg border bg-muted/20 p-3">
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/sessions/${i.sessionId}`}
                      className="font-medium hover:underline"
                    >
                      {i.session.formation.titre}
                    </Link>
                    <span className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>{i.session.dateDebut.toLocaleDateString("fr-FR")}</span>
                      <Badge variant="secondary">
                        {INSCRIPTION_STATUT_LABELS[i.statut]}
                      </Badge>
                    </span>
                  </div>

                  {/* Avancement du parcours automatisé */}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t pt-3">
                    <span className="mr-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Parcours :
                    </span>
                    {(
                      [
                        ["Formulaire", i.formCompletedAt],
                        ["Signé", i.signedAt],
                        ["Convocation", i.convocationSentAt],
                        ["Attest. entrée", i.attestationEntreeSentAt],
                        ["Satisfaction", i.satisfactionCompletedAt ?? i.satisfactionSentAt],
                        ["Docs fin", i.docsFinSentAt],
                      ] as [string, Date | null][]
                    ).map(([label, date]) => (
                      <Badge
                        key={label}
                        className={
                          date
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {date ? "✓ " : "○ "}
                        {label}
                      </Badge>
                    ))}
                    <form action={resendParcoursAction} className="ml-auto">
                      <input type="hidden" name="inscriptionId" value={i.id} />
                      <Button type="submit" size="sm" variant="outline">
                        <Send className="mr-1.5 h-3.5 w-3.5" /> Relancer le lien
                      </Button>
                    </form>
                  </div>

                  {/* Dossier administratif */}
                  <div className="mt-3 border-t pt-3">
                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Dossier administratif
                    </p>
                    <DossierChecklist
                      inscriptionId={i.id}
                      piecesAttendues={i.session.formation.piecesAttendues}
                      piecesRecues={i.piecesRecues}
                      validePar={(i.piecesValideePar as Record<string, { nom: string; date: string }> | null) ?? undefined}
                    />
                    <PieceValidation pieces={candidat.pieces} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
