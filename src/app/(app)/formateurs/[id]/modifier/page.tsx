import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { FormateurForm } from "@/components/formateurs/formateur-form";

export default async function ModifierFormateurPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const db = await getTenantDb();
  const { id } = await params;
  const [f, formations] = await Promise.all([
    db.formateur.findUnique({
      where: { id },
      include: { formations: { select: { id: true } } },
    }),
    db.formation.findMany({
      where: { isArchived: false },
      orderBy: { titre: "asc" },
      select: { id: true, titre: true, academy: true },
    }),
  ]);
  if (!f) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/formateurs/${id}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Retour à la fiche
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">
          Modifier — {f.prenom} {f.nom}
        </h1>
      </div>
      <div className="max-w-3xl">
        <FormateurForm
          formateurId={f.id}
          formations={formations}
          defaultValues={{
            nom: f.nom,
            prenom: f.prenom,
            email: f.email ?? "",
            telephone: f.telephone ?? "",
            specialites: f.specialites ?? "",
            experienceAnnees:
              f.experienceAnnees != null ? String(f.experienceAnnees) : "",
            adresse: f.adresse ?? "",
            siret: f.siret ?? "",
            tarifJournalier:
              f.tarifJournalier != null ? String(f.tarifJournalier) : "",
            academies: f.academies,
            typeContrat: f.typeContrat,
            formationIds: f.formations.map((x) => x.id),
          }}
        />
      </div>
    </div>
  );
}
