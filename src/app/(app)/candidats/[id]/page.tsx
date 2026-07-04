import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, History, CalendarDays, FileDown, Trash2, Target, MessageSquare, Calculator } from "lucide-react";
import { auth } from "@/auth";
import { canAccessSection, roleAllowedInSection } from "@/lib/permissions";
import { getTenantDb } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  STATUT_LABELS,
  FINANCEMENT_LABELS,
  CNAPS_STATUT_LABELS,
} from "@/lib/validators/candidat";
import { INSCRIPTION_STATUT_LABELS } from "@/lib/validators/inscription";
import { INTERACTION_LABELS } from "@/lib/validators/crm";
import { anonymiseCandidat } from "@/lib/actions/rgpd-actions";
import { resendParcoursAction } from "@/lib/actions/parcours-actions";
import { DossierChecklist } from "@/components/inscriptions/dossier-checklist";
import { PieceValidation } from "@/components/inscriptions/piece-validation";
import { CandidatAccessPanel } from "@/components/candidats/candidat-access-panel";
import { CivicAccessButton } from "@/components/candidats/civic-access-button";
import { RecordPaymentDialog } from "@/components/comptabilite/record-payment-dialog";
import { SendProspectLinkButton } from "@/components/crm/send-prospect-link-button";
import { CrmPanel } from "@/components/crm/crm-panel";
import { AddInteractionForm } from "@/components/crm/add-interaction-form";
import { Send } from "lucide-react";

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

