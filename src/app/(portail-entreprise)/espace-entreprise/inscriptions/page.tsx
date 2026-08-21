import { ClipboardList, CalendarDays, MapPin } from "lucide-react";
import { requireEntreprise } from "@/lib/entreprise-portal";
import { getEntrepriseInscriptions } from "@/lib/entreprise-data";
import { sessionPhase } from "@/lib/candidat-portal";
import { RubriqueHeader, EmptyState, InscriptionBadge, fmtDate } from "@/components/entreprise/portal-ui";

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
  const inscriptions = await getEntrepriseInscriptions(entreprise.id);

  const groups: Record<"EN_COURS" | "AVENIR" | "TERMINEE", Inscription[]> = {
    EN_COURS: [],
    AVENIR: [],
    TERMINEE: [],
  };
  for (const i of inscriptions) {
    groups[sessionPhase(i.session.dateDebut, i.session.dateFin)].push(i);
  }

  return (
    <div className="space-y-6">
      <RubriqueHeader
        title="Inscriptions"
        subtitle="Les inscriptions de vos salariés, classées par période."
      />
      {inscriptions.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-8 w-8" />}
          title="Aucune inscription"
          hint="Les inscriptions de vos salariés apparaîtront ici une fois enregistrées par votre organisme."
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
