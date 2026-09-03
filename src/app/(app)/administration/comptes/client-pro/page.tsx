import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Building2 } from "lucide-react";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { creerClientPro } from "@/lib/actions/client-pro-actions";

export const dynamic = "force-dynamic";

export default async function CompteClientProPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/administration" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Administration
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Building2 className="h-6 w-6 text-primary" /> Créer un compte client pro
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Entreprise cliente (B2B). Ses coordonnées alimentent les conventions et documents.
          L&apos;accès à son espace (portail) se génère ensuite depuis sa fiche.
        </p>
      </div>

      <form action={creerClientPro} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Identité légale</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="raisonSociale">Raison sociale *</Label>
              <Input id="raisonSociale" name="raisonSociale" required placeholder="ex. TRANSPORTS DUPONT SAS" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="siret">SIRET</Label>
              <Input id="siret" name="siret" placeholder="14 chiffres" />
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
            <CardDescription>Le signataire légal apparaît sur la convention de formation.</CardDescription>
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
              <Label htmlFor="contactEmail">E-mail (conventions, convocations, attestations)</Label>
              <Input id="contactEmail" name="contactEmail" type="email" placeholder="contact@entreprise.fr" />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit">Créer le client pro</Button>
          <Button variant="outline" render={<Link href="/clients-pro" />}>Voir les clients pro</Button>
        </div>
      </form>
    </div>
  );
}
