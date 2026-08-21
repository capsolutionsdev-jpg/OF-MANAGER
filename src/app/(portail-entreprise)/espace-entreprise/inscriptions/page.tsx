import { ClipboardList, CalendarDays, MapPin, Send } from "lucide-react";
import { requireEntreprise } from "@/lib/entreprise-portal";
import { getEntrepriseInscriptions, getEntrepriseDemandes } from "@/lib/entreprise-data";
import { sessionPhase } from "@/lib/candidat-portal";
import { RubriqueHeader, EmptyState, InscriptionBadge, DemandeBadge, fmtDate } from "@/components/entreprise/portal-ui";
import { ContrePropositionActions } from "@/components/entreprise/contre-proposition-actions";

export const dynamic = "force-dynamic";

type Inscription = Awaited<ReturnType<typeof getEntrepriseInscriptions>>[number];

function Row({ i }: { i: Inscription }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 rounded-xl border bg-card p-4">
      <div className="min-w-0">
        <p className="font-medium">
          {i.candidat.prenom} {i.candidat.nom}
        </p>
        <p className="text-sm text-muted-foreground">{i.session.formation.titre}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {fmtDate(i.session.dateDebut)} → {fmtDate(i.session.dateFin)}
          </span>
          {i.session.lieu && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {i.session.lieu}
            </span>
          )}
        </div>
      </div>
      <InscriptionBadge statut={i.statut} />
    </div>
  );
}

function Section({ title, items }: { title: string; items: Inscription[] }) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground">
        {title} <span className="font-normal">({items.length})</span>
      </h3>
      <div className="grid gap-2">
        {items.map((i) => (
          <Row key={i.id} i={i} />
        ))}
      </div>
    </section>
  );
}

export default async function InscriptionsPage() {
  const entreprise = await requireEntreprise();
  const [inscriptions, demandes] = await Promise.all([
    getEntrepriseInscriptions(entreprise.id),
    getEntrepriseDemandes(entreprise.id),
  ]);

  const groups: Record<"EN_COURS" | "AVENIR" | "TERMINEE", Inscription[]> = {
    EN_COURS: [],
    AVENIR: [],
    TERMINEE: [],
  };
  for (const i of inscriptions) {
    groups[sessionPhase(i.session.dateDebut, i.session.dateFin)].push(i);
  }

  // On masque les demandes déjà confirmées (elles deviennent des inscriptions).
  const demandesVisibles = demandes.filter((d) => d.statut !== "CONFIRMEE");

  return (
    <div className="space-y-6">
      <RubriqueHeader
        title="Inscriptions"
        subtitle="Vos demandes en cours de traitement et les inscriptions de vos salariés."
      />

      {demandesVisibles.length > 0 && (
        <section className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
            <Send className="h-3.5 w-3.5" /> Demandes d&apos;inscription
          </h3>
          <div className="grid gap-2">
            {demandesVisibles.map((d) => {
              const nb = Array.isArray(d.salariesJson) ? d.salariesJson.length : 0;
              return (
                <div key={d.id} className="rounded-xl border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">{d.session.formation.titre}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmtDate(d.session.dateDebut)} · {nb} salarié{nb > 1 ? "s" : ""} · demandé le {fmtDate(d.createdAt)}
                      </p>
                      {d.statut === "REFUSEE" && d.motif && (
                        <p className="mt-1 text-xs text-destructive">Motif : {d.motif}</p>
                      )}
                    </div>
                    <DemandeBadge statut={d.statut} />
                  </div>
                  {d.statut === "CONTRE_PROPOSEE" && d.sessionProposee && (
                    <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
                      <p className="text-sm font-medium">Votre organisme vous propose une autre date :</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {d.sessionProposee.formation.titre} — {fmtDate(d.sessionProposee.dateDebut)}
                        {d.sessionProposee.lieu ? ` (${d.sessionProposee.lieu})` : ""}
                      </p>
                      <div className="mt-2 flex justify-end">
                        <ContrePropositionActions demandeId={d.id} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {inscriptions.length === 0 && demandesVisibles.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-8 w-8" />}
          title="Aucune inscription"
          hint="Depuis l'onglet Formations, demandez l'inscription de vos salariés à une session."
        />
      ) : (
        <>
          <Section title="En cours" items={groups.EN_COURS} />
          <Section title="À venir" items={groups.AVENIR} />
          <Section title="Passées" items={groups.TERMINEE} />
        </>
      )}
    </div>
  );
}
