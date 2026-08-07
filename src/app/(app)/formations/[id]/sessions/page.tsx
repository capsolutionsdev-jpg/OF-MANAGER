import { notFound } from "next/navigation";
import Link from "next/link";
import { getFormationDetail } from "@/lib/formations/detail";
import { FormationDetailHeader } from "@/components/formations/formation-detail-header";
import { Badge } from "@/components/ui/badge";
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
import { MODALITE_LABELS } from "@/lib/validators/formation";
import { SESSION_STATUT_LABELS } from "@/lib/validators/session";

export default async function FormationSessionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getFormationDetail(id);
  if (!detail) notFound();

  const { f, diplomes } = detail;
  const now = new Date();
  const fmt = (d: Date) => d.toLocaleDateString("fr-FR");
  const etatBadge = (dDeb: Date, dFin: Date) =>
    dFin < now
      ? { label: "Passée", variant: "secondary" as const }
      : dDeb > now
        ? { label: "À venir", variant: "default" as const }
        : { label: "En cours", variant: "outline" as const };

  return (
    <div className="space-y-6">
      <FormationDetailHeader
        formation={{
          id: f.id,
          titre: f.titre,
          modalite: f.modalite,
          isArchived: f.isArchived,
          version: f.version,
        }}
        active="sessions"
        diplomesCount={diplomes.length}
        sessionsCount={f.sessions.length}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">
            Sessions de cette formation{" "}
            <span className="font-normal text-muted-foreground">({f.sessions.length})</span>
          </CardTitle>
          <Link href="/sessions" className="text-sm text-primary hover:underline">
            Voir toutes les sessions
          </Link>
        </CardHeader>
        <CardContent>
          {f.sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune session programmée pour cette formation. Créez-en une depuis la page{" "}
              <Link href="/sessions" className="text-primary hover:underline">
                Sessions
              </Link>
              .
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Référence</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Modalité</TableHead>
                    <TableHead>Lieu</TableHead>
                    <TableHead>Places</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>État</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {f.sessions.map((s) => {
                    const e = etatBadge(s.dateDebut, s.dateFin);
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">
                          <Link href={`/sessions/${s.id}`} className="hover:underline">
                            {s.reference}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {fmt(s.dateDebut)} → {fmt(s.dateFin)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {MODALITE_LABELS[s.modalite]}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{s.lieu || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{s.nbPlaces}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{SESSION_STATUT_LABELS[s.statut]}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={e.variant}>{e.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link
                            href={`/sessions/${s.id}`}
                            className="text-sm text-primary hover:underline"
                          >
                            Ouvrir
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
