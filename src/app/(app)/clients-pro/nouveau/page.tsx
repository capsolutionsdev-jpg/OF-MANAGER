import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { creerClientPro } from "@/lib/actions/client-pro-actions";

export default function NouveauClientProPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/clients-pro"
          className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
        >
          <ArrowLeft className="h-3 w-3" /> Clients pro
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Nouveau client professionnel</h1>
        <p className="text-sm text-muted-foreground">
          Coordonnées légales de l&apos;entreprise — elles alimentent automatiquement
          la convention de formation et les documents.
        </p>
      </div>

      <form action={creerClientPro} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Identité légale</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="raisonSociale">Raison sociale *</Label>
              <Input id="raisonSociale" name="raisonSociale" required placeholder="ex. TRANSPORTS DUPONT SAS" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="siret">SIRET</Label>
              <Input
                id="siret"
                name="siret"
                inputMode="numeric"
                maxLength={17}
                pattern="[0-9 ]{14,17}"
                title="14 chiffres (les espaces sont autorisés)"
                placeholder="14 chiffres"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="numeroTva">N° TVA intracommunautaire</Label>
              <Input id="numeroTva" name="numeroTva" placeholder="FR…" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="adresse">Adresse du siège</Label>
              <Input id="adresse" name="adresse" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="codePostal">Code postal</Label>
              <Input id="codePostal" name="codePostal" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ville">Ville</Label>
              <Input id="ville" name="ville" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Signataire & contact</CardTitle>
            <CardDescription>
              Le signataire légal apparaît sur la convention de formation.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="representant">Représentant légal (signataire)</Label>
              <Input id="representant" name="representant" placeholder="Prénom NOM" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fonction">Fonction</Label>
              <Input id="fonction" name="fonction" placeholder="ex. Gérant, DRH…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactNom">Contact opérationnel</Label>
              <Input id="contactNom" name="contactNom" placeholder="Personne qui gère le dossier" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactTel">Téléphone</Label>
              <Input id="contactTel" name="contactTel" type="tel" inputMode="tel" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="contactEmail">E-mail (envoi des conventions, convocations, attestations)</Label>
              <Input id="contactEmail" name="contactEmail" type="email" placeholder="contact@entreprise.fr" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Financement & notes</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="opco">Financeur habituel</Label>
              <select id="opco" name="opco" className="h-9 w-full rounded-md border bg-transparent px-3 text-sm">
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
              <textarea id="notes" name="notes" rows={3} className="w-full rounded-md border bg-transparent p-3 text-sm" />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit">Créer le client pro</Button>
          <Button variant="outline" render={<Link href="/clients-pro" />}>Annuler</Button>
        </div>
      </form>
    </div>
  );
}
