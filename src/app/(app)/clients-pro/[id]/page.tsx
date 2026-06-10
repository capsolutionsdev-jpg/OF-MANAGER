import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
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

export const dynamic = "force-dynamic";

export default async function ClientProPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await prisma.entreprise.findUnique({
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
    },
  });
  if (!client) notFound();

  const candidatsLibres = await prisma.candidat.findMany({
    where: { entrepriseId: null },
    orderBy: { nom: "asc" },
    select: { id: true, nom: true, prenom: true },
    take: 300,
  });

  const fmt = (d: Date | null) => (d ? d.toLocaleDateString("fr-FR") : "—");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
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
      </div>

      {/* Coordonnées légales (modifiables) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coordonnées légales</CardTitle>
          <CardDescription>
            Ces informations alimentent la convention de formation et les documents envoyés à l&apos;entreprise.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              <Input id="contactTel" name="contactTel" defaultValue={client.contactTel ?? ""} />
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
        </CardContent>
      </Card>

      {/* Salariés à former */}
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
            <ul className="space-y-2 text-sm">
              {client.conventions.map((cv) => (
                <li key={cv.id} className="flex items-center justify-between gap-2 border-b pb-2 last:border-0">
                  <span className="font-medium">{cv.reference}</span>
                  <span className="text-muted-foreground">
                    {cv.montant ? `${Number(cv.montant)} €` : "—"} · signée : {fmt(cv.dateSignature)}
                  </span>
                  <Badge variant="outline">{cv.signatureStatut}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
