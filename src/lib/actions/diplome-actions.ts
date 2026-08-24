"use server";

import { revalidatePath } from "next/cache";
import { DiplomeStatut } from "@prisma/client";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import { hasStrictFeature } from "@/lib/feature-guard";
import { orgConfigFor } from "@/lib/org-identity";
import { getTitreDef, ssiapDiplomeNiveau } from "@/lib/documents/titres";
import { indexerTitre } from "@/lib/documents/titres/index-titre";
import { readAgrements } from "@/lib/agrements";

const STAFF = ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"];
type Result = { ok: true; id?: string } | { ok: false; error: string };

async function guard() {
  const session = await auth();
  const role = session?.user?.role as string | undefined;
  if (!session?.user || !role || !STAFF.includes(role)) throw new Error("Non autorisé.");
  if (!(await hasStrictFeature("diplomes"))) throw new Error("Module diplômes non activé.");
  return {
    nom: session.user.name || session.user.email || "Collaborateur",
    organismeId: session.user.organismeId as string | undefined,
  };
}

/**
 * Enregistre un diplôme en RÉCUPÉRANT les coordonnées d'un inscrit (nom, prénom,
 * date & lieu de naissance) + session/formation. Le n° de diplôme est saisi.
 */
export async function createDiplomeFromInscription(
  inscriptionId: string,
  numeroDiplome?: string,
): Promise<Result> {
  await guard();
  const db = await getTenantDb();
  const insc = await db.inscription.findFirst({
    where: { id: inscriptionId },
    include: { candidat: true, session: { select: { id: true, formationId: true } } },
  });
  if (!insc) return { ok: false, error: "Inscription introuvable." };
  const c = insc.candidat;
  const d = await db.diplome.create({
    data: {
      inscriptionId: insc.id,
      sessionId: insc.session.id,
      formationId: insc.session.formationId,
      nom: c.nom,
      prenom: c.prenom,
      dateNaissance: c.dateNaissance,
      lieuNaissance: c.lieuNaissance ?? null,
      numeroDiplome: numeroDiplome?.trim() || null,
      statut: "ENVOYE_CERTIFICATEUR",
      envoyeCertificateurAt: new Date(),
    },
  });
  revalidatePath("/diplomes");
  return { ok: true, id: d.id };
}

/** Enregistre un diplôme manuellement (coordonnées saisies). */
export async function createDiplomeManuel(input: {
  nom: string;
  prenom: string;
  dateNaissance?: string;
  lieuNaissance?: string;
  numeroDiplome?: string;
  sessionId?: string;
  formationId?: string;
}): Promise<Result> {
  await guard();
  if (!input.nom.trim() || !input.prenom.trim())
    return { ok: false, error: "Nom et prénom requis." };
  if (!input.formationId?.trim())
    return { ok: false, error: "Précisez la formation du diplôme." };
  const db = await getTenantDb();
  const d = await db.diplome.create({
    data: {
      nom: input.nom.trim(),
      prenom: input.prenom.trim(),
      dateNaissance: input.dateNaissance ? new Date(input.dateNaissance) : null,
      lieuNaissance: input.lieuNaissance?.trim() || null,
      numeroDiplome: input.numeroDiplome?.trim() || null,
      sessionId: input.sessionId || null,
      formationId: input.formationId.trim(),
      statut: "ENVOYE_CERTIFICATEUR",
      envoyeCertificateurAt: new Date(),
    },
  });
  revalidatePath("/diplomes");
  return { ok: true, id: d.id };
}

/**
 * Compose le numéro d'un diplôme SSIAP 1/2/3 à partir de la SÉQUENCE saisie à la
 * main (n° lu sur le PV d'examen) et des parties dérivées :
 *   `DÉPARTEMENT-AGRÉMENT-NIVEAU-ANNÉE-SÉQUENCE`  (ex. `093-0042-1-2026-00042`)
 * - DÉPARTEMENT : config OF (Diplômes → Agréments).
 * - AGRÉMENT    : n° d'agrément de la formation (repli sur l'agrément SSIAP de l'OF).
 * - NIVEAU      : 1/2/3 déduit de la formation.
 * - ANNÉE       : année de la session (repli : année de création du diplôme).
 * - SÉQUENCE    : saisie manuelle, complétée à 5 chiffres si numérique.
 * Ce numéro composé EST le numéro de vérification (unique). PAS de clé ajoutée.
 */
async function composeNumeroSsiap(
  db: Awaited<ReturnType<typeof getTenantDb>>,
  org: Awaited<ReturnType<typeof orgConfigFor>>,
  niveau: 1 | 2 | 3,
  seqRaw: string,
  d: { sessionId: string | null; createdAt: Date; formationNumeroAgrement: string | null },
): Promise<{ ok: true; numero: string } | { ok: false; error: string }> {
  const ag = readAgrements(org.documentsConfig);
  const dept = ag.ssiapDepartement?.trim();
  const agrement = d.formationNumeroAgrement?.trim() || ag.ssiap?.trim();
  if (!dept || !agrement) {
    return {
      ok: false,
      error:
        "Renseignez le département et le n° d'agrément SSIAP (Diplômes → Agréments, ou le champ « Numéro d'agrément » de la formation) avant de numéroter.",
    };
  }
  // Année = année de la session (repli : année de création du diplôme).
  let year = new Date(d.createdAt).getFullYear();
  if (d.sessionId) {
    const s = await db.session.findFirst({ where: { id: d.sessionId }, select: { dateDebut: true } });
    if (s?.dateDebut) year = new Date(s.dateDebut).getFullYear();
  }
  const seq = /^\d+$/.test(seqRaw) ? seqRaw.padStart(5, "0") : seqRaw;
  return { ok: true, numero: `${dept}-${agrement}-${niveau}-${year}-${seq}` };
}

