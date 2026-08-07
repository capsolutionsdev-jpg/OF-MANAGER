import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import { requireSection } from "@/lib/section-guard";
import { getTenantDb } from "@/lib/tenant";
import { PageHeader } from "@/components/ui/page-header";
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

const STATUT: Record<string, { label: string; cls: string }> = {
  BROUILLON: { label: "Brouillon", cls: "bg-muted text-muted-foreground" },
  ENVOYEE: { label: "Envoyé", cls: "bg-blue-500/10 text-blue-700 dark:text-blue-300" },
  PAYEE: { label: "Accepté", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  PARTIELLE: { label: "Partiel", cls: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  ANNULEE: { label: "Refusé", cls: "bg-rose-500/10 text-rose-700 dark:text-rose-300" },
  AVOIR: { label: "Avoir", cls: "bg-muted text-muted-foreground" },
};

const euro = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

export default async function DevisPage() {
  await requireSection("facturation");
  const db = await getTenantDb();
  const devis = await db.devis.findMany({
    orderBy: { createdAt: "desc" },
    include: { entreprise: { select: { raisonSociale: true } } },
  });

  const fmt = (d: Date | null) => (d ? d.toLocaleDateString("fr-FR") : "—");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Devis"
        subtitle={`${devis.length} devis · numérotation séquentielle, prêt pour la facturation`}
      >
        <Button render={<Link href="/devis/nouveau" />}>
          <Plus className="mr-2 h-4 w-4" /> Nouveau devis
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          {devis.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-12 text-center">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <p className="font-medium">Aucun devis</p>
              <p className="text-sm text-muted-foreground">Créez votre premier devis.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="hidden md:table-cell">Objet</TableHead>
                  <TableHead className="text-right">Total TTC</TableHead>
                  <TableHead className="hidden lg:table-cell">Validité</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devis.map((d) => (
                  <TableRow key={d.id} className="hover:bg-muted/40">
                    <TableCell className="font-medium">
                      <Link href={`/devis/${d.id}`} className="hover:underline">{d.reference}</Link>
                    </TableCell>
                    <TableCell>{d.entreprise?.raisonSociale ?? d.clientNom ?? "—"}</TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{d.objet ?? "—"}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{euro(Number(d.montantTTC))}</TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">{fmt(d.validUntil)}</TableCell>
                    <TableCell>
                      <Badge className={STATUT[d.statut]?.cls ?? ""}>{STATUT[d.statut]?.label ?? d.statut}</Badge>
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
