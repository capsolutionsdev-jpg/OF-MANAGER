import Link from "next/link";
import { Plus, UserCog } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function FormateursPage() {
  const db = await getTenantDb();
  const formateurs = await db.formateur.findMany({
    orderBy: { nom: "asc" },
    include: { _count: { select: { sessions: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Formateurs</h1>
          <p className="text-sm text-muted-foreground">
            {formateurs.length} formateur{formateurs.length > 1 ? "s" : ""}.
          </p>
        </div>
        <Button render={<Link href="/formateurs/nouveau" />}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau formateur
        </Button>
      </div>

      <Card>
        {formateurs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-center">
            <UserCog className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">Aucun formateur</p>
            <p className="text-sm text-muted-foreground">
              Ajoutez vos formateurs pour les affecter aux sessions.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Spécialités</TableHead>
                <TableHead>Sessions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {formateurs.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">
                    <Link href={`/formateurs/${f.id}`} className="hover:underline">
                      {f.prenom} {f.nom}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {f.email ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {f.specialites ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {f._count.sessions}
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
