import Link from "next/link";
import { Plus, FileText, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TONE_CLASSES } from "@/components/ui/status-badge";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/superadmin-guard";
import { euros } from "@/lib/plans";
import { cn } from "@/lib/utils";
import { computeContratTotals, ENGAGEMENT_LABELS, type EngagementType } from "@/lib/contrats/prestation";
import { contratDataFrom } from "@/lib/contrats/prestation-data";

export const dynamic = "force-dynamic";

const STATUT_BADGE: Record<string, string> = {
  BROUILLON: TONE_CLASSES.neutral,
  ENVOYE: TONE_CLASSES.warning,
  SIGNE: TONE_CLASSES.success,
  REFUSE: TONE_CLASSES.danger,
};
const STATUT_LABEL: Record<string, string> = {
  BROUILLON: "Brouillon",
  ENVOYE: "Envoyé",
  SIGNE: "Signé",
  REFUSE: "Refusé",
};

export default async function DevisPage() {
  await requireSuperAdmin();
  const contrats = await prisma.contratPrestation.findMany({
    orderBy: { createdAt: "desc" },
    include: { organisme: { select: { id: true, nom: true } } },
  });

  const signes = contrats.filter((c) => c.statut === "SIGNE").length;
  const rows = contrats.map((c) => {
    const t = computeContratTotals(contratDataFrom(c));
    return {
      id: c.id,
      reference: c.reference,
      client: c.organisme.nom,
      organismeId: c.organisme.id,
      formuleNom: contratDataFrom(c).formuleNom,
      recurrent: t.recurrentMois,
      engagementLabel: ENGAGEMENT_LABELS[c.engagement as EngagementType],
      statut: c.statut as string,
      pionnier: c.pionnier,
    };
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Devis & contrats"
        subtitle={`${contrats.length} document${contrats.length > 1 ? "s" : ""} · ${signes} signé${signes > 1 ? "s" : ""}`}
      >
        <Button render={<Link href="/console/devis/nouveau" />}>
          <Plus className="mr-2 h-4 w-4" /> Nouveau devis
        </Button>
      </PageHeader>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          Aucun devis pour l'instant.{" "}
          <Link href="/console/devis/nouveau" className="font-medium text-primary hover:underline">
            Créer le premier
          </Link>
          .
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Réf.</th>
                <th className="px-4 py-2.5 font-medium">Client</th>
                <th className="px-4 py-2.5 font-medium">Formule</th>
                <th className="px-4 py-2.5 text-right font-medium">Récurrent / mois</th>
                <th className="px-4 py-2.5 font-medium">Engagement</th>
                <th className="px-4 py-2.5 font-medium">Statut</th>
                <th className="px-4 py-2.5 text-right font-medium">PDF</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2.5 font-medium">
                    {r.reference}
                    {r.pionnier && (
                      <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600">
                        <Sparkles className="h-3 w-3" /> Pionnier
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <Link href={`/console/${r.organismeId}`} className="hover:text-primary hover:underline">
                      {r.client}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{r.formuleNom}</td>
                  <td className="px-4 py-2.5 text-right font-medium tabular-nums">{euros(r.recurrent)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{r.engagementLabel}</td>
                  <td className="px-4 py-2.5">
                    <Badge className={cn("text-[11px]", STATUT_BADGE[r.statut])}>{STATUT_LABEL[r.statut]}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <a
                      href={`/api/console/contrat-prestation/${r.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted"
                    >
                      <FileText className="h-3.5 w-3.5" /> PDF
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        L'envoi pour signature, la copie du lien et la suppression se font depuis la fiche du client (onglet Facturation).
      </p>
    </div>
  );
}
