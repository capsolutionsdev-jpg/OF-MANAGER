import { notFound } from "next/navigation";
import { Building2, GraduationCap, FileText, Receipt } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { orgConfigFor } from "@/lib/org-identity";

export const dynamic = "force-dynamic";

const euro = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
const fmt = (d: Date | null) => (d ? d.toLocaleDateString("fr-FR") : "—");

const INSCR_BADGE: Record<string, string> = {
  EN_ATTENTE: "bg-amber-500/10 text-amber-700",
  VALIDEE: "bg-emerald-500/10 text-emerald-700",
  ANNULEE: "bg-red-500/10 text-red-700",
  TERMINEE: "bg-blue-500/10 text-blue-700",
};

export default async function PortailPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const ent = await prisma.entreprise.findFirst({
    where: { portalToken: token },
    include: {
      inscriptions: {
        include: {
          candidat: { select: { prenom: true, nom: true } },
          session: { include: { formation: { select: { titre: true } } } },
        },
        orderBy: { createdAt: "desc" },
      },
      conventions: { orderBy: { createdAt: "desc" } },
      devis: { orderBy: { dateEmission: "desc" } },
      factures: { orderBy: { dateEmission: "desc" } },
    },
  });
  if (!ent) notFound();

  const org = await orgConfigFor(ent.organismeId);

  return (
    <div className="min-h-screen bg-muted/40 py-8">
      <div className="mx-auto max-w-4xl space-y-5 px-4">
        <header className="flex items-center justify-between gap-4 rounded-lg border bg-background p-4">
          <div className="flex items-center gap-3">
            {org.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={org.logoUrl} alt={org.name} className="h-10 w-auto" />
            ) : (
              <Building2 className="h-8 w-8 text-primary" />
            )}
            <div>
              <p className="text-sm text-muted-foreground">Espace client · {org.name}</p>
              <h1 className="text-lg font-bold">{ent.raisonSociale}</h1>
            </div>
          </div>
          <span className="hidden text-xs text-muted-foreground sm:block">Accès lecture seule</span>
        </header>

        {/* Salariés en formation */}
        <section className="rounded-lg border bg-background">
          <div className="flex items-center gap-2 border-b px-4 py-2.5 text-sm font-semibold">
            <GraduationCap className="h-4 w-4" /> Salariés en formation ({ent.inscriptions.length})
          </div>
          {ent.inscriptions.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">Aucune inscription.</p>
          ) : (
            <div className="divide-y">
              {ent.inscriptions.map((i) => (
                <div key={i.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{i.candidat.prenom} {i.candidat.nom}</p>
                    <p className="truncate text-xs text-muted-foreground">{i.session.formation.titre}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground">{fmt(i.session.dateDebut)} → {fmt(i.session.dateFin)}</span>
                    <span className={`rounded-full px-2 py-0.5 font-medium ${INSCR_BADGE[i.statut] ?? "bg-muted"}`}>
                      {i.statut}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Conventions */}
        <section className="rounded-lg border bg-background">
          <div className="flex items-center gap-2 border-b px-4 py-2.5 text-sm font-semibold">
            <FileText className="h-4 w-4" /> Conventions ({ent.conventions.length})
          </div>
          {ent.conventions.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">Aucune convention.</p>
          ) : (
            <div className="divide-y">
              {ent.conventions.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
                  <span className="font-medium">{c.reference}</span>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {c.montant != null && <span>{euro(Number(c.montant))}</span>}
                    <span>{c.dateSignature ? `Signée le ${fmt(c.dateSignature)}` : "En attente"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Devis & Factures */}
        <div className="grid gap-5 sm:grid-cols-2">
          <section className="rounded-lg border bg-background">
            <div className="flex items-center gap-2 border-b px-4 py-2.5 text-sm font-semibold">
              <FileText className="h-4 w-4" /> Devis ({ent.devis.length})
            </div>
            {ent.devis.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">Aucun devis.</p>
            ) : (
              <div className="divide-y">
                {ent.devis.map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
                    <span className="font-medium">{d.reference}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">{euro(Number(d.montantTTC))}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-lg border bg-background">
            <div className="flex items-center gap-2 border-b px-4 py-2.5 text-sm font-semibold">
              <Receipt className="h-4 w-4" /> Factures ({ent.factures.length})
            </div>
            {ent.factures.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">Aucune facture.</p>
            ) : (
              <div className="divide-y">
                {ent.factures.map((f) => (
                  <div key={f.id} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
                    <span className="font-medium">{f.reference}</span>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="tabular-nums text-muted-foreground">{euro(Number(f.montantTTC))}</span>
                      <span className={`rounded-full px-2 py-0.5 font-medium ${f.statut === "PAYEE" ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700"}`}>
                        {f.statut}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Espace fourni par {org.name} · {org.email} · Accès en lecture seule.
        </p>
      </div>
    </div>
  );
}
