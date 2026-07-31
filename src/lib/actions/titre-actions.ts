"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import { hasStrictFeature } from "@/lib/feature-guard";
import { orgConfigFor } from "@/lib/org-identity";
import { getTitreDef, genNumeroTitre, type SsiapConfig } from "@/lib/documents/titres";

/**
 * Génération des TITRES officiels CAP Compétences (diplômes SSIAP).
 * Réserve atomiquement un numéro préfectoral et enregistre le diplôme (registre
 * annuel via le module `diplomes`). Le PDF est ensuite servi par la route
 * `/diplomes/[id]/officiel`.
 *
 * NB : les ATTESTATIONS (recyclage / remise à niveau / VTC-Taxi / habilitations)
 * seront ajoutées au lot suivant (modèle `TitreDelivre` + vérification anti-fraude).
 */

const STAFF = ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"];
type Result = { ok: true; diplomeId: string; numero: string } | { ok: false; error: string };

async function guard(): Promise<{ organismeId: string }> {
  const session = await auth();
  const role = session?.user?.role as string | undefined;
  const organismeId = session?.user?.organismeId;
  if (!session?.user || !role || !STAFF.includes(role) || !organismeId)
    throw new Error("Non autorisé.");
  if (!(await hasStrictFeature("diplomes"))) throw new Error("Module diplômes non activé.");
  return { organismeId };
}

/** Lit la config SSIAP (département + n° d'agrément) rangée dans documentsConfig. */
function ssiapConfig(documentsConfig: unknown): SsiapConfig {
  const cfg = documentsConfig as { ssiap?: SsiapConfig } | null | undefined;
  return { departement: cfg?.ssiap?.departement, agrement: cfg?.ssiap?.agrement };
}

/**
 * Génère un diplôme SSIAP (niveau 1/2/3) pour un inscrit : réserve le numéro
 * préfectoral `DEPT-AGRÉMENT-NIVEAU-ANNÉE-SEQ` et crée l'enregistrement diplôme.
 * Idempotence : si un diplôme SSIAP existe déjà pour cette inscription, il est
 * renvoyé tel quel (pas de second numéro).
 */
export async function genererDiplomeSsiap(
  inscriptionId: string,
  niveau: 1 | 2 | 3,
): Promise<Result> {
  const { organismeId } = await guard();
  const db = await getTenantDb();

  const insc = await db.inscription.findFirst({
    where: { id: inscriptionId },
    include: { candidat: true, session: { select: { id: true, formationId: true } } },
  });
  if (!insc) return { ok: false, error: "Inscription introuvable." };

  // Idempotence : un diplôme déjà émis pour cette inscription → on le réutilise.
  const existing = await db.diplome.findFirst({
    where: { inscriptionId: insc.id, numeroDiplome: { not: null } },
    select: { id: true, numeroDiplome: true },
  });
  if (existing?.numeroDiplome) {
    return { ok: true, diplomeId: existing.id, numero: existing.numeroDiplome };
  }

  const def = getTitreDef(`SSIAP${niveau}_DIPLOME`);
  if (!def) return { ok: false, error: "Type de diplôme inconnu." };

  const org = await orgConfigFor(organismeId);
  const numero = await genNumeroTitre(organismeId, def, {
    niveau,
    ssiap: ssiapConfig(org.documentsConfig),
  });

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
      numeroDiplome: numero,
      statut: "ENVOYE_CERTIFICATEUR",
      envoyeCertificateurAt: new Date(),
    },
  });

  revalidatePath(`/sessions/${insc.session.id}`);
  revalidatePath("/diplomes");
  return { ok: true, diplomeId: d.id, numero };
}
