import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { NouvelleInscription } from "@/components/candidats/nouvelle-inscription";
import type { SessionOption } from "@/components/inscriptions/quick-enroll-modal";

export const dynamic = "force-dynamic";

export default async function NouveauCandidatPage() {
  const db = await getTenantDb();
  const [formations, collaborateurs, sessions] = await Promise.all([
    db.formation.findMany({
      // Uniquement les formations publiées sur le site vitrine.
      where: { isArchived: false, vitrineStatut: "PUBLIEE" },
      select: { id: true, titre: true, reference: true },
      orderBy: { titre: "asc" },
    }),
    db.user.findMany({
      where: {
        isActive: true,
        role: { in: ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"] },
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    // Sessions à venir → rattachement direct du candidat à une session (#1).
    db.session.findMany({
      where: { statut: { in: ["PLANIFIEE", "OUVERTE"] }, isArchived: false },
      include: { formation: { select: { id: true, titre: true } } },
      orderBy: { dateDebut: "asc" },
    }),
  ]);

  const fmtD = (d: Date) => d.toLocaleDateString("fr-FR");
  const sessionOptions: SessionOption[] = sessions.map((s) => ({
    id: s.id,
    formationId: s.formationId,
    label: `${s.formation.titre} — ${fmtD(s.dateDebut)} → ${fmtD(s.dateFin)}${s.lieu ? ` (${s.lieu})` : ""}`,
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/candidats"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Retour aux candidats
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Commencer une inscription</h1>
        <p className="text-sm text-muted-foreground">
          Renseignez les informations du candidat pour démarrer son inscription.
        </p>
      </div>

      <div className="max-w-3xl">
        <NouvelleInscription formations={formations} collaborateurs={collaborateurs} sessions={sessionOptions} />
      </div>
    </div>
  );
}
