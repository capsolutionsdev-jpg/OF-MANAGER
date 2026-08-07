import { notFound } from "next/navigation";
import Link from "next/link";
import { Users, CreditCard, Award } from "lucide-react";
import { getSessionDetail } from "@/lib/sessions/detail";
import { SessionDetailHeader } from "@/components/sessions/session-detail-header";
import { ExportMenu } from "@/components/export-menu";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { INSCRIPTION_STATUT_LABELS } from "@/lib/validators/inscription";
import { FINANCEMENT_LABELS } from "@/lib/validators/candidat";
import { EnrollForm } from "@/components/inscriptions/enroll-form";
import { InscriptionQuickActions } from "@/components/inscriptions/inscription-quick-actions";
import { InscriptionActionsMenu } from "@/components/inscriptions/inscription-actions-menu";
import { PaiementEditor } from "@/components/inscriptions/paiement-editor";
import { CertificationSelect } from "@/components/inscriptions/certification-select";

const STATUT_BADGE_CLS: Record<string, string> = {
  EN_ATTENTE: "bg-muted text-muted-foreground",
  VALIDEE: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  SUSPENDUE: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  ANNULEE: "bg-destructive/10 text-destructive",
};

export default async function SessionParticipantsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getSessionDetail(id);
  if (!detail) notFound();

  const { s, candidatsDisponibles, diplomeSsiapNiv, attestationForDocs, prereq, vstate } =
    detail;

  return (
    <div className="space-y-6">
      <SessionDetailHeader
        session={{
          id: s.id,
          titre: s.formation.titre,
          statut: s.statut,
          nbFormateurs: s.formateurs.length,
        }}
        active="participants"
        validationBadge={
          vstate ? { percentage: vstate.percentage, ok: vstate.isValidated } : undefined
        }
      />

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" /> Participants ({s.inscriptions.length})
          </CardTitle>
          {s.inscriptions.length > 0 && (
            <ExportMenu href={`/sessions/${s.id}/candidats/export`} label="Exporter la liste" size="sm" />
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {s.inscriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun candidat inscrit pour le moment.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidat</TableHead>
                  <TableHead>Financement</TableHead>
                  <TableHead>
                    <span className="inline-flex items-center gap-1">
                      <CreditCard className="h-3.5 w-3.5" /> Paiement
                    </span>
                  </TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Dossier</TableHead>
                  <TableHead>Positionnement</TableHead>
                  <TableHead>Certification</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {s.inscriptions.map((i) => {
                  const manquantes = s.formation.piecesAttendues.filter(
                    (p) => !i.piecesRecues.includes(p),
                  );
                  return (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/candidats/${i.candidatId}`}
                        className="hover:underline"
                      >
                        {i.candidat.prenom} {i.candidat.nom}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {i.financementType
                        ? FINANCEMENT_LABELS[i.financementType]
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <PaiementEditor
                        inscriptionId={i.id}
                        modePaiement={i.modePaiement}
                        paiementStatut={i.paiementStatut}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={STATUT_BADGE_CLS[i.statut]}
                      >
                        {INSCRIPTION_STATUT_LABELS[i.statut]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {s.formation.piecesAttendues.length === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : manquantes.length === 0 ? (
                        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                          Complet
                        </Badge>
                      ) : (
                        <Link
                          href={`/candidats/${i.candidatId}`}
                          title={`Pièces manquantes : ${manquantes.join(", ")}`}
                        >
                          <Badge variant="secondary" className="bg-red-500/10 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-500/20">
                            {manquantes.length} pièce{manquantes.length > 1 ? "s" : ""} manquante{manquantes.length > 1 ? "s" : ""}
                          </Badge>
                        </Link>
                      )}
                    </TableCell>
                    <TableCell>
                      {i.positionnementCompletedAt ? (
                        <a
                          href={`/positionnement/${i.positionnementToken}`}
                          target="_blank"
                          rel="noopener"
                          title="Voir les réponses signées"
                        >
                          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-500/20">
                            Répondu
                          </Badge>
                        </a>
                      ) : i.positionnementSentAt ? (
                        <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-300">
                          Envoyé
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <CertificationSelect
                        inscriptionId={i.id}
                        value={i.resultatCertification}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {s.formation.grilleInrs && (
                          <a
                            href={`/documents/grille-certification/${i.id}`}
                            target="_blank"
                            rel="noopener"
                            title="Grille de certification INRS (pré-remplie)"
                            className="inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs font-medium hover:bg-muted"
                          >
                            <Award className="h-3.5 w-3.5" /> Grille
                          </a>
                        )}
                        <InscriptionQuickActions
                          inscriptionId={i.id}
                          sessionId={s.id}
                          docsSignes={(i.docsSignes as Record<string, { nom: string; date: string }> | null) ?? undefined}
                          formation={{ reference: s.formation.reference, titre: s.formation.titre }}
                          candidatId={i.candidatId}
                          ssiap={{
                            numero: i.candidat.ssiapDiplomeNumero,
                            date: i.candidat.ssiapDiplomeDate
                              ? i.candidat.ssiapDiplomeDate.toISOString().slice(0, 10)
                              : null,
                            niveau: i.candidat.ssiapNiveau,
                          }}
                        />
                        <InscriptionActionsMenu
                          inscriptionId={i.id}
                          sessionId={s.id}
                          candidatId={i.candidatId}
                          statut={i.statut}
                          diplomeSsiapNiveau={diplomeSsiapNiv}
                          attestation={attestationForDocs}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          <div className="rounded-lg border bg-muted/30 p-4">
            <h3 className="mb-3 text-sm font-semibold">Inscrire un candidat</h3>
            <EnrollForm
              sessionId={s.id}
              candidats={candidatsDisponibles}
              prereq={prereq}
              piecesAttendues={s.formation.piecesAttendues}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
