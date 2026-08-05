"use server";

import { revalidatePath } from "next/cache";
import { TitreStatut } from "@prisma/client";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import { hasStrictFeature } from "@/lib/feature-guard";
import { orgConfigFor } from "@/lib/org-identity";
import { getTitreDef, genNumeroTitre, type SsiapConfig, type TitreTypeDef } from "@/lib/documents/titres";
import { genSel, hashDob } from "@/lib/anti-fraude/hash";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

/**
 * Indexe un titre dans le registre vérifiable (TitreDelivre) : hash salé de la
 * date de naissance (jamais en clair), numéro, statut, organisme signataire.
 * Best-effort pour les diplômes (nécessite la date de naissance).
 */
async function indexerTitre(
  db: Db,
  organismeId: string,
  p: {
    def: TitreTypeDef;
    numero: string;
    nom: string;
    prenom: string;
    dateNaissance: Date | null;
    organismeSignataire: string;
    dateDelivrance: Date;
    dateFinValidite?: Date | null;
    inscriptionId?: string | null;
    sessionId?: string | null;
    formationId?: string | null;
  },
): Promise<{ ok: boolean }> {
  if (!p.dateNaissance) return { ok: false }; // pas de date → non vérifiable
  const sel = genSel();
  await db.titreDelivre.create({
    data: {
      organismeId,
      typeCode: p.def.code,
      numeroVerification: p.numero,
      hashDateNaissance: hashDob(p.dateNaissance, sel),
      selUnique: sel,
      nomTitulaire: p.nom,
      prenomTitulaire: p.prenom,
      dateDelivrance: p.dateDelivrance,
      dateFinValidite: p.dateFinValidite ?? null,
      organismeSignataire: p.organismeSignataire,
      inscriptionId: p.inscriptionId ?? null,
      sessionId: p.sessionId ?? null,
      formationId: p.formationId ?? null,
    },
  });
  return { ok: true };
}

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

  // Index vérifiable (anti-fraude) — le diplôme SSIAP n'expire pas (dateFin null).
  await indexerTitre(db, organismeId, {
    def,
    numero,
    nom: c.nom,
    prenom: c.prenom,
    dateNaissance: c.dateNaissance,
    organismeSignataire: org.name,
    dateDelivrance: new Date(),
    dateFinValidite: null,
    inscriptionId: insc.id,
    sessionId: insc.session.id,
    formationId: insc.session.formationId,
  });

  revalidatePath(`/sessions/${insc.session.id}`);
  revalidatePath("/diplomes");
  return { ok: true, diplomeId: d.id, numero };
}

/**
 * Génère une ATTESTATION (recyclage / remise à niveau SSIAP, formation continue
 * VTC/Taxi, habilitation H0B0 / BS-BE) pour un inscrit : réserve le numéro
 * `PRÉFIXE-ANNÉE-SEQ-CLÉ` (avec clé de Luhn) et l'indexe dans le registre
 * vérifiable (hash salé de la date de naissance). Idempotent par (inscription, type).
 */
export async function genererAttestation(
  inscriptionId: string,
  code: string,
): Promise<{ ok: true; titreId: string; numero: string } | { ok: false; error: string }> {
  const { organismeId } = await guard();
  const db = await getTenantDb();

  const def = getTitreDef(code);
  if (!def || def.kind !== "attestation") return { ok: false, error: "Type d'attestation inconnu." };

  const insc = await db.inscription.findFirst({
    where: { id: inscriptionId },
    include: { candidat: true, session: { select: { id: true, formationId: true } } },
  });
  if (!insc) return { ok: false, error: "Inscription introuvable." };
  if (!insc.candidat.dateNaissance)
    return { ok: false, error: "Date de naissance du candidat requise pour la vérification." };

  // Idempotence : une attestation de ce type existe déjà pour cet inscrit.
  const existing = await db.titreDelivre.findFirst({
    where: { inscriptionId: insc.id, typeCode: def.code },
    select: { id: true, numeroVerification: true },
  });
  if (existing) return { ok: true, titreId: existing.id, numero: existing.numeroVerification };

  const numero = await genNumeroTitre(organismeId, def, { niveau: def.niveau });
  const org = await orgConfigFor(organismeId);

  const c = insc.candidat;
  const dob = c.dateNaissance!; // garanti non-null par le contrôle ci-dessus
  const sel = genSel();
  const t = await db.titreDelivre.create({
    data: {
      organismeId,
      typeCode: def.code,
      numeroVerification: numero,
      hashDateNaissance: hashDob(dob, sel),
      selUnique: sel,
      nomTitulaire: c.nom,
      prenomTitulaire: c.prenom,
      dateDelivrance: new Date(),
      dateFinValidite: null, // durées réglementaires paramétrables (à renseigner)
      organismeSignataire: org.name,
      inscriptionId: insc.id,
      sessionId: insc.session.id,
      formationId: insc.session.formationId,
    },
  });

  revalidatePath(`/sessions/${insc.session.id}`);
  return { ok: true, titreId: t.id, numero };
}

/**
 * Change le statut d'un titre vérifiable (VALIDE / REVOQUE / ANNULE / ARCHIVE).
 * Un titre révoqué ou annulé est indistinguable d'un numéro inexistant côté
 * vérification publique (message générique). Réservé au staff, tracé en audit.
 */
export async function setTitreStatut(
  id: string,
  statut: TitreStatut,
): Promise<{ ok: boolean; error?: string }> {
  const { organismeId } = await guard();
  const db = await getTenantDb();
  const t = await db.titreDelivre.findFirst({ where: { id }, select: { id: true } });
  if (!t) return { ok: false, error: "Titre introuvable." };

  await db.titreDelivre.updateMany({ where: { id }, data: { statut } });

  const session = await auth();
  if (session?.user?.id) {
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: `TITRE_${statut}`,
        entityType: "TitreDelivre",
        entityId: id,
      },
    });
  }
  void organismeId;
  revalidatePath("/diplomes/titres");
  return { ok: true };
}
