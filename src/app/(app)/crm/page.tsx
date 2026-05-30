import Link from "next/link";
import type { CandidatStatut } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { STATUT_LABELS, FINANCEMENT_LABELS } from "@/lib/validators/candidat";
import { StatutSelect } from "@/components/crm/statut-select";

// Colonnes du pipeline (de l'arrivée du prospect jusqu'à l'inscription).
const COLONNES: { statut: CandidatStatut; couleur: string }[] = [
  { statut: "NOUVEAU", couleur: "border-t-blue-500" },
  { statut: "EN_TRAITEMENT", couleur: "border-t-amber-500" },
  { statut: "INSCRIT", couleur: "border-t-emerald-500" },
  { statut: "REFUSE", couleur: "border-t-red-500" },
];

export default async function CrmPage() {
  const candidats = await prisma.candidat.findMany({
    where: { statut: { not: "ARCHIVE" } },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { inscriptions: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">CRM — Suivi des prospects</h1>
        <p className="text-sm text-muted-foreground">
          Suivez vos prospects du premier contact jusqu&apos;à l&apos;inscription.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLONNES.map((col) => {
          const items = candidats.filter((c) => c.statut === col.statut);
          return (
            <div
              key={col.statut}
              className={`rounded-lg border border-t-4 bg-muted/30 ${col.couleur}`}
            >
              <div className="flex items-center justify-between px-3 py-2">
                <h2 className="text-sm font-semibold">{STATUT_LABELS[col.statut]}</h2>
                <Badge variant="secondary">{items.length}</Badge>
              </div>
              <div className="space-y-2 p-2">
                {items.length === 0 ? (
                  <p className="px-1 py-4 text-center text-xs text-muted-foreground">
                    Aucun prospect.
                  </p>
                ) : (
                  items.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-md border bg-card p-3 shadow-sm"
                    >
                      <Link
                        href={`/candidats/${c.id}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {c.prenom} {c.nom}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        {c.ville && <span>{c.ville}</span>}
                        {c.financementType && (
                          <Badge variant="outline" className="text-[10px]">
                            {FINANCEMENT_LABELS[c.financementType]}
                          </Badge>
                        )}
                        {c._count.inscriptions > 0 && (
                          <Badge variant="outline" className="text-[10px]">
                            {c._count.inscriptions} inscription
                            {c._count.inscriptions > 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                      <StatutSelect id={c.id} statut={c.statut} />
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
