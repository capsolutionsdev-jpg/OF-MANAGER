import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function ClientsProPage() {
  const clients = await prisma.entreprise.findMany({
    orderBy: { raisonSociale: "asc" },
    include: {
      _count: { select: { candidats: true, inscriptions: true, conventions: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients professionnels</h1>
          <p className="text-sm text-muted-foreground">
            Entreprises clientes : coordonnées légales, salariés à former, conventions.
          </p>
        </div>
        <Button render={<Link href="/clients-pro/nouveau" />}>
          <Plus className="mr-1.5 h-4 w-4" /> Nouveau client pro
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {clients.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-12 text-center">
              <Building2 className="h-8 w-8 text-muted-foreground" />
              <p className="font-medium">Aucun client professionnel</p>
              <p className="text-sm text-muted-foreground">
                Ajoutez une entreprise pour gérer ses commandes de formation,
                conventions et salariés à former.
              </p>
              <Button render={<Link href="/clients-pro/nouveau" />} className="mt-1">
                <Plus className="mr-1.5 h-4 w-4" /> Ajouter un client pro
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Raison sociale</TableHead>
                  <TableHead>SIRET</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Financeur</TableHead>
                  <TableHead>Salariés</TableHead>
                  <TableHead>Inscriptions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      <Link href={`/clients-pro/${c.id}`} className="hover:underline">
                        {c.raisonSociale}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.siret ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {[c.contactNom, c.contactEmail].filter(Boolean).join(" · ") || "—"}
                    </TableCell>
                    <TableCell>
                      {c.opco ? <Badge variant="outline">{c.opco}</Badge> : "—"}
                    </TableCell>
                    <TableCell>{c._count.candidats}</TableCell>
                    <TableCell>{c._count.inscriptions}</TableCell>
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