/**
 * Met à jour le numéro d'un diplôme.
 * - Diplôme SSIAP 1/2/3 : `saisie` = la SÉQUENCE (n° du PV). Le système COMPOSE le
 *   numéro complet (cf. composeNumeroSsiap), l'enregistre et l'INDEXE dans le
 *   registre vérifiable anti-fraude → vérifiable en ligne + QR du PDF officiel.
 * - Autre diplôme : `saisie` = le numéro tel quel (aucune composition ni indexation).
 */
export async function setDiplomeNumero(id: string, saisie: string): Promise<Result> {
  const { organismeId } = await guard();
  const db = await getTenantDb();
  const seqRaw = saisie.trim();

  const d = await db.diplome.findFirst({
    where: { id },
    select: {
      nom: true, prenom: true, dateNaissance: true, numeroDiplome: true, createdAt: true,
      inscriptionId: true, sessionId: true, formationId: true,
    },
  });
  if (!d) return { ok: false, error: "Diplôme introuvable." };
  if (!seqRaw) return { ok: true }; // saisie vide → aucune modification (anti-effacement accidentel)

  // SSIAP 1/2/3 ? → numéro COMPOSÉ + indexation. Sinon → numéro saisi tel quel.
  const f = d.formationId
    ? await db.formation.findFirst({
        where: { id: d.formationId },
        select: { reference: true, titre: true, numeroAgrement: true },
      })
    : null;
  const niveau = f ? ssiapDiplomeNiveau({ reference: f.reference, titre: f.titre }) : null;
  const def = niveau ? getTitreDef(`SSIAP${niveau}_DIPLOME`) : null;
  const org = def && organismeId ? await orgConfigFor(organismeId) : null;

  let num: string;
  if (def && niveau && org) {
    const composed = await composeNumeroSsiap(db, org, niveau, seqRaw, {
      sessionId: d.sessionId,
      createdAt: d.createdAt,
      formationNumeroAgrement: f?.numeroAgrement ?? null,
    });
    if (!composed.ok) return composed;
    num = composed.numero;
  } else {
    num = seqRaw; // diplôme non-SSIAP : numéro saisi tel quel
  }

  // Garde anti-doublon : deux diplômes ne peuvent porter le même numéro. Sinon la
  // base de vérification (partagée, indexée par n°) lierait ce numéro au PREMIER
  // titulaire indexé, rendant le second diplôme invérifiable avec sa propre date
  // de naissance.
  const dupe = await db.diplome.findFirst({
    where: { numeroDiplome: num, NOT: { id } },
    select: { nom: true, prenom: true },
  });
  if (dupe) {
    return {
      ok: false,
      error: `Ce numéro (${num}) est déjà attribué au diplôme de ${dupe.prenom} ${dupe.nom}.`,
    };
  }

  await db.diplome.update({ where: { id }, data: { numeroDiplome: num } });

  // Registre vérifiable (anti-fraude) — SSIAP 1/2/3 uniquement.
  if (def && org && organismeId) {
    try {
      // Correction d'un n° : purge l'entrée précédente devenue caduque, pour ne pas
      // laisser un numéro erroné indexé au titulaire.
      if (d.numeroDiplome && d.numeroDiplome !== num) {
        await db.titreDelivre.deleteMany({
          where: { typeCode: def.code, numeroVerification: d.numeroDiplome },
        });
      }
      await indexerTitre(db, organismeId, {
        def,
        numero: num,
        nom: d.nom,
        prenom: d.prenom,
        dateNaissance: d.dateNaissance,
        organismeSignataire: org.name,
        dateDelivrance: new Date(),
        dateFinValidite: null, // diplôme SSIAP : pas d'expiration
        inscriptionId: d.inscriptionId,
        sessionId: d.sessionId,
        formationId: d.formationId,
      });
    } catch (e) {
      console.error("[diplome-index]", e);
    }
  }

  revalidatePath("/diplomes");
  return { ok: true };
}

/**
 * Change le statut du diplôme (envoyé certificateur → reçu → remis) en
 * horodatant l'étape. À « remis », trace le collaborateur (remiseParNom).
 */
export async function setDiplomeStatut(id: string, statut: DiplomeStatut): Promise<Result> {
  const { nom } = await guard();
  const db = await getTenantDb();
  const data: Record<string, unknown> = { statut };
  if (statut === "ENVOYE_CERTIFICATEUR") data.envoyeCertificateurAt = new Date();
  if (statut === "RECU") data.recuAt = new Date();
  if (statut === "REMIS") {
    data.remisAt = new Date();
    data.remiseParNom = nom;
  }
  const r = await db.diplome.updateMany({ where: { id }, data });
  if (r.count === 0) return { ok: false, error: "Diplôme introuvable." };
  revalidatePath("/diplomes");
  return { ok: true };
}

/** Supprime un diplôme. */
export async function deleteDiplome(id: string): Promise<Result> {
  await guard();
  const db = await getTenantDb();
  const r = await db.diplome.deleteMany({ where: { id } });
  if (r.count === 0) return { ok: false, error: "Diplôme introuvable." };
  revalidatePath("/diplomes");
  return { ok: true };
}
