import { notFound, redirect } from "next/navigation";
import { getCandidatDetail } from "@/lib/candidats/detail";
import { getTenantDb } from "@/lib/tenant";
import { hasStrictFeature } from "@/lib/feature-guard";
import { t3pMetierOfFormation, type T3PMetier } from "@/lib/t3p";
import { CandidatDetailHeader } from "@/components/candidats/candidat-detail-header";
import { ParcoursT3PPanel, type ParcoursDto } from "@/components/t3p/parcours-t3p-panel";
import { CreerParcoursCard } from "@/components/t3p/creer-parcours-card";

/**
 * Onglet « Parcours T3P » de la fiche candidat : suivi des parcours d'examen
 * Taxi / VTC (CMA) — 11 étapes, épreuves, échéances réglementaires.
 */
export default async function CandidatParcoursT3PPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await hasStrictFeature("parcours-t3p"))) redirect("/dashboard");

  const { id } = await params;
  const detail = await getCandidatDetail(id);
  if (!detail) notFound();
  const { candidat } = detail;

  const db = await getTenantDb();
  const parcoursList = await db.parcoursT3P.findMany({
    where: { candidatId: id },
    include: {
      epreuves: { orderBy: [{ type: "asc" }, { tentative: "asc" }] },
      inscription: {
        select: {
          id: true,
          session: { select: { id: true, formation: { select: { titre: true } } } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // DTO client : Decimal → chaîne (sérialisation RSC).
  const parcoursDto: ParcoursDto[] = parcoursList.map((p) => ({
    ...p,
    fraisMontant: p.fraisMontant ? p.fraisMontant.toString() : null,
  }));

  // Métier suggéré pour l'ouverture (inscriptions puis formation souhaitée).
  const metierSuggere: T3PMetier | null =
    candidat.inscriptions
      .map((i) => t3pMetierOfFormation(i.session.formation))
      .find((m): m is T3PMetier => m !== null) ??
    (candidat.formationSouhaitee ? t3pMetierOfFormation(candidat.formationSouhaitee) : null);

  return (
    <div className="space-y-6">
      <CandidatDetailHeader candidat={candidat} active="parcours-t3p" t3pTab />

      {parcoursDto.map((p) => (
        <ParcoursT3PPanel key={p.id} parcours={p} />
      ))}

      <CreerParcoursCard
        candidatId={id}
        metierSuggere={metierSuggere}
        dejaCrees={parcoursDto.map((p) => p.metier)}
      />
    </div>
  );
}
