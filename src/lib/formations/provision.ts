import { BIBLIOTHEQUE_FORMATIONS, migrerSlugs } from "@/lib/formations-catalog";
import { normaliserTitre, type ModeleFormation } from "@/lib/catalogue-securite";

/**
 * Client Prisma minimal accepté par le provisionnement — permet de réutiliser la
 * même logique depuis un Server Action (client étendu `@/lib/prisma`) et depuis un
 * script de maintenance (`new PrismaClient()`).
 *
 * Signatures en syntaxe MÉTHODE (paramètres bivariants) pour que les deux clients
 * Prisma, dont les types d'arguments sont plus spécifiques, restent assignables.
 */
type ProvisionDb = {
  formation: {
    findMany(args: {
      where: { organismeId: string; isArchived: boolean };
      select: { titre: true; reference: true };
    }): Promise<{ titre: string; reference: string }[]>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    create(args: { data: any }): Promise<unknown>;
  };
  organisme: {
    update(args: {
      where: { id: string };
      data: { configurationsFormations: string[] };
    }): Promise<unknown>;
  };
};

export type ProvisionResult = {
  /** Titres des formations créées dans le catalogue du tenant. */
  creees: string[];
  /** Identifiants ignorés (inconnus même après migration). */
  ignores: string[];
  /** Clés retenues et enregistrées dans la configuration (migrées + connues). */
  retenues: string[];
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
 * Enregistre les formations qu'un organisme utilise et PROVISIONNE celles qui
 * manquent dans son catalogue (création depuis le modèle réglementaire — programme,
 * examen, jury, grille INRS, pièces).
 *
 * - Les identifiants sont d'abord MIGRÉS (table d'alias) puis filtrés aux clés
 *   connues : une config héritée d'une ancienne version reste valide au lieu
 *   d'être silencieusement ignorée.
 * - On ne supprime ni ne modifie jamais une formation existante du tenant :
 *   décocher retire seulement la formation de la sélection (masquée par le filtre
 *   côté app, cf. lib/get-formations-for-organisme).
 */
export async function provisionnerFormations(
  db: ProvisionDb,
  organismeId: string,
  selectedSlugs: string[],
): Promise<ProvisionResult> {
  const parCle = new Map(BIBLIOTHEQUE_FORMATIONS.map((m) => [m.cle, m]));
  const slugsUniques = [...new Set(selectedSlugs)];
  // Migration + filtrage aux clés connues (auto-répare les anciens identifiants).
  const retenues = migrerSlugs(slugsUniques);
  const ignores = slugsUniques.filter((s) => !migrerSlugs([s]).length);

  // ── Provisionnement : créer les formations retenues absentes du tenant ──
  const existantes = await db.formation.findMany({
    where: { organismeId, isArchived: false },
    select: { titre: true, reference: true },
  });
  const titresExistants = new Set(existantes.map((f) => normaliserTitre(f.titre)));
  const referencesExistantes = new Set(existantes.map((f) => f.reference));

  const creees: string[] = [];
  for (const cle of retenues) {
    const modele = parCle.get(cle)!;

    const dejaLa = [modele.titre, ...modele.alias].some((t) =>
      titresExistants.has(normaliserTitre(t)),
    );
    if (dejaLa) continue;

    // reference unique PAR organisme : suffixe si collision interne.
    let reference = modele.reference;
    for (let n = 2; referencesExistantes.has(reference); n++) {
      reference = `${modele.reference}-${n}`;
    }

    await db.formation.create({
      data: {
        organismeId,
        ...champsDuModele(modele),
        reference,
        modalite: "PRESENTIEL",
        examen: modele.examen,
        soumisJury: modele.soumisJury,
        nbJury: modele.soumisJury ? (modele.nbJury ?? null) : null,
        grilleInrs: modele.grilleInrs ?? null,
        piecesAttendues: modele.piecesAttendues,
        delaiAcces: "Inscription jusqu'à 48 h avant le démarrage de la session.",
      },
    });
    referencesExistantes.add(reference);
    titresExistants.add(normaliserTitre(modele.titre));
    creees.push(modele.titre);
  }

  await db.organisme.update({
    where: { id: organismeId },
    data: { configurationsFormations: retenues },
  });

  return { creees, ignores, retenues };
}
