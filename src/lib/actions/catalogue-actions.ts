"use server";

import { revalidatePath } from "next/cache";
import { getTenantDb } from "@/lib/tenant";
import { auth } from "@/auth";
import { getCurrentOrganisme } from "@/lib/org";
import {
  CATALOGUE_SECURITE,
  normaliserTitre,
  type ModeleFormation,
} from "@/lib/catalogue-securite";

const STAFF = ["ADMIN", "RESPONSABLE_FORMATION"];

export type ImportRapport = {
  ok: boolean;
  error?: string;
  creees: string[];
  completees: { titre: string; champs: string[] }[];
  inchangees: string[];
};

/** Champs du modèle repris dans la formation (clé Prisma → valeur du modèle). */
function champsDuModele(m: ModeleFormation) {
  return {
    titre: m.titre,
    dureeHeures: m.dureeHeures,
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

/** Une valeur existante est-elle « vide » (donc complétable sans rien écraser) ? */
function estVide(v: unknown): boolean {
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "");
}

/**
 * Importe le catalogue de référence sécurité (SSIAP / SST / APS) dans le
 * catalogue de l'organisme connecté.
 *
 * Principe de sûreté : on ne REMPLACE jamais une donnée saisie par l'organisme.
 * - formation absente        → créée depuis le modèle ;
 * - formation existante      → seuls les champs VIDES sont complétés ;
 * - réglages (examen, jury, grille INRS, pièces) → posés uniquement s'ils sont
 *   à leur valeur par défaut (false / null / liste vide).
 */
export async function importerCatalogueSecurite(
  cles?: string[],
): Promise<ImportRapport> {
  const vide: ImportRapport = { ok: false, creees: [], completees: [], inchangees: [] };
  const session = await auth();
  if (!session?.user || !STAFF.includes(session.user.role as string)) {
    return { ...vide, error: "Non autorisé." };
  }
  const org = await getCurrentOrganisme();
  if (!org) return { ...vide, error: "Organisme introuvable." };

  const db = await getTenantDb();
  const modeles = cles?.length
    ? CATALOGUE_SECURITE.filter((m) => cles.includes(m.cle))
    : CATALOGUE_SECURITE;

  // Catalogue actuel de l'organisme (rapprochement par intitulé normalisé).
  const existantes = await db.formation.findMany({
    where: { isArchived: false },
    select: {
      id: true, titre: true, reference: true, dureeHeures: true, duree: true,
      objectifs: true, prerequis: true, programme: true, publicVise: true,
      methodesPedagogiques: true, modalitesEvaluation: true, certification: true,
      examen: true, soumisJury: true, grilleInrs: true, piecesAttendues: true,
    },
  });
  const parTitre = new Map(existantes.map((f) => [normaliserTitre(f.titre), f]));

  const rapport: ImportRapport = { ok: true, creees: [], completees: [], inchangees: [] };

  for (const m of modeles) {
    const cibles = [m.titre, ...m.alias].map(normaliserTitre);
    const existante = cibles.map((t) => parTitre.get(t)).find(Boolean);

    // ── Formation absente → création complète ──
    if (!existante) {
      // `reference` est unique GLOBALEMENT (tous organismes) : on suffixe en cas
      // de collision avec un autre tenant.
      let reference = m.reference;
      for (let n = 2; await db.formation.findFirst({ where: { reference }, select: { id: true } }); n++) {
        reference = `${m.reference}-${n}`;
      }
      await db.formation.create({
        data: {
          ...champsDuModele(m),
          reference,
          modalite: "PRESENTIEL",
          examen: m.examen,
          soumisJury: m.soumisJury,
          grilleInrs: m.grilleInrs ?? null,
          piecesAttendues: m.piecesAttendues,
          delaiAcces: "Inscription jusqu'à 48 h avant le démarrage de la session.",
        },
      });
      rapport.creees.push(m.titre);
      continue;
    }

    // ── Formation existante → on complète UNIQUEMENT les champs vides ──
    const maj: Record<string, unknown> = {};
    const champsMaj: string[] = [];
    const modele = champsDuModele(m);
    for (const [cle, valeur] of Object.entries(modele)) {
      if (cle === "titre") continue; // on ne renomme jamais une formation existante
      if (estVide((existante as Record<string, unknown>)[cle])) {
        maj[cle] = valeur;
        champsMaj.push(cle);
      }
    }
    // Réglages : posés seulement s'ils sont encore à la valeur par défaut.
    if (m.examen && existante.examen === false) { maj.examen = true; champsMaj.push("examen"); }
    if (m.soumisJury && existante.soumisJury === false) { maj.soumisJury = true; champsMaj.push("soumisJury"); }
    if (m.grilleInrs && !existante.grilleInrs) { maj.grilleInrs = m.grilleInrs; champsMaj.push("grilleInrs"); }
    if (existante.piecesAttendues.length === 0 && m.piecesAttendues.length > 0) {
      maj.piecesAttendues = m.piecesAttendues;
      champsMaj.push("piecesAttendues");
    }

    if (champsMaj.length === 0) {
      rapport.inchangees.push(existante.titre);
      continue;
    }
    await db.formation.update({ where: { id: existante.id }, data: maj });
    rapport.completees.push({ titre: existante.titre, champs: champsMaj });
  }

  revalidatePath("/formations");
  return rapport;
}
