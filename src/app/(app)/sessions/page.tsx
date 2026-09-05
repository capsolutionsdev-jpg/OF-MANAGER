import Link from "next/link";
import { Plus, CalendarDays } from "lucide-react";
import { ExportMenu } from "@/components/export-menu";
import { getTenantDb } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ACADEMY_LABELS } from "@/lib/validators/formation";
import {
  SessionsTable,
  type SessionRow,
  type SessionEtat,
} from "@/components/sessions/sessions-table";

export const dynamic = "force-dynamic";

export default async function SessionsPage() {
  const db = await getTenantDb();
  const sessions = await db.session.findMany({
    orderBy: { dateDebut: "asc" },
    include: {
      formation: true,
      formateurs: { select: { prenom: true, nom: true } },
      _count: { select: { inscriptions: true } },
    },
  });

  const now = new Date();

  function etat(s: (typeof sessions)[number]): SessionEtat {
    if (s.statut === "ANNULEE") return "ARCHIVEE";
    if (s.dateFin < now) return "PASSEE";
    if (s.dateDebut > now) return "AVENIR";
    return "ENCOURS";
  }

  // Lignes aplaties (sérialisables) pour la table filtrable cliente :
  // filtrage / tri / pagination se font côté client sur ces données déjà chargées.
  const rows: SessionRow[] = sessions.map((s) => ({
    id: s.id,
    formationTitre: s.formation.titre,
    academyKey: s.formation.academy ?? "AUTRE",
    academyLabel: s.formation.academy ? ACADEMY_LABELS[s.formation.academy] : "Non classée",
    dateDebut: s.dateDebut.toISOString(),
    dateFin: s.dateFin.toISOString(),
    formateurs: s.formateurs.map((f) => `${f.prenom} ${f.nom}`).join(", "),
    lieu: s.lieu,
    modalite: s.modalite,
    nbPlaces: s.nbPlaces,
    inscriptions: s._count.inscriptions,
    statut: s.statut,
    etat: etat(s),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        icon={CalendarDays}
        title="Sessions"
        subtitle={
          <>
            <span className="font-semibold text-primary">
              {sessions.length} session{sessions.length > 1 ? "s" : ""}
            </span>{" "}
            au total
          </>
        }
      >
        {sessions.length > 0 && <ExportMenu href="/sessions/export" />}
        <Button render={<Link href="/sessions/nouvelle" />}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle session
        </Button>
      </PageHeader>

      {sessions.length === 0 ? (
        <Card>
          <EmptyState
            icon={CalendarDays}
            title="Aucune session programmée"
            description="Planifiez votre première session de formation : dates, salle, formateur et inscriptions se gèrent ensuite depuis sa fiche."
            actionLabel="Planifier une session"
            actionHref="/sessions/nouvelle"
          />
        </Card>
      ) : (
        <SessionsTable rows={rows} />
      )}
    </div>
  );
}
