import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Trash2, Users, ClipboardCheck, FileText, UserCog } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
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
import { MODALITE_LABELS } from "@/lib/validators/formation";
import { SESSION_STATUT_LABELS } from "@/lib/validators/session";
import { INSCRIPTION_STATUT_LABELS } from "@/lib/validators/inscription";
import { FINANCEMENT_LABELS } from "@/lib/validators/candidat";
import { deleteInscriptionAction } from "@/lib/actions/inscription-actions";
import { EnrollForm } from "@/components/inscriptions/enroll-form";
import { DocumentsMenu } from "@/components/documents/documents-menu";
import { SendConvocationsButton } from "@/components/sessions/send-convocations-button";
import { SendCompteRenduButton } from "@/components/sessions/send-compte-rendu-button";
import { SendContratButton } from "@/components/sessions/send-contrat-button";

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm">{value && value !== "" ? value : "—"}</dd>
    </div>
  );
}

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const s = await prisma.session.findUnique({
    where: { id },
    include: {
      formation: true,
      formateurs: true,
      inscriptions: {
        include: { candidat: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!s) notFound();

  const enrolledIds = s.inscriptions.map((i) => i.candidatId);
  const candidatsDisponibles = await prisma.candidat.findMany({
    where: { id: { notIn: enrolledIds }, statut: { not: "ARCHIVE" } },
    select: { id: true, nom: true, prenom: true },
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
  });

  const fmt = (d: Date) => d.toLocaleDateString("fr-FR");

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/sessions"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Retour aux sessions
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {s.formation.titre}
            </h1>
            <Badge variant="outline">{SESSION_STATUT_LABELS[s.statut]}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <SendConvocationsButton sessionId={s.id} />
            <Button
              variant="outline"
              render={<Link href={`/sessions/${s.id}/emargement`} />}
            >
              <ClipboardCheck className="mr-2 h-4 w-4" /> Émargement
            </Button>
            {s.formateurs.length > 0 && (
              <Button
                variant="outline"
                render={
                  <a
                    href={`/documents/contrat-formateur/${s.id}`}
                    download
                  />
                }
              >
                <FileText className="mr-2 h-4 w-4" /> Contrat formateur
              </Button>
            )}
            <Button
              variant="outline"
              render={<Link href={`/sessions/${s.id}/modifier`} />}
            >
              <Pencil className="mr-2 h-4 w-4" /> Modifier
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Détails de la session</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field
              label="Formation"
              value={`${s.formation.titre} (${s.formation.reference})`}
            />
            <Field label="Référence session" value={s.reference} />
            <Field label="Modalité" value={MODALITE_LABELS[s.modalite]} />
            <Field label="Date de début" value={fmt(s.dateDebut)} />
            <Field label="Date de fin" value={fmt(s.dateFin)} />
            <Field label="Horaires" value={s.horaires} />
            <Field label="Lieu" value={s.lieu} />
            <Field
              label="Places"
              value={`${s.inscriptions.length} inscrit(s) / ${s.nbPlaces} places`}
            />
            <Field label="Statut" value={SESSION_STATUT_LABELS[s.statut]} />
          </dl>
        </CardContent>
      </Card>

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
                  <Badge className="bg-emerald-500/10 text-emerald-700">
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
                <Badge className="bg-amber-500/10 text-amber-700">
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
                  <Badge className="bg-emerald-500/10 text-emerald-700">
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
                <Badge className="bg-amber-500/10 text-amber-700">
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
        <CardContent className="space-y-4">
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

          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Dossiers des candidats
            </p>
            {s.inscriptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun candidat inscrit.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {s.inscriptions.map((i) => (
                  <li
                    key={i.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b py-1.5 last:border-0"
                  >
                    <span className="flex items-center gap-2">
                      {i.candidat.prenom} {i.candidat.nom}
                      {i.signedAt && (
                        <Badge className="bg-emerald-500/10 text-emerald-700">
                          signé
                        </Badge>
                      )}
                    </span>
                    <span className="flex flex-wrap gap-3">
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
                          Satisfaction (PDF)
                        </a>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Participants */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" /> Participants ({s.inscriptions.length})
          </CardTitle>
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
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {s.inscriptions.map((i) => (
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
                      <Badge variant="secondary">
                        {INSCRIPTION_STATUT_LABELS[i.statut]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <DocumentsMenu inscriptionId={i.id} />
                        <form action={deleteInscriptionAction}>
                          <input type="hidden" name="id" value={i.id} />
                          <input type="hidden" name="sessionId" value={s.id} />
                          <input
                            type="hidden"
                            name="candidatId"
                            value={i.candidatId}
                          />
                          <Button
                            type="submit"
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Désinscrire"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="rounded-lg border bg-muted/30 p-4">
            <h3 className="mb-3 text-sm font-semibold">Inscrire un candidat</h3>
            <EnrollForm sessionId={s.id} candidats={candidatsDisponibles} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
