import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, Users, FileText, Wallet, ChevronDown } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  majClientPro,
  rattacherCandidat,
  detacherCandidat,
} from "@/lib/actions/client-pro-actions";
import { ConventionDialog } from "@/components/conventions/convention-dialog";
import { CreateAccessButton } from "@/components/clients-pro/create-access-button";
import { DepositFactureForm } from "@/components/clients-pro/deposit-facture-form";
import { ConventionRowActions } from "@/components/clients-pro/convention-row-actions";
import { ConventionDocumentsPanel } from "@/components/clients-pro/convention-documents-panel";
import { getConventionsDocsSummary } from "@/lib/documents/convention-docs-summary";

export const dynamic = "force-dynamic";
// La régénération de la convention depuis la fiche génère un PDF (Chromium).
export const maxDuration = 60;

export default async function ClientProPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const db = await getTenantDb();
  const { id } = await params;
  const client = await db.entreprise.findUnique({
    where: { id },
    include: {
      candidats: {
        orderBy: { nom: "asc" },
        include: {
          inscriptions: {
            include: { session: { include: { formation: true } } },
            orderBy: { createdAt: "desc" },
          },
        },
      },
      conventions: { orderBy: { createdAt: "desc" } },
      factures: { orderBy: { dateEmission: "desc" } },
    },
  });
  if (!client) notFound();

  // Récap des documents publiés par convention (compteurs par étape + satisfactions).
  const docsSummary = await getConventionsDocsSummary(db, client.conventions.map((c) => c.id));

  const candidatsLibres = await db.candidat.findMany({
    where: { entrepriseId: null },
    orderBy: { nom: "asc" },
    select: { id: true, nom: true, prenom: true },
    take: 300,
  });

  const fmt = (d: Date | null) => (d ? d.toLocaleDateString("fr-FR") : "—");

  // Sessions ouvertes + salariés — pour l'inscription groupée (convention).
  const sessionsOuvertes = await db.session.findMany({
    where: { isArchived: false, statut: { not: "ANNULEE" } },
    include: { formation: { select: { titre: true } } },
    orderBy: { dateDebut: "desc" },
    take: 100,
  });
  const sessionOptions = sessionsOuvertes.map((s) => ({
    id: s.id,
    label: `${s.formation.titre} — ${fmt(s.dateDebut)}${s.lieu ? ` (${s.lieu})` : ""}`,
  }));
  const salariesExistants = client.candidats.map((c) => ({
    id: c.id,
    nom: c.nom,
    prenom: c.prenom,
  }));

  const stats = [
    { label: "Financeur", value: client.opco || "—", icon: Wallet },
    { label: "Salariés", value: String(client.candidats.length), icon: Users },
    { label: "Conventions", value: String(client.conventions.length), icon: FileText },
  ];

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <Link
          href="/clients-pro"
          className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
        >
          <ArrowLeft className="h-3 w-3" /> Clients pro
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Building2 className="h-6 w-6 text-primary" /> {client.raisonSociale}
        </h1>
        <p className="text-sm text-muted-foreground">
          {[client.siret && `SIRET ${client.siret}`, client.opco && `Financeur : ${client.opco}`]
            .filter(Boolean)
            .join(" · ") || "Fiche client professionnel"}
        </p>
      </div>

      {/* Bandeau résumé */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
          <div className="grid flex-1 grid-cols-3 gap-4">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label}>
                  <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" /> {s.label}
                  </div>
                  <div className="mt-0.5 truncate text-lg font-semibold">{s.value}</div>
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            <ConventionDialog
              entrepriseId={client.id}
              sessions={sessionOptions}
              candidatsExistants={salariesExistants}
              triggerLabel="Inscrire des salariés"
            />
            <Button
              variant="outline"
              render={<Link href={`/clients-pro/${client.id}/convention`} />}
            >
              <FileText className="mr-1.5 h-4 w-4" /> Bon de convention (PDF)
            </Button>
            <CreateAccessButton entrepriseId={client.id} hasAccess={!!client.userId} />
          </div>
        </CardContent>
      </Card>

      {/* Salariés à former (usage quotidien → en premier) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" /> Salariés ({client.candidats.length})
          </CardTitle>
          <CardDescription>
            Les candidats rattachés à cette entreprise. Inscrivez-les ensuite à une
            session depuis la page Sessions — la convention et les documents prendront
            l&apos;entreprise comme partie.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {client.candidats.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun salarié rattaché.</p>
          ) : (
            <ul className="divide-y">
              {client.candidats.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div>
                    <Link href={`/candidats/${c.id}`} className="font-medium hover:underline">
                      {c.prenom} {c.nom}
                    </Link>
                    <span className="ml-2 text-xs text-muted-foreground">{c.email}</span>
                    {c.inscriptions[0] && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        · Dernière session : {c.inscriptions[0].session.formation.titre} ({fmt(c.inscriptions[0].session.dateDebut)})
                      </span>
                    )}
                  </div>
                  <form action={detacherCandidat}>
                    <input type="hidden" name="entrepriseId" value={client.id} />
                    <input type="hidden" name="candidatId" value={c.id} />
                    <Button type="submit" size="sm" variant="ghost" className="text-destructive">
                      Détacher
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          )}

          <form action={rattacherCandidat} className="flex flex-wrap items-end gap-2 rounded-lg border bg-muted/30 p-3">
            <input type="hidden" name="entrepriseId" value={client.id} />
            <div className="min-w-56 space-y-1.5">
              <Label htmlFor="candidatId">Rattacher un candidat existant</Label>
              <select id="candidatId" name="candidatId" className="h-9 w-full rounded-md border bg-card px-3 text-sm">
                {candidatsLibres.map((c) => (
                  <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>
                ))}
              </select>
            </div>
            <Button type="submit" size="sm">Rattacher</Button>
            <Button size="sm" variant="outline" render={<Link href="/candidats/nouveau" />}>
              Créer un nouveau candidat
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Conventions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conventions ({client.conventions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {client.conventions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune convention. Elle est générée depuis l&apos;inscription du salarié à une session.
            </p>
          ) : (
            <ul className="space-y-3 text-sm">
              {client.conventions.map((cv) => (
                <li key={cv.id} className="space-y-2 border-b pb-3 last:border-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{cv.reference}</span>
                    <span className="text-muted-foreground">{cv.montant ? `${Number(cv.montant)} €` : "—"}</span>
                    <Badge variant="outline">{cv.signatureStatut}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {cv.fileUrl && (
                      <a href={`/clients-pro/download?kind=convention&id=${cv.id}`} className="text-xs text-primary hover:underline">
                        Convention (PDF)
                      </a>
                    )}
                    {cv.fileUrlSigne && (
                      <a href={`/clients-pro/download?kind=convention-signe&id=${cv.id}`} className="text-xs text-primary hover:underline">
                        Version signée
                      </a>
                    )}
                    <ConventionRowActions
                      conventionId={cv.id}
                      isSignee={cv.signatureStatut === "SIGNEE"}
                      hasFileUrl={!!cv.fileUrl}
                    />
                  </div>
                  <ConventionDocumentsPanel conventionId={cv.id} counts={docsSummary.get(cv.id)?.counts} />
                  {(() => {
                    const sats = docsSummary.get(cv.id)?.satisfactions ?? [];
                    if (sats.length === 0) return null;
                    return (
                      <div className="rounded-lg border bg-muted/20 p-2 text-xs">
                        <p className="mb-1 font-medium text-muted-foreground">Satisfaction entreprise</p>
                        <ul className="space-y-1">
                          {sats.map((s) => (
                            <li key={s.id} className="flex items-center justify-between gap-2">
                              <span>{s.nom || "Questionnaire"}</span>
                              {s.retournee ? (
                                <a href={`/clients-pro/download?kind=document&id=${s.id}`} className="font-medium text-primary hover:underline">
                                  Déposée — télécharger
                                </a>
                              ) : (
                                <span className="text-muted-foreground">En attente du client</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })()}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Factures — dépôt du PDF par le staff, téléchargement côté client */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Factures ({client.factures.length})</CardTitle>
          <CardDescription>
            Déposez le PDF d&apos;une facture (établie sur votre logiciel de facturation) — le
            client la télécharge ensuite depuis son espace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {client.factures.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune facture déposée.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {client.factures.map((f) => (
                <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 last:border-0">
                  <span className="font-medium">{f.reference}</span>
                  <span className="text-muted-foreground">
                    {Number(f.montantTTC)} € · {fmt(f.dateEmission)}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{f.statut}</Badge>
                    {f.fileUrl && (
                      <a href={`/clients-pro/download?kind=facture&id=${f.id}`} className="text-primary hover:underline">
                        PDF
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <DepositFactureForm entrepriseId={client.id} />
        </CardContent>
      </Card>

      {/* Coordonnées légales — repliées (lecture par défaut, formulaire à la demande) */}
      <Card>
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-6 [&::-webkit-details-marker]:hidden">
            <div>
              <div className="text-base font-semibold">Modifier les informations légales</div>
              <div className="text-sm text-muted-foreground">
                Raison sociale, SIRET, adresse, représentant, financeur… — alimentent la
                convention et les documents envoyés à l&apos;entreprise.
              </div>
            </div>
            <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t p-6 pt-6">
            <form action={majClientPro} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="id" value={client.id} />
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="raisonSociale">Raison sociale</Label>
                <Input id="raisonSociale" name="raisonSociale" defaultValue={client.raisonSociale} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="siret">SIRET</Label>
                <Input id="siret" name="siret" defaultValue={client.siret ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="numeroTva">N° TVA</Label>
                <Input id="numeroTva" name="numeroTva" defaultValue={client.numeroTva ?? ""} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="adresse">Adresse</Label>
                <Input id="adresse" name="adresse" defaultValue={client.adresse ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="codePostal">Code postal</Label>
                <Input id="codePostal" name="codePostal" defaultValue={client.codePostal ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ville">Ville</Label>
                <Input id="ville" name="ville" defaultValue={client.ville ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="representant">Représentant légal</Label>
                <Input id="representant" name="representant" defaultValue={client.representant ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fonction">Fonction</Label>
                <Input id="fonction" name="fonction" defaultValue={client.fonction ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contactNom">Contact opérationnel</Label>
                <Input id="contactNom" name="contactNom" defaultValue={client.contactNom ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contactTel">Téléphone</Label>
                <Input id="contactTel" name="contactTel" type="tel" inputMode="tel" defaultValue={client.contactTel ?? ""} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="contactEmail">E-mail (documents)</Label>
                <Input id="contactEmail" name="contactEmail" type="email" defaultValue={client.contactEmail ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="opco">Financeur habituel</Label>
                <select id="opco" name="opco" defaultValue={client.opco ?? ""} className="h-9 w-full rounded-md border bg-transparent px-3 text-sm">
                  <option value="">—</option>
                  <option>AKTO</option>
                  <option>OPCO Mobilités</option>
                  <option>OPCO EP</option>
                  <option>OPCO 2i</option>
                  <option>Atlas</option>
                  <option>Uniformation</option>
                  <option>Autre OPCO</option>
                  <option>Autofinancement</option>
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="notes">Notes internes</Label>
                <textarea id="notes" name="notes" rows={2} defaultValue={client.notes ?? ""} className="w-full rounded-md border bg-transparent p-3 text-sm" />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit">Enregistrer</Button>
              </div>
            </form>
          </div>
        </details>
      </Card>
    </div>
  );
}
