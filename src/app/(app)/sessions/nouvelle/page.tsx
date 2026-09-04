import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireTenant } from "@/lib/tenant";
import { orgConfigFor } from "@/lib/org-identity";
import { filterFormationsByOrgConfig } from "@/lib/get-formations-for-organisme";
import { parseAnimation } from "@/lib/formateurs/animation";
import { SessionForm } from "@/components/sessions/session-form";
import { Card } from "@/components/ui/card";

export default async function NouvelleSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { db, organismeId } = await requireTenant();
  const org = await orgConfigFor(organismeId);
  const { from } = await searchParams;

  const [allFormations, formateurs, salles, jurys, source] = await Promise.all([
    db.formation.findMany({
      where: { isArchived: false },
      orderBy: { titre: "asc" },
      select: { id: true, titre: true, reference: true, soumisJury: true, nbJury: true, examen: true, academy: true },
    }),
    db.formateur.findMany({
      orderBy: { nom: "asc" },
      select: { id: true, nom: true, prenom: true, academies: true, typeContrat: true },
    }),
    db.salle.findMany({
      where: { actif: true },
      orderBy: { nom: "asc" },
      select: { id: true, nom: true },
    }),
    db.jury.findMany({
      where: { actif: true },
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
      select: { id: true, nom: true, prenom: true, qualite: true, formationsValidables: true, actif: true },
    }),
    // Duplication : on ne récupère QUE si la session appartient à l'organisme (isolation).
    from
      ? db.session.findFirst({
          where: { id: from, organismeId },
          include: {
            formateurs: { select: { id: true } },
            juryAffectations: { select: { juryId: true, prixCents: true, natureExamen: true } },
          },
        })
      : Promise.resolve(null),
  ]);

  // Filtrer les formations selon la config de l'organisme
  const formations = await filterFormationsByOrgConfig(organismeId, allFormations);

  const duplicating = !!source;
  // Duplication : on reprend TOUT (formation, formateurs, jury, lieu, horaires,
  // modalité, places, tarif) SAUF les dates, la référence et le statut, que
  // l'utilisateur repositionne pour la nouvelle session.
  const defaultValues = source
    ? {
        formateurIds: source.formateurs.map((f) => f.id),
        formateursAnimation: parseAnimation(source.formateursAnimation),
        jurys: source.juryAffectations.map((a) => ({
          juryId: a.juryId,
          prixEuros: a.prixCents ? (a.prixCents / 100).toFixed(2) : "",
          natureExamen: a.natureExamen ?? "",
        })),
        formationId: source.formationId,
        reference: "",
        dateDebut: "",
        dateFin: "",
        horaires: source.horaires ?? "",
        lieu: source.lieu ?? "",
        dateExamen: "",
        lieuExamen: source.lieuExamen ?? "",
        salleId: source.salleId ?? "",
        modalite: source.modalite,
        nbPlaces: String(source.nbPlaces),
        tarifFormateurJour:
          source.tarifFormateurJour != null ? String(source.tarifFormateurJour) : "",
      }
    : undefined;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/sessions"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Retour aux sessions
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">
          {duplicating ? "Dupliquer la session" : "Nouvelle session"}
        </h1>
        {duplicating && (
          <p className="mt-1 text-sm text-muted-foreground">
            Tous les paramètres ont été repris. Indiquez les nouvelles dates avant d&apos;enregistrer.
          </p>
        )}
      </div>

      <div className="max-w-3xl">
        {formations.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Vous devez d&apos;abord créer une formation au catalogue.{" "}
            <Link href="/formations/nouvelle" className="text-primary hover:underline">
              Créer une formation
            </Link>
          </Card>
        ) : (
          <SessionForm
            formations={formations}
            formateurs={formateurs}
            salles={salles}
            jurys={jurys}
            defaultValues={defaultValues}
            defaultLieu={org.adresse}
          />
        )}
      </div>
    </div>
  );
}
