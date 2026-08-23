"use server";

import { revalidatePath } from "next/cache";
import { DiplomeStatut } from "@prisma/client";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import { hasStrictFeature } from "@/lib/feature-guard";
import { orgConfigFor } from "@/lib/org-identity";
import { getTitreDef, ssiapDiplomeNiveau } from "@/lib/documents/titres";
import { indexerTitre } from "@/lib/documents/titres/index-titre";

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
 * Met à jour le n° de diplôme. Pour un diplôme SSIAP 1/2/3 INITIAL, la saisie du
 * numéro (préfectoral) l'INDEXE dans le registre vérifiable anti-fraude → il
 * devient vérifiable en ligne et le QR du PDF officiel fonctionne. Best-effort
 * (nécessite la date de naissance).
 */
export async function setDiplomeNumero(id: string, numeroDiplome: string): Promise<Result> {
  const { organismeId } = await guard();
  const db = await getTenantDb();
  const num = numeroDiplome.trim() || null;

  const d = await db.diplome.findFirst({
    where: { id },
    select: {
      nom: true, prenom: true, dateNaissance: true, numeroDiplome: true,
      inscriptionId: true, sessionId: true, formationId: true,
    },
  });
  if (!d) return { ok: false, error: "Diplôme introuvable." };

  // Garde anti-doublon : deux diplômes ne peuvent porter le même numéro. Sinon la
  // base de vérification (partagée, indexée par n°) lierait ce numéro au PREMIER
  // titulaire indexé, rendant le second diplôme invérifiable avec sa propre date
  // de naissance. Le numéro préfectoral est unique par nature.
  if (num) {
    const dupe = await db.diplome.findFirst({
      where: { numeroDiplome: num, NOT: { id } },
      select: { nom: true, prenom: true },
    });
    if (dupe) {
      return {
        ok: false,
        error: `Ce numéro est déjà attribué au diplôme de ${dupe.prenom} ${dupe.nom}.`,
      };
    }
  }

  await db.diplome.update({ where: { id }, data: { numeroDiplome: num } });

  // Registre vérifiable (anti-fraude) — SSIAP 1/2/3 uniquement.
  if (organismeId && d.formationId) {
    const f = await db.formation.findFirst({
      where: { id: d.formationId },
      select: { reference: true, titre: true },
    });
    const niveau = f ? ssiapDiplomeNiveau({ reference: f.reference, titre: f.titre }) : null;
    const def = niveau ? getTitreDef(`SSIAP${niveau}_DIPLOME`) : null;
    if (def) {
      try {
        // Correction d'un n° : purge l'entrée précédente devenue caduque (le n° ayant
        // changé), pour ne pas laisser un numéro erroné indexé au titulaire.
        if (d.numeroDiplome && d.numeroDiplome !== num) {
          await db.titreDelivre.deleteMany({
            where: { typeCode: def.code, numeroVerification: d.numeroDiplome },
          });
        }
        if (num) {
          const org = await orgConfigFor(organismeId);
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
        }
      } catch (e) {
        console.error("[diplome-index]", e);
      }
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
