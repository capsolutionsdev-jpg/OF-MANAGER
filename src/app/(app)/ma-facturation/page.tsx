import { Wallet, FileDown } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FactureFormateurForm } from "@/components/formateur/facture-formateur-form";

export const dynamic = "force-dynamic";

export const FACTURE_FORMATEUR_LABELS: Record<string, string> = {
  EN_ATTENTE: "En attente", EN_COURS: "En cours", PAYEE: "Payée", REJETEE: "Rejetée",
};
const STATUT_CLASS: Record<string, string> = {
  EN_ATTENTE: "bg-amber-500/10 text-amber-700",
  EN_COURS: "bg-sky-500/10 text-sky-700",
  PAYEE: "bg-emerald-500/10 text-emerald-700",
  REJETEE: "bg-red-500/10 text-red-700",
};

export default async function MaFacturationPage() {
  const db = await getTenantDb();
  const session = await auth();
  const formateur = session?.user?.id
    ? await db.formateur.findUnique({ where: { userId: session.user.id }, select: { id: true } })
    : null;

  if (!formateur) {
    return (
      <div className="space-y-4">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Wallet className="h-6 w-6" /> Ma facturation
        </h1>
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
      select: { id: true, dateDebut: true, formation: { select: { titre: true } } },
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
  const sessionOptions = sessions.map((s) => ({
    id: s.id, label: `${s.formation.titre} — ${fmt(s.dateDebut)}`,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Wallet className="h-6 w-6" /> Ma facturation
        </h1>
        <p className="text-sm text-muted-foreground">
          Transmettez vos factures à l&apos;organisme et suivez leur règlement.
        </p>
      </div>

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
                    <a href={f.fichierUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      <FileDown className="h-3.5 w-3.5" /> Justificatif
                    </a>
                  )}
                  <Badge className={STATUT_CLASS[f.statut] ?? ""}>{FACTURE_FORMATEUR_LABELS[f.statut] ?? f.statut}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
