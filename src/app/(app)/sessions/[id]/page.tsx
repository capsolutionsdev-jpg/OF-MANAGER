import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Users, ClipboardCheck, FileText, UserCog, CreditCard, Award, Download, CheckCircle2 } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
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
import { MODALITE_LABELS } from "@/lib/validators/formation";
import { SESSION_STATUT_LABELS } from "@/lib/validators/session";
import { INSCRIPTION_STATUT_LABELS } from "@/lib/validators/inscription";
import { setResultatsDeclares } from "@/lib/actions/session-actions";
import { FINANCEMENT_LABELS } from "@/lib/validators/candidat";
import { EnrollForm } from "@/components/inscriptions/enroll-form";
import { InscriptionQuickActions } from "@/components/inscriptions/inscription-quick-actions";
import { SessionGardeFou } from "@/components/sessions/session-garde-fou";
import { SessionClotureBar } from "@/components/sessions/session-cloture-bar";
import { InscriptionActionsMenu } from "@/components/inscriptions/inscription-actions-menu";
import { PaiementEditor } from "@/components/inscriptions/paiement-editor";
import { CertificationSelect } from "@/components/inscriptions/certification-select";
import { SendSatisfactionButton } from "@/components/sessions/send-satisfaction-button";
import { SendConvocationsButton } from "@/components/sessions/send-convocations-button";
import { SendCompteRenduButton } from "@/components/sessions/send-compte-rendu-button";
import { SendContratButton } from "@/components/sessions/send-contrat-button";
import { DossierChecklist } from "@/components/inscriptions/dossier-checklist";

