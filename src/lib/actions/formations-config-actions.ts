"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAllFormationSlugs } from "@/lib/formations-catalog";
import { CATALOGUE_SECURITE, normaliserTitre, type ModeleFormation } from "@/lib/catalogue-securite";

export type FormationsConfigResult = {
  ok: boolean;
  error?: string;
  /** Formations créées dans le catalogue du tenant lors de cette sauvegarde. */
  creees?: string[];
};

function champsDuModele(m: ModeleFormation) {
  return {
    titre: m.titre,
    dureeHeures: m.dureeHeures,
    dureeJours: Math.max(1, Math.ceil(m.dureeHeures / 7)),
    duree: m.duree,
    objectifs: m.objectifs,
    prerequis: m.prerequis,
    programme: m.programme,
    publicVise: m.publicVise,
    methodesPedagogiques: m.methodesPedagogiques,
    modalitesEvaluation: m.modalitesEvaluation,
    certification: m.certification,
  } as const;
}

/**
 * Console dev (SUPERADMIN) : enregistre les formations qu'un organisme utilise
 * et PROVISIONNE celles qui manquent dans son catalogue (création depuis le
 * modèle réglementaire — programme, examen, jury, pièces). On ne supprime ni ne
 * modifie jamais une formation existante du tenant : décocher retire seulement
 * la formation de la sélection (elle est masquée par le filtre côté app).
 */
export async function updateOrganismeFormations(
  organismeId: string,
  selectedSlugs: string[],
): Promise<FormationsConfigResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Non connecté." };
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, isActive: true },
  });
  if (!user?.isActive || user.role !== "SUPERADMIN") {
    return { ok: false, error: "Réservé au compte développeur." };
  }

  const validSlugs = new Set(getAllFormationSlugs());
  for (const slug of selectedSlugs) {
    if (!validSlugs.has(slug)) {
      return { ok: false, error: `Formation inconnue : ${slug}` };
    }
  }

  const org = await prisma.organisme.findUnique({
    where: { id: organismeId },
    select: { id: true },
  });
  if (!org) return { ok: false, error: "Organisme introuvable." };

  // ── Provisionnement : créer les formations cochées absentes du tenant ──
  const existantes = await prisma.formation.findMany({
    where: { organismeId, isArchived: false },
    select: { titre: true, reference: true },
  });
  const titresExistants = new Set(existantes.map((f) => normaliserTitre(f.titre)));
  const referencesExistantes = new Set(existantes.map((f) => f.reference));

  const creees: string[] = [];
  for (const slug of selectedSlugs) {
    const modele = CATALOGUE_SECURITE.find((m) => m.cle === slug);
    if (!modele) continue;

    const dejaLa = [modele.titre, ...modele.alias].some((t) =>
      titresExistants.has(normaliserTitre(t)),
    );
    if (dejaLa) continue;

    // reference unique PAR organisme : suffixe si collision interne.
    let reference = modele.reference;
    for (let n = 2; referencesExistantes.has(reference); n++) {
      reference = `${modele.reference}-${n}`;
    }

    await prisma.formation.create({
      data: {
        organismeId,
        ...champsDuModele(modele),
        reference,
        modalite: "PRESENTIEL",
        examen: modele.examen,
        soumisJury: modele.soumisJury,
        grilleInrs: modele.grilleInrs ?? null,
        piecesAttendues: modele.piecesAttendues,
        delaiAcces: "Inscription jusqu'à 48 h avant le démarrage de la session.",
      },
    });
    referencesExistantes.add(reference);
    titresExistants.add(normaliserTitre(modele.titre));
    creees.push(modele.titre);
  }

  await prisma.organisme.update({
    where: { id: organismeId },
    data: { configurationsFormations: selectedSlugs },
  });

  revalidatePath(`/console/${organismeId}`);
  return { ok: true, creees };
}
