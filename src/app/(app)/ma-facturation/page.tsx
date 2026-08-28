import { Wallet, FileDown } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { FactureFormateurForm } from "@/components/formateur/facture-formateur-form";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

export const FACTURE_FORMATEUR_LABELS: Record<string, string> = {
  EN_ATTENTE: "En attente", EN_COURS: "En cours", PAYEE: "Payée", REJETEE: "Rejetée",
};
const STATUT_TONE: Record<string, StatusTone> = {
  EN_ATTENTE: "warning",
  EN_COURS: "info",
  PAYEE: "success",
  REJETEE: "danger",
};

export default async function MaFacturationPage() {
  const db = await getTenantDb();
  const session = await auth();
  const formateur = session?.user?.id
    ? await db.formateur.findUnique({ where: { userId: session.user.id }, select: { id: true, tarifJournalier: true } })
    : null;

  if (!formateur) {
    return (
      <div className="space-y-4">
        <PageHeader title="Ma facturation" icon={Wallet} />
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">
          Aucun espace formateur associé à ce compte. Contactez l&apos;organisme de formation.
        </CardContent></Card>
      </div>
    );
  }

  const [sessions, factures] = await Promise.all([
    db.session.findMany({
      where: { formateurs: { some: { id: formateur.id } }, isArchived: false },
      orderBy: { dateDebut: "desc" },
      select: {
        id: true, dateDebut: true, dateFin: true, tarifFormateurJour: true,
        formation: { select: { titre: true } },
        _count: { select: { seances: true } },
      },
    }),
    db.factureFormateur.findMany({
      where: { formateurId: formateur.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, reference: true, montant: true, statut: true, fichierUrl: true,
        createdAt: true, paidAt: true,
        session: { select: { formation: { select: { titre: true } } } },
      },
    }),
  ]);

  const fmt = (d: Date) => d.toLocaleDateString("fr-FR");
  const tarifFormateur = formateur.tarifJournalier != null ? Number(formateur.tarifJournalier) : null;
  const sessionOptions = sessions.map((s) => {
    const jours = Math.max(
      s._count.seances,
      Math.round((s.dateFin.getTime() - s.dateDebut.getTime()) / 86400000) + 1,
    );
    const tarifJour = s.tarifFormateurJour != null ? Number(s.tarifFormateurJour) : tarifFormateur;
    const montantSuggere = tarifJour != null ? Math.round(tarifJour * jours * 100) / 100 : null;
    return { id: s.id, label: `${s.formation.titre} — ${fmt(s.dateDebut)}`, montantSuggere };
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Ma facturation" subtitle="Transmettez vos factures à l'organisme et suivez leur règlement." icon={Wallet} />

      <Card>
        <CardHeader><CardTitle className="text-base">Nouvelle facture</CardTitle></CardHeader>
        <CardContent><FactureFormateurForm sessions={sessionOptions} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Mes factures</CardTitle></CardHeader>
        <CardContent>
          {factures.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune facture transmise pour l&apos;instant.</p>
          ) : (
            <ul className="divide-y">
              {factures.map((f) => (
                <li key={f.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {Number(f.montant).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                      {f.reference ? ` · ${f.reference}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {f.session?.formation.titre ?? "Non rattachée"} · transmise le {fmt(f.createdAt)}
                      {f.paidAt ? ` · réglée le ${fmt(f.paidAt)}` : ""}
                    </p>
                  </div>
                  {f.fichierUrl && (
                    <a href={`/ma-facturation/download?id=${f.id}`}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      <FileDown className="h-3.5 w-3.5" /> Justificatif
                    </a>
                  )}
                  <StatusBadge tone={STATUT_TONE[f.statut] ?? "neutral"}>{FACTURE_FORMATEUR_LABELS[f.statut] ?? f.statut}</StatusBadge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
