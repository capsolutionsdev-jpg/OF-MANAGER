import { notFound } from "next/navigation";
import Link from "next/link";
import { FileText, UserCog } from "lucide-react";
import { getSessionDetail } from "@/lib/sessions/detail";
import { SessionDetailHeader } from "@/components/sessions/session-detail-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SendCompteRenduButton } from "@/components/sessions/send-compte-rendu-button";
import { SendContratButton } from "@/components/sessions/send-contrat-button";

// Actions serveur générant des PDF (Chromium) → budget de durée serverless.
export const runtime = "nodejs";
export const maxDuration = 60;

export default async function SessionDocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getSessionDetail(id);
  if (!detail) notFound();

  const { s, vstate } = detail;

  return (
    <div className="space-y-6">
      <SessionDetailHeader
        session={{
          id: s.id,
          titre: s.formation.titre,
          statut: s.statut,
          nbFormateurs: s.formateurs.length,
        }}
        active="documents"
        showT3P={detail.t3pTab}
        validationBadge={
          vstate ? { percentage: vstate.percentage, ok: vstate.isValidated } : undefined
        }
      />

      {/* Formateur(s) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCog className="h-4 w-4" /> Formateur(s) ({s.formateurs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {s.formateurs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun formateur affecté.{" "}
              <Link
                href={`/sessions/${s.id}/modifier`}
                className="text-primary hover:underline"
              >
                Affecter un formateur
              </Link>{" "}
              pour pouvoir générer son contrat.
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {s.formateurs.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm"
                >
                  <Link
                    href={`/formateurs/${f.id}`}
                    className="font-medium hover:underline"
                  >
                    {f.prenom} {f.nom}
                  </Link>
                  {f.specialites && (
                    <span className="text-xs text-muted-foreground">
                      · {f.specialites}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Compte-rendu pédagogique formateur */}
          {s.formateurs.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t pt-4">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Compte-rendu pédagogique :
              </span>
              {s.crFormateurCompletedAt ? (
                <>
                  <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    ✓ Complété
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    render={
                      <a
                        href={`/compte-rendu/${s.crFormateurToken}/document`}
                        download
                      />
                    }
                  >
                    <FileText className="mr-1.5 h-3.5 w-3.5" /> Télécharger
                  </Button>
                </>
              ) : s.crFormateurSentAt ? (
                <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300">
                  Lien envoyé — en attente
                </Badge>
              ) : (
                <span className="text-xs text-muted-foreground">Non envoyé</span>
              )}
              <div className="ml-auto">
                <SendCompteRenduButton
                  sessionId={s.id}
                  sent={!!s.crFormateurSentAt}
                />
              </div>
            </div>
          )}

          {/* Contrat de sous-traitance formateur */}
          {s.formateurs.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t pt-4">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Contrat de sous-traitance :
              </span>
              {s.contratFormateurSignedAt ? (
                <>
                  <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    ✓ Signé
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    render={
                      <a
                        href={`/contrat-formateur/${s.contratFormateurToken}/document`}
                        target="_blank"
                      />
                    }
                  >
                    <FileText className="mr-1.5 h-3.5 w-3.5" /> Contrat signé (PDF)
                  </Button>
                </>
              ) : s.contratFormateurSentAt ? (
                <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300">
                  Envoyé — en attente de signature
                </Badge>
              ) : (
                <span className="text-xs text-muted-foreground">Non envoyé</span>
              )}
              <div className="ml-auto">
                <SendContratButton
                  sessionId={s.id}
                  sent={!!s.contratFormateurSentAt}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents de la session */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" /> Documents de la session
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              render={
                <a href={`/sessions/${s.id}/emargement/feuille`} target="_blank" />
              }
            >
              <FileText className="mr-1.5 h-3.5 w-3.5" /> Feuille d&apos;émargement
            </Button>
            {s.formateurs.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                render={
                  <a href={`/documents/contrat-formateur/${s.id}`} target="_blank" />
                }
              >
                <FileText className="mr-1.5 h-3.5 w-3.5" /> Contrat formateur
                {s.contratFormateurSignedAt ? " (signé)" : ""}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
