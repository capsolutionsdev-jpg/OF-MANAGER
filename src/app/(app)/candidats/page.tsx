import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
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
        <Button render={<Link href="/candidats/nouveau" />}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau candidat
        </Button>
      </PageHeader>

      {candidats.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-2 p-12 text-center">
            <Users className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">Aucun candidat pour le moment</p>
            <p className="text-sm text-muted-foreground">
              Commencez par créer votre premier candidat.
            </p>
          </div>
        </Card>
      ) : (
        <CandidatsTable candidats={rows} sessions={sessionOptions} />
      )}
    </div>
  );
}
