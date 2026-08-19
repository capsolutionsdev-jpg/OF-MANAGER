import { FileSignature, CheckCircle2, Clock, PenLine } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { auth } from "@/auth";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

export default async function MesContratsPage() {
  const db = await getTenantDb();
  const session = await auth();
  const formateur = session?.user?.id
    ? await db.formateur.findUnique({ where: { userId: session.user.id }, select: { id: true } })
    : null;

  if (!formateur) {
    return (
      <div className="space-y-4">
        <PageHeader title="Mes contrats" icon={FileSignature} />
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">
          Aucun espace formateur associé à ce compte. Contactez l&apos;organisme de formation.
        </CardContent></Card>
      </div>
    );
  }

  const sessions = await db.session.findMany({
    where: {
      formateurs: { some: { id: formateur.id } },
      contratFormateurSentAt: { not: null },
    },
    orderBy: { dateDebut: "desc" },
    select: {
      id: true, dateDebut: true, dateFin: true,
      contratFormateurToken: true, contratFormateurSignedAt: true,
      formation: { select: { titre: true } },
    },
  });

  const aSigner = sessions.filter((s) => !s.contratFormateurSignedAt);
  const signes = sessions.filter((s) => s.contratFormateurSignedAt);
  const fmt = (d: Date) => d.toLocaleDateString("fr-FR");

  return (
    <div className="space-y-6">
      <PageHeader title="Mes contrats" subtitle="Vos contrats de sous-traitance, à signer et signés." icon={FileSignature} />

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">À signer ({aSigner.length})</h2>
        {aSigner.length === 0 ? (
          <p className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">Aucun contrat en attente de signature.</p>
        ) : (
          <ul className="space-y-2">
            {aSigner.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                <Clock className="h-4 w-4 shrink-0 text-warning" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{s.formation.titre}</p>
                  <p className="text-xs text-muted-foreground">Du {fmt(s.dateDebut)} au {fmt(s.dateFin)}</p>
                </div>
                {s.contratFormateurToken && (
                  <a href={`/contrat-formateur/${s.contratFormateurToken}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/80">
                    <PenLine className="h-4 w-4" /> Lire & signer
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {signes.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Signés ({signes.length})</h2>
          <ul className="space-y-1">
            {signes.map((s) => (
              <li key={s.id} className="flex items-center gap-2 rounded-md bg-success/10 px-3 py-2 text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                <span className="flex-1">{s.formation.titre}</span>
                <span className="text-xs text-muted-foreground">
                  signé le {s.contratFormateurSignedAt ? fmt(s.contratFormateurSignedAt) : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
