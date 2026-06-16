import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { SessionForm } from "@/components/sessions/session-form";

export default async function ModifierSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const db = await getTenantDb();
  const { id } = await params;
  const [s, formations, formateurs, salles] = await Promise.all([
    db.session.findUnique({
      where: { id },
      include: { formateurs: { select: { id: true } } },
    }),
    db.formation.findMany({
      where: { isArchived: false },
      orderBy: { titre: "asc" },
      select: { id: true, titre: true, reference: true },
    }),
    db.formateur.findMany({
      orderBy: { nom: "asc" },
      select: { id: true, nom: true, prenom: true, academies: true },
    }),
    db.salle.findMany({
      where: { actif: true },
      orderBy: { nom: "asc" },
      select: { id: true, nom: true },
    }),
  ]);
  if (!s) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/sessions/${id}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Retour à la session
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Modifier la session</h1>
      </div>

      <div className="max-w-3xl">
        <SessionForm
          formations={formations}
          formateurs={formateurs}
          salles={salles}
          sessionId={s.id}
          defaultValues={{
            formateurIds: s.formateurs.map((f) => f.id),
            formationId: s.formationId,
            reference: s.reference ?? "",
            dateDebut: s.dateDebut.toISOString().slice(0, 10),
            dateFin: s.dateFin.toISOString().slice(0, 10),
            horaires: s.horaires ?? "",
            lieu: s.lieu ?? "",
            dateExamen: s.dateExamen ? s.dateExamen.toISOString().slice(0, 10) : "",
            lieuExamen: s.lieuExamen ?? "",
            salleId: s.salleId ?? "",
            modalite: s.modalite,
            nbPlaces: String(s.nbPlaces),
            statut: s.statut,
            tarifFormateurJour:
              s.tarifFormateurJour != null ? String(s.tarifFormateurJour) : "",
          }}
        />
      </div>
    </div>
  );
}
