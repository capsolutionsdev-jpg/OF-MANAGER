import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
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
import { supprimerPartenaire } from "@/lib/actions/registre-actions";
import { NewPartenaireDialog } from "@/components/qualiopi/new-partenaire-dialog";

export const dynamic = "force-dynamic";

export default async function PartenairesPage() {
  const db = await getTenantDb();
  const partenaires = await db.partenaire.findMany({
    orderBy: [{ categorie: "asc" }, { nom: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link
          href="/qualiopi"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
        >
          <ArrowLeft className="h-3 w-3" /> Conformité Qualiopi
        </Link>
        <PageHeader
          title="Registre des partenaires"
          subtitle="Réseau socio-économique et partenaires handicap (indicateurs 26-27) : Agefiph, Cap emploi, France Travail, entreprises, branches…"
        >
          <NewPartenaireDialog />
        </PageHeader>
      </div>

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
