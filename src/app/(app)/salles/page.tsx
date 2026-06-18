import { DoorOpen, Power } from "lucide-react";
import { requireSection } from "@/lib/section-guard";
import { getTenantDb } from "@/lib/tenant";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateSalleForm } from "@/components/salles/create-salle-form";
import { toggleSalleActive } from "@/lib/actions/salle-actions";

export const dynamic = "force-dynamic";

export default async function SallesPage() {
  await requireSection("salles");
  const db = await getTenantDb();
  const salles = await db.salle.findMany({
    orderBy: [{ actif: "desc" }, { nom: "asc" }],
    include: { _count: { select: { sessions: true } } },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Salles"
        subtitle={`${salles.length} salle${salles.length > 1 ? "s" : ""} · réutilisables dans les sessions et le planning`}
      />

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm text-muted-foreground">Nouvelle salle</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateSalleForm />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {salles.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-12 text-center">
              <DoorOpen className="h-8 w-8 text-muted-foreground" />
              <p className="font-medium">Aucune salle</p>
              <p className="text-sm text-muted-foreground">Ajoutez votre première salle ci-dessus.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Salle</TableHead>
                  <TableHead>Capacité</TableHead>
                  <TableHead className="hidden md:table-cell">Lieu</TableHead>
                  <TableHead className="hidden lg:table-cell">Équipements</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salles.map((s) => (
                  <TableRow key={s.id} className={s.actif ? "" : "opacity-60"}>
                    <TableCell className="font-medium">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="inline-block h-3 w-3 rounded-full"
                          style={{ backgroundColor: s.couleur ?? "#2C53C0" }}
                        />
                        {s.nom}
                      </span>
                    </TableCell>
                    <TableCell>{s.capacite ?? "—"}</TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{s.lieu ?? "—"}</TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">{s.equipements ?? "—"}</TableCell>
                    <TableCell className="text-right">{s._count.sessions}</TableCell>
                    <TableCell>
                      {s.actif ? (
                        <Badge className="bg-emerald-500/10 text-emerald-700">Active</Badge>
                      ) : (
                        <Badge className="bg-muted text-muted-foreground">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <form action={toggleSalleActive}>
                        <input type="hidden" name="id" value={s.id} />
                        <Button type="submit" size="sm" variant="outline">
                          <Power className="mr-1.5 h-3.5 w-3.5" />
                          {s.actif ? "Désactiver" : "Activer"}
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
