import Link from "next/link";
import { FileSearch, Building2 } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreerAuditForm, type SessionOpt } from "@/components/audit/creer-audit-form";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  INTERNE: "Interne",
  CONTROLE: "Contrôle externe",
  ALEATOIRE: "Aléatoire",
};

export default async function AuditPage() {
  const db = await getTenantDb();
  const [audits, sessions] = await Promise.all([
    db.auditControle.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { dossiers: true } } },
    }),
    db.session.findMany({
      where: { statut: { not: "ANNULEE" } },
      orderBy: { dateDebut: "desc" },
      take: 200,
      select: { id: true, reference: true, dateDebut: true, formation: { select: { titre: true } } },
    }),
  ]);

  const sessionOpts: SessionOpt[] = sessions.map((s) => ({
    id: s.id,
    label: `${s.formation.titre} — ${s.dateDebut.toLocaleDateString("fr-FR")}${s.reference ? ` (${s.reference})` : ""}`,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit & contrôle des dossiers"
        subtitle="Auditez une session ou un dossier indicateur par indicateur (Qualiopi), relancez les manques et suivez la mise en conformité."
      >
        <Button variant="outline" size="sm" render={<Link href="/audit/organisme" />}>
          <Building2 className="mr-1.5 h-4 w-4" /> Documents de l'organisme
        </Button>
      </PageHeader>

      <CreerAuditForm sessions={sessionOpts} />

      <Card>
        <CardContent className="pt-4">
          {audits.length === 0 ? (
            <EmptyState
              icon={FileSearch}
              title="Aucun audit"
              description="Créez un premier audit ci-dessus (interne, suite à un contrôle, ou aléatoire)."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Audit</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Périmètre</TableHead>
                  <TableHead>Dossiers</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Créé le</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audits.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Link href={`/audit/${a.id}`} className="font-medium text-primary hover:underline">
                        {a.titre}
                      </Link>
                    </TableCell>
                    <TableCell>{TYPE_LABEL[a.type] ?? a.type}</TableCell>
                    <TableCell>{a.perimetre === "SESSION" ? "Session" : "Dossier"}</TableCell>
                    <TableCell>{a._count.dossiers}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          a.statut === "TERMINE"
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "bg-sky-500/10 text-sky-700 dark:text-sky-300"
                        }
                      >
                        {a.statut === "TERMINE" ? "Terminé" : "En cours"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {a.createdAt.toLocaleDateString("fr-FR")}
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
