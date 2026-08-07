import { notFound } from "next/navigation";
import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { getSessionDetail } from "@/lib/sessions/detail";
import { SessionDetailHeader } from "@/components/sessions/session-detail-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SendSatisfactionButton } from "@/components/sessions/send-satisfaction-button";
import { DossierChecklist } from "@/components/inscriptions/dossier-checklist";

export default async function SessionDossiersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getSessionDetail(id);
  if (!detail) notFound();

  const { s, piecesParCandidat, vstate } = detail;
  const piecesAttendues = s.formation.piecesAttendues;

  return (
    <div className="space-y-6">
      <SessionDetailHeader
        session={{
          id: s.id,
          titre: s.formation.titre,
          statut: s.statut,
          nbFormateurs: s.formateurs.length,
        }}
        active="dossiers"
        validationBadge={
          vstate ? { percentage: vstate.percentage, ok: vstate.isValidated } : undefined
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="h-4 w-4" /> Dossiers des candidats ({s.inscriptions.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {piecesAttendues.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Cochez les pièces reçues au fur et à mesure. Relancez les candidats
              dont le dossier est incomplet.
            </p>
          )}
          {s.inscriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun candidat inscrit.</p>
          ) : (
            s.inscriptions.map((i) => {
              const pieces = piecesParCandidat.get(i.candidatId) ?? [];
              const manquantes = piecesAttendues.filter(
                (p) => !i.piecesRecues.includes(p),
              );
              return (
                <div key={i.id} className="space-y-3 rounded-lg border p-4">
                  {/* En-tête : identité + badges + relance */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/candidats/${i.candidatId}`}
                        className="font-medium hover:underline"
                      >
                        {i.candidat.prenom} {i.candidat.nom}
                      </Link>
                      {i.signedAt ? (
                        <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                          dossier signé{i.signedParNom ? ` · par ${i.signedParNom}` : ""}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">non signé</Badge>
                      )}
                      {i.satisfactionCompletedAt ? (
                        <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                          satisfaction reçue
                        </Badge>
                      ) : i.satisfactionSentAt ? (
                        <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300">
                          satisfaction envoyée
                        </Badge>
                      ) : null}
                      {piecesAttendues.length > 0 && manquantes.length === 0 && (
                        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                          Dossier complet
                        </Badge>
                      )}
                    </div>
                    {piecesAttendues.length > 0 &&
                      manquantes.length > 0 &&
                      i.candidat.email && (
                        <a
                          href={`mailto:${i.candidat.email}?subject=${encodeURIComponent(
                            `Pièces manquantes — ${s.formation.titre}`,
                          )}&body=${encodeURIComponent(
                            `Bonjour ${i.candidat.prenom},\n\nPour finaliser votre dossier d'inscription à la formation « ${s.formation.titre} », merci de nous transmettre les pièces suivantes :\n\n- ${manquantes.join("\n- ")}\n\nMerci par avance.\nCordialement,`,
                          )}`}
                          className="rounded-md border px-2 py-1 text-xs font-medium text-primary hover:bg-muted"
                        >
                          Relancer ({manquantes.length} manquante{manquantes.length > 1 ? "s" : ""})
                        </a>
                      )}
                  </div>

                  {/* Liens documents + envoi satisfaction */}
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <a
                      href={`/documents/${i.id}/pdf`}
                      target="_blank"
                      className="text-primary hover:underline"
                    >
                      Dossier (PDF)
                    </a>
                    {i.satisfactionCompletedAt && (
                      <a
                        href={`/documents/${i.id}/satisfaction`}
                        target="_blank"
                        className="text-primary hover:underline"
                      >
                        Satisfaction signée (PDF)
                      </a>
                    )}
                    <SendSatisfactionButton
                      inscriptionId={i.id}
                      sent={!!i.satisfactionSentAt}
                    />
                  </div>

                  {/* Pièces justificatives déposées par le candidat (parcours,
                      e-mail ou scan à l'accueil) — consultables ici. */}
                  {pieces.length > 0 && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                      <span className="text-muted-foreground">
                        Pièces déposées ({pieces.length}) :
                      </span>
                      {pieces.map((p) => (
                        <a
                          key={p.id}
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={
                            p.statut === "REFUSEE"
                              ? "text-destructive line-through hover:underline"
                              : "text-primary hover:underline"
                          }
                          title={p.statut === "VALIDEE" ? "Validée" : p.statut === "REFUSEE" ? "Refusée" : "En attente de validation"}
                        >
                          {p.label}
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Checklist des pièces attendues (Qualiopi) */}
                  {piecesAttendues.length > 0 && (
                    <DossierChecklist
                      inscriptionId={i.id}
                      piecesAttendues={piecesAttendues}
                      piecesRecues={i.piecesRecues}
                      validePar={(i.piecesValideePar as Record<string, { nom: string; date: string }> | null) ?? undefined}
                    />
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
