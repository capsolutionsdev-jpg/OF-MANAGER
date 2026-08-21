import { Inbox, Building2, CalendarDays, CalendarClock } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { DemandeActions } from "@/components/demandes/demande-actions";

export const dynamic = "force-dynamic";

type Salarie = { candidatId?: string; nom?: string; prenom?: string };

export default async function DemandesInscriptionPage() {
  const db = await getTenantDb();
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const [demandes, sessionsRaw] = await Promise.all([
    db.demandeInscription.findMany({
      where: { statut: { in: ["EN_ATTENTE", "CONTRE_PROPOSEE"] } },
      include: {
        entreprise: { select: { raisonSociale: true } },
        session: { select: { dateDebut: true, lieu: true, formation: { select: { titre: true } } } },
        sessionProposee: { select: { dateDebut: true, lieu: true, formation: { select: { titre: true } } } },
      },
      orderBy: { createdAt: "asc" },
    }),
    db.session.findMany({
      where: { isArchived: false, statut: { in: ["PLANIFIEE", "OUVERTE"] }, dateDebut: { gte: start } },
      select: { id: true, dateDebut: true, lieu: true, formation: { select: { titre: true } } },
      orderBy: { dateDebut: "asc" },
      take: 100,
    }),
  ]);

  const fmt = (d: Date) => d.toLocaleDateString("fr-FR");
  const sessionOptions = sessionsRaw.map((s) => ({
    id: s.id,
    label: `${s.formation.titre} — ${fmt(s.dateDebut)}${s.lieu ? ` (${s.lieu})` : ""}`,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Demandes d&apos;inscription</h1>
        <p className="text-sm text-muted-foreground">
          Les demandes envoyées par vos clients professionnels depuis leur espace. Confirmer crée la
          convention de groupe et les inscriptions ; vous pouvez aussi proposer une autre date.
        </p>
      </div>

      {demandes.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          <Inbox className="mx-auto mb-2 h-8 w-8" />
          <p>Aucune demande en attente.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {demandes.map((d) => {
            const salaries = (Array.isArray(d.salariesJson) ? d.salariesJson : []) as Salarie[];
            return (
              <div key={d.id} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 font-medium">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {d.entreprise.raisonSociale}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {d.session.formation.titre} — {fmt(d.session.dateDebut)}
                      {d.session.lieu ? ` (${d.session.lieu})` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {salaries.length} salarié{salaries.length > 1 ? "s" : ""} · demandé le {fmt(d.createdAt)}
                    </p>
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {salaries.map((s, i) => (
                        <li key={i} className="rounded bg-muted px-2 py-0.5 text-xs">
                          {s.prenom || s.nom ? `${s.prenom ?? ""} ${s.nom ?? ""}`.trim() : "Salarié"}
                          {!s.candidatId && <span className="ml-1 text-muted-foreground">(nouveau)</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {d.statut === "EN_ATTENTE" ? (
                    <DemandeActions demandeId={d.id} sessions={sessionOptions} />
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                      <CalendarClock className="h-3.5 w-3.5" />
                      En attente de réponse du client
                    </span>
                  )}
                </div>
                {d.statut === "CONTRE_PROPOSEE" && d.sessionProposee && (
                  <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
                    Autre date proposée :{" "}
                    <span className="font-medium">
                      {d.sessionProposee.formation.titre} — {fmt(d.sessionProposee.dateDebut)}
                      {d.sessionProposee.lieu ? ` (${d.sessionProposee.lieu})` : ""}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