const STATUT_BADGE_CLS: Record<string, string> = {
  EN_ATTENTE: "bg-muted text-muted-foreground",
  VALIDEE: "bg-emerald-500/10 text-emerald-700",
  SUSPENDUE: "bg-amber-500/10 text-amber-700",
  ANNULEE: "bg-destructive/10 text-destructive",
};

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
  const db = await getTenantDb();
  const { id } = await params;
  const s = await db.session.findUnique({
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
  const candidatsDisponibles = await db.candidat.findMany({
    where: { id: { notIn: enrolledIds }, statut: { not: "ARCHIVE" } },
    select: { id: true, nom: true, prenom: true },
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
  });

  const fmt = (d: Date) => d.toLocaleDateString("fr-FR");

  // ── Garde-fou : ce qu'il reste à compléter pour la session ──
  const pa = s.formation.piecesAttendues;
  const gfDossier: string[] = [];
  const gfSign: string[] = [];
  const gfConv: string[] = [];
  const gfPos: string[] = [];
  for (const i of s.inscriptions) {
    if (i.statut === "ANNULEE") continue;
    const nom = `${i.candidat.prenom} ${i.candidat.nom}`.trim();
    if (pa.length > 0 && pa.some((p) => !i.piecesRecues.includes(p))) gfDossier.push(nom);
    if (!i.signedAt) gfSign.push(nom);
    if (!i.convocationSentAt) gfConv.push(nom);
    if (!i.positionnementCompletedAt) gfPos.push(nom);
  }
  const gardeFouGroups = [
    { key: "dossier", label: "Dossiers incomplets", noms: gfDossier },
    { key: "signature", label: "Documents non signés", noms: gfSign },
    { key: "convocation", label: "Convocations à envoyer", noms: gfConv },
    { key: "positionnement", label: "Positionnements non faits", noms: gfPos },
  ];
  const canArchive = gfDossier.length === 0 && gfSign.length === 0;
  const dejaArchivee = s.statut === "TERMINEE";

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

      <div className="space-y-2">
        <SessionGardeFou groups={gardeFouGroups} />
        <div className="flex justify-end">
          <SessionClotureBar sessionId={s.id} canArchive={canArchive} dejaArchivee={dejaArchivee} />
        </div>
      </div>

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
              <ul className="space-y-2 text-sm">
                {s.inscriptions.map((i) => (
                  <li
                    key={i.id}
                    className="flex flex-col gap-2 border-b py-2 last:border-0 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">
                        {i.candidat.prenom} {i.candidat.nom}
                      </span>
                      {i.signedAt ? (
                        <Badge className="bg-emerald-500/10 text-emerald-700">
                          dossier signé{i.signedParNom ? ` · par ${i.signedParNom}` : ""}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">non signé</Badge>
                      )}
                      {i.satisfactionCompletedAt ? (
                        <Badge className="bg-emerald-500/10 text-emerald-700">
                          satisfaction reçue
                        </Badge>
                      ) : i.satisfactionSentAt ? (
                        <Badge className="bg-amber-500/10 text-amber-700">
                          satisfaction envoyée
                        </Badge>
                      ) : null}
                      {/* Tâches à faire pour ce candidat */}
                      {s.formation.piecesAttendues.length > 0 &&
                        s.formation.piecesAttendues.some((p) => !i.piecesRecues.includes(p)) && (
                          <Badge variant="outline" className="border-amber-300 text-amber-700">
                            ⚠ Dossier à compléter
                          </Badge>
                        )}
                      {!i.convocationSentAt && (
                        <Badge variant="outline" className="border-amber-300 text-amber-700">
                          ⚠ Convocation à envoyer
                        </Badge>
                      )}
                      {!i.positionnementCompletedAt && (
                        <Badge variant="outline" className="border-amber-300 text-amber-700">
                          ⚠ Positionnement
                        </Badge>
                      )}
                    </span>
                    <span className="flex flex-wrap items-center gap-3">
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
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                          Complet
                        </Badge>
                      ) : (
                        <Link
                          href={`/candidats/${i.candidatId}`}
                          title={`Pièces manquantes : ${manquantes.join(", ")}`}
                        >
                          <Badge variant="secondary" className="bg-red-100 text-red-700 hover:bg-red-200">
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
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
                            Répondu
                          </Badge>
                        </a>
                      ) : i.positionnementSentAt ? (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-700">
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
                          piecesAttendues={s.formation.piecesAttendues}
                          piecesRecues={i.piecesRecues}
                          validePar={(i.piecesValideePar as Record<string, { nom: string; date: string }> | null) ?? undefined}
                        />
                        <InscriptionActionsMenu
                          inscriptionId={i.id}
                          sessionId={s.id}
                          candidatId={i.candidatId}
                          statut={i.statut}
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
            <EnrollForm sessionId={s.id} candidats={candidatsDisponibles} />
          </div>
        </CardContent>
      </Card>

      {/* Examen & certification (formations soumises à examen) */}
      {s.formation.examen && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="h-4 w-4" /> Examen &amp; certification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Examen : {s.dateExamen ? fmt(s.dateExamen) : "date à définir"}
              {s.lieuExamen ? ` · ${s.lieuExamen}` : ""}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Certifiés", n: s.inscriptions.filter((i) => i.resultatCertification === "CERTIFIE").length, cls: "text-emerald-700" },
                { label: "Ajournés", n: s.inscriptions.filter((i) => i.resultatCertification === "AJOURNE").length, cls: "text-amber-700" },
                { label: "Absents", n: s.inscriptions.filter((i) => i.resultatCertification === "ABANDON").length, cls: "text-destructive" },
                { label: "En attente", n: s.inscriptions.filter((i) => i.resultatCertification === "NON_EVALUE").length, cls: "text-muted-foreground" },
              ].map((k) => (
                <div key={k.label} className="rounded-lg border bg-muted/30 p-3 text-center">
                  <div className={`text-2xl font-bold ${k.cls}`}>{k.n}</div>
                  <div className="text-xs text-muted-foreground">{k.label}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t pt-3">
              <Button variant="outline" size="sm" render={<a href={`/sessions/${s.id}/resultats`} />}>
                <Download className="mr-1.5 h-4 w-4" /> Exporter les résultats (CSV)
              </Button>
              {s.resultatsDeclaresAt ? (
                <>
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Résultats déclarés au certificateur le {fmt(s.resultatsDeclaresAt)}
                  </span>
                  <form action={setResultatsDeclares}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="declared" value="false" />
                    <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">Annuler</Button>
                  </form>
                </>
              ) : (
                <form action={setResultatsDeclares}>
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="declared" value="true" />
                  <Button type="submit" size="sm">Marquer les résultats déclarés au certificateur</Button>
                </form>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Saisissez le résultat de chaque participant dans le tableau ci-dessus (colonne « Certification »).
              L&apos;« Attestation de réussite » se génère via le menu documents de chaque candidat admis.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dossiers administratifs (pièces à fournir) */}
      {s.formation.piecesAttendues.length > 0 && s.inscriptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardCheck className="h-4 w-4" /> Dossiers administratifs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Cochez les pièces reçues au fur et à mesure. Relancez les candidats dont le dossier est incomplet.
            </p>
            {s.inscriptions.map((i) => {
              const manquantes = s.formation.piecesAttendues.filter(
                (p) => !i.piecesRecues.includes(p),
              );
              return (
                <div key={i.id} className="rounded-lg border p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <Link href={`/candidats/${i.candidatId}`} className="font-medium hover:underline">
                      {i.candidat.prenom} {i.candidat.nom}
                    </Link>
                    {manquantes.length === 0 ? (
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                        Dossier complet
                      </Badge>
                    ) : (
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
                      )
                    )}
                  </div>
                  <DossierChecklist
                    inscriptionId={i.id}
                    piecesAttendues={s.formation.piecesAttendues}
                    piecesRecues={i.piecesRecues}
                    validePar={(i.piecesValideePar as Record<string, { nom: string; date: string }> | null) ?? undefined}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
