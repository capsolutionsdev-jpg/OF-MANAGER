import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { ExportMenu } from "@/components/export-menu";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import {
  CandidatsTable,
  type CandidatRow,
} from "@/components/candidats/candidats-table";
import type { SessionOption } from "@/components/inscriptions/quick-enroll-modal";

export const dynamic = "force-dynamic";

export default async function CandidatsPage() {
  const db = await getTenantDb();
  const [candidats, sessions] = await Promise.all([
    db.candidat.findMany({
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
      include: {
        formationSouhaitee: { select: { id: true, titre: true } },
      },
    }),
    db.session.findMany({
      where: { statut: { in: ["PLANIFIEE", "OUVERTE", "EN_COURS"] } },
      include: { formation: { select: { id: true, titre: true } } },
      orderBy: { dateDebut: "asc" },
    }),
  ]);

  const fmt = (d: Date) => d.toLocaleDateString("fr-FR");

  const sessionOptions: SessionOption[] = sessions.map((s) => ({
    id: s.id,
    formationId: s.formationId,
    label: `${s.formation.titre} — ${fmt(s.dateDebut)} → ${fmt(s.dateFin)}${
      s.lieu ? ` (${s.lieu})` : ""
    }`,
  }));

  const rows: CandidatRow[] = candidats.map((c) => ({
    id: c.id,
    prenom: c.prenom,
    nom: c.nom,
    photoUrl: c.photoUrl,
    email: c.email,
    telephone: c.telephone,
    ville: c.ville,
    statut: c.statut,
    formationSouhaitee: c.formationSouhaitee?.titre ?? null,
    formationSouhaiteeId: c.formationSouhaiteeId,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Candidats"
        subtitle={`${candidats.length} candidat${candidats.length > 1 ? "s" : ""} enregistré${candidats.length > 1 ? "s" : ""}`}
      >
        {candidats.length > 0 && <ExportMenu href="/candidats/export" />}
        <Button render={<Link href="/candidats/nouveau" />}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau candidat
        </Button>
      </PageHeader>

      {candidats.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title="Aucun candidat pour le moment"
            description="Créez votre premier candidat : son dossier, ses pièces et ses inscriptions se gèrent ensuite depuis sa fiche."
            actionLabel="Créer un candidat"
            actionHref="/candidats/nouveau"
          />
        </Card>
      ) : (
        <CandidatsTable candidats={rows} sessions={sessionOptions} />
      )}
    </div>
  );
}
