import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { creerPartenaire, supprimerPartenaire } from "@/lib/actions/registre-actions";

export const dynamic = "force-dynamic";

export default async function PartenairesPage() {
  const partenaires = await prisma.partenaire.findMany({
    orderBy: [{ categorie: "asc" }, { nom: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/qualiopi"
          className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
        >
          <ArrowLeft className="h-3 w-3" /> Conformité Qualiopi
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Registre des partenaires</h1>
        <p className="text-sm text-muted-foreground">
          Réseau socio-économique et partenaires handicap (indicateurs 26-27) :
          Agefiph, Cap emploi, France Travail, entreprises, branches…
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ajouter un partenaire</CardTitle>
          <CardDescription>
            Conseil : renseignez au minimum les partenaires handicap de votre département
            (Agefiph, Cap emploi, MDPH) et vos partenaires emploi/entreprises.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={creerPartenaire} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nom">Nom</Label>
              <Input id="nom" name="nom" required placeholder="ex. Cap emploi 95" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="categorie">Catégorie</Label>
              <select id="categorie" name="categorie" className="h-9 w-full rounded-md border bg-transparent px-3 text-sm">
                <option>Handicap</option>
                <option>Emploi / insertion</option>
                <option>Entreprise</option>
                <option>Institutionnel / financeur</option>
                <option>Branche professionnelle</option>
                <option>Autre</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact">Contact (nom)</Label>
              <Input id="contact" name="contact" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="telephone">Téléphone</Label>
              <Input id="telephone" name="telephone" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="objet">Nature du partenariat</Label>
              <Input id="objet" name="objet" placeholder="ex. Accompagnement des stagiaires en situation de handicap" />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">Ajouter au registre</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Partenaires ({partenaires.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {partenaires.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun partenaire enregistré.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Nature</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partenaires.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.nom}</TableCell>
                    <TableCell><Badge variant="outline">{p.categorie}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {[p.contact, p.telephone, p.email].filter(Boolean).join(" · ") || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.objet ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <form action={supprimerPartenaire}>
                        <input type="hidden" name="id" value={p.id} />
                        <Button type="submit" size="sm" variant="ghost" className="text-destructive">
                          Supprimer
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
