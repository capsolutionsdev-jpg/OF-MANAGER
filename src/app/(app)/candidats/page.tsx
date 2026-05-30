import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { STATUT_LABELS } from "@/lib/validators/candidat";

export default async function CandidatsPage() {
  const candidats = await prisma.candidat.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Candidats</h1>
          <p className="text-sm text-muted-foreground">
            {candidats.length} candidat{candidats.length > 1 ? "s" : ""} enregistré
            {candidats.length > 1 ? "s" : ""}.
          </p>
        </div>
        <Button render={<Link href="/candidats/nouveau" />}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau candidat
        </Button>
      </div>

      <Card>
        {candidats.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-center">
            <Users className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">Aucun candidat pour le moment</p>
            <p className="text-sm text-muted-foreground">
              Commencez par créer votre premier candidat.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Ville</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {candidats.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/candidats/${c.id}`}
                      className="hover:underline"
                    >
                      {c.prenom} {c.nom}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.email}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.telephone ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.ville ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{STATUT_LABELS[c.statut]}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
