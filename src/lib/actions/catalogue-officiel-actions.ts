"use server";

import { revalidatePath } from "next/cache";
import type { Academy, Modalite } from "@prisma/client";
import { getTenantDb } from "@/lib/tenant";
import { auth } from "@/auth";
import { getCurrentOrganisme } from "@/lib/org";
import catalogue from "@/lib/data/catalogue-officiel.json";

/**
 * Import du CATALOGUE OFFICIEL de référence (exact et conforme Qualiopi).
 * Contrairement à `importerCatalogueSecurite` (bibliothèque générique, non
 * destructive), cette action est SPÉCIFIQUE à l'organisme de la vitrine :
 *  - crée/complète les 30 formations officielles (Sécurité + Transport) ;
 *  - MET À JOUR les fiches existantes avec les données officielles (le tarif et le
 *    numéro d'agrément propres à l'organisme ne sont pas touchés) ;
 *  - ARCHIVE (réversible, ne supprime pas) les formations hors catalogue officiel.
 * Réservée à l'ADMIN et au tenant de la vitrine (garde `VITRINE_ORGANISME_ID`).
 */

export type ImportOfficielRapport = {
  ok: boolean;
  error?: string;
  creees: string[];
  misesAJour: string[];
  archivees: string[];
};

type Modele = (typeof catalogue)[number];

function heuresDe(duree: string | null): number | null {
  if (!duree) return null;
  const m = duree.match(/(\d+)\s*h/i);
  return m ? parseInt(m[1], 10) : null;
}
function joursDe(duree: string | null, heures: number | null): number | null {
  const m = duree?.match(/(\d+)\s*jour/i);
  if (m) return parseInt(m[1], 10);
  return heures ? Math.max(1, Math.ceil(heures / 7)) : null; // standard 7 h/jour
}

/** Champs officiels repris dans la formation (hors tarif / agrément = propres à l'OF). */
function champs(m: Modele) {
  const heures = heuresDe(m.duree);
  return {
    titre: m.titre,
    academy: m.academy as Academy,
    modalite: m.modalite as Modalite,
    duree: m.duree,
    dureeHeures: heures,
    dureeJours: joursDe(m.duree, heures),
    objectifs: m.objectifs,
    programme: m.programme,
    prerequis: m.prerequis,
    publicVise: m.publicVise,
    methodesPedagogiques: m.methodesPedagogiques,
    modalitesEvaluation: m.modalitesEvaluation,
    certification: m.certification,
    conditionsAcces: m.conditionsAcces,
    delaiAcces: m.delaiAcces ?? "Inscription jusqu'à 48 h avant le démarrage de la session.",
    examen: m.examen,
    diplomante: m.diplomante,
    // Jury : examens de sécurité (SSIAP/TFP-APS/A3P…) passent devant un jury ;
    // les examens transport (VTC/Taxi) sont gérés par la CMA.
    soumisJury: m.examen && m.academy === "SAFETY",
    vitrineTagline: m.vitrineTagline,
    vitrineDescription: m.vitrineDescription,
    vitrineCompetences: m.vitrineCompetences,
    vitrineValidite: m.vitrineValidite,
    vitrineModalites: m.vitrineModalites,
  };
}

export async function importerCatalogueOfficiel(): Promise<ImportOfficielRapport> {
  const vide: ImportOfficielRapport = { ok: false, creees: [], misesAJour: [], archivees: [] };

  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { ...vide, error: "Action réservée à l'administrateur." };
  }
  const org = await getCurrentOrganisme();
  if (!org) return { ...vide, error: "Organisme introuvable." };

  // Garde tenant : ce catalogue est propre à l'organisme de la vitrine.
  const vitrineId = process.env.VITRINE_ORGANISME_ID;
  if (vitrineId && org.id !== vitrineId) {
    return { ...vide, error: "Le catalogue officiel est réservé à l'organisme de la vitrine." };
  }

  const db = await getTenantDb();
  const officialRefs = new Set(catalogue.map((m) => m.reference));
  const existantes = await db.formation.findMany({
    select: { id: true, titre: true, reference: true, isArchived: true },
  });
  const parRef = new Map(existantes.map((f) => [f.reference, f]));

  const creees: string[] = [];
  const misesAJour: string[] = [];

  for (const m of catalogue) {
    const c = champs(m);
    const ex = parRef.get(m.reference);
    if (!ex) {
      await db.formation.create({
        data: { ...c, reference: m.reference, vitrineStatut: "PUBLIEE", piecesAttendues: [], isArchived: false },
      });
      creees.push(m.titre);
    } else {
      // Mise à jour avec les données officielles (réactive la fiche si archivée).
      await db.formation.update({ where: { id: ex.id }, data: { ...c, isArchived: false } });
      misesAJour.push(m.titre);
    }
  }

  // Archivage (réversible) des formations hors catalogue officiel.
  const aArchiver = existantes.filter((f) => !officialRefs.has(f.reference) && !f.isArchived);
  if (aArchiver.length > 0) {
    await db.formation.updateMany({
      where: { id: { in: aArchiver.map((f) => f.id) } },
      data: { isArchived: true },
    });
  }

  revalidatePath("/formations");
  return { ok: true, creees, misesAJour, archivees: aArchiver.map((f) => f.titre) };
}