export default async function CandidatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const db = await getTenantDb();
  const { id } = await params;
  const candidat = await db.candidat.findUnique({
    where: { id },
    include: {
      inscriptions: {
        include: {
          session: { include: { formation: true } },
          paiements: {
            select: {
              id: true,
              montant: true,
              date: true,
              mode: true,
              enregistrePar: { select: { name: true } },
            },
            orderBy: { date: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      interactionsCandidat: {
        include: { user: { select: { name: true } } },
        orderBy: { date: "desc" },
      },
      pieces: {
        orderBy: { createdAt: "desc" },
        select: { id: true, label: true, categorie: true, url: true, mimeType: true, statut: true, motifRefus: true },
      },
      apprenant: { select: { userId: true } },
    },
  });
  if (!candidat) notFound();

  // Le visiteur peut-il enregistrer un règlement ? (accès section comptabilité)
  const session = await auth();
  const peutEncaisser =
    !!session?.user &&
    roleAllowedInSection(session.user.role, "comptabilite") &&
    canAccessSection(session.user.role, session.user.permissions ?? [], "comptabilite");

  // Format monétaire FR
  const eur = (n: number) =>
    n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " €";

  const users = await db.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const logs = await db.auditLog.findMany({
    where: { entityType: "Candidat", entityId: id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { user: true },
  });

  const fmtDate = (d: Date | null) =>
    d ? d.toLocaleDateString("fr-FR") : null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/candidats"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Retour aux candidats
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-3">
            {candidat.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={candidat.photoUrl}
                alt={`Photo de ${candidat.prenom} ${candidat.nom}`}
                className="h-14 w-14 rounded-full border-2 border-white object-cover shadow-md ring-1 ring-black/10"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                {candidat.prenom.charAt(0)}
                {candidat.nom.charAt(0)}
              </div>
            )}
            <h1 className="text-2xl font-bold tracking-tight">
              {candidat.prenom} {candidat.nom}
            </h1>
            <Badge variant="secondary">{STATUT_LABELS[candidat.statut]}</Badge>
            {candidat.prospectFormCompletedAt ? (
              <Badge className="bg-emerald-500/10 text-emerald-700">
                fiche signée
              </Badge>
            ) : candidat.prospectFormSentAt ? (
              <Badge className="bg-amber-500/10 text-amber-700">
                lien d&apos;inscription envoyé
              </Badge>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              render={
                <Link
                  href={`/simulateur-financement?prenom=${encodeURIComponent(candidat.prenom)}&nom=${encodeURIComponent(candidat.nom)}`}
                />
              }
            >
              <Calculator className="mr-2 h-4 w-4" /> Simuler le financement
            </Button>
            {candidat.statut !== "INSCRIT" && (
              <SendProspectLinkButton
                candidatId={candidat.id}
                sent={!!candidat.prospectFormSentAt}
              />
            )}
            <Button
              variant="outline"
              render={<Link href={`/candidats/${candidat.id}/modifier`} />}
            >
              <Pencil className="mr-2 h-4 w-4" /> Modifier
            </Button>
            <Button
              variant="outline"
              render={<a href={`/candidats/${candidat.id}/export`} />}
            >
              <FileDown className="mr-2 h-4 w-4" /> Exporter RGPD
            </Button>
            <form action={anonymiseCandidat}>
              <input type="hidden" name="candidatId" value={candidat.id} />
              <Button type="submit" variant="outline">
                <Trash2 className="mr-2 h-4 w-4 text-destructive" /> Anonymiser
              </Button>
            </form>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Coordonnées</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Email" value={candidat.email} />
              <Field label="Téléphone" value={candidat.telephone} />
              <Field
                label="Date de naissance"
                value={fmtDate(candidat.dateNaissance)}
              />
              <Field label="Lieu de naissance" value={candidat.lieuNaissance} />
              <Field label="Pays de naissance" value={candidat.paysNaissance} />
              <Field label="Adresse" value={candidat.adresse} />
              <Field label="Code postal" value={candidat.codePostal} />
              <Field label="Ville" value={candidat.ville} />
              <Field label="Pays" value={candidat.pays} />
            </dl>
            <CandidatAccessPanel
              candidatId={candidat.id}
              hasAccount={!!candidat.apprenant?.userId}
              email={candidat.email}
            />
            <CivicAccessButton
              candidatId={candidat.id}
              hasToken={!!candidat.civicToken}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profil & financement</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <Field
                label="Situation professionnelle"
                value={candidat.situationPro}
              />
              <Field label="Employeur" value={candidat.employeur} />
              <Field label="Poste occupé" value={candidat.posteOccupe} />
              <Field label="Dernier diplôme obtenu" value={candidat.dernierDiplome} />
              <Field
                label="Comment nous a-t-il connus"
                value={candidat.sourceConnaissance}
              />
              <Field
                label="Financement envisagé"
                value={
                  candidat.financementType
                    ? FINANCEMENT_LABELS[candidat.financementType]
                    : null
                }
              />
              {(candidat.cnapsStatut || candidat.carteProNumero || candidat.carteProValidite) && (
                <>
                  <Field
                    label="Autorisation préalable CNAPS"
                    value={candidat.cnapsStatut ? CNAPS_STATUT_LABELS[candidat.cnapsStatut] : null}
                  />
                  <Field label="N° carte professionnelle" value={candidat.carteProNumero} />
                  <Field
                    label="Validité carte pro"
                    value={candidat.carteProValidite ? candidat.carteProValidite.toLocaleDateString("fr-FR") : null}
                  />
                </>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* CRM commercial + Échanges */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4" /> Suivi commercial (CRM)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CrmPanel
              candidatId={candidat.id}
              crmStage={candidat.crmStage}
              assignedToId={candidat.assignedToId}
              valeurEstimee={
                candidat.valeurEstimee ? String(Number(candidat.valeurEstimee)) : ""
              }
              relanceDate={
                candidat.relanceDate
                  ? candidat.relanceDate.toISOString().slice(0, 10)
                  : ""
              }
              tags={candidat.tags}
              users={users}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4" /> Historique des échanges (
              {candidat.interactionsCandidat.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <AddInteractionForm candidatId={candidat.id} />
            {candidat.interactionsCandidat.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun échange enregistré.
              </p>
            ) : (
              <ul className="space-y-2">
                {candidat.interactionsCandidat.map((it) => (
                  <li key={it.id} className="rounded-lg border bg-muted/20 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {INTERACTION_LABELS[it.type]}
                        </Badge>
                        {it.sujet ?? "—"}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {it.date.toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                    {it.contenu && (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                        {it.contenu}
                      </p>
                    )}
                    {it.user?.name && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        par {it.user.name}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

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
              {candidat.inscriptions.map((i, idx) => {
                const du = i.montant != null ? Number(i.montant) : 0;
                const paye = i.paiements.reduce((s, p) => s + Number(p.montant), 0);
                const restant = Math.max(0, du - paye);
                const modeDefaut =
                  i.modePaiement ??
                  (i.financementType ? FINANCEMENT_LABELS[i.financementType] : undefined);
                return (
                <li
                  key={i.id}
                  className="rounded-lg border bg-muted/20 p-3"
                >
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/sessions/${i.sessionId}`}
                      className="font-medium hover:underline"
                    >
                      {i.session.formation.titre}
                    </Link>
                    <span className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>
                        {i.session.dateDebut.toLocaleDateString("fr-FR")}
                      </span>
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
                            ? "bg-emerald-500/10 text-emerald-700"
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
                    {idx === 0 && <PieceValidation pieces={candidat.pieces} />}
                  </div>

                  {/* Paiement */}
                  <div className="mt-3 border-t pt-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Paiement
                      </p>
                      {peutEncaisser && (
                        <RecordPaymentDialog
                          inscriptionId={i.id}
                          candidatNom={`${candidat.prenom} ${candidat.nom}`}
                          formation={i.session.formation.titre}
                          restant={restant}
                          defaultMode={modeDefaut}
                        />
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm">
                      <span>
                        Dû :{" "}
                        <span className="font-medium">{du > 0 ? eur(du) : "—"}</span>
                      </span>
                      <span>
                        Payé :{" "}
                        <span className="font-medium text-emerald-700">{eur(paye)}</span>
                      </span>
                      <span>
                        Restant :{" "}
                        <span className="font-medium">{du > 0 ? eur(restant) : "—"}</span>
                      </span>
                    </div>
                    {i.paiements.length > 0 && (
                      <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {i.paiements.map((p) => (
                          <li key={p.id} className="flex flex-wrap gap-2">
                            <span>{p.date.toLocaleDateString("fr-FR")}</span>
                            <span className="font-medium text-foreground">
                              {eur(Number(p.montant))}
                            </span>
                            {p.mode && <span>· {p.mode}</span>}
                            <span>· par {p.enregistrePar?.name ?? "—"}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" /> Historique
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune action enregistrée.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {logs.map((log) => (
                <li
                  key={log.id}
                  className="flex items-center justify-between border-b pb-2 last:border-0"
                >
                  <span>
                    <span className="font-medium">{log.action}</span>
                    {log.user ? (
                      <span className="text-muted-foreground">
                        {" "}
                        — {log.user.name}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-muted-foreground">
                    {log.createdAt.toLocaleString("fr-FR")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
