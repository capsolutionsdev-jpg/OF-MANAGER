"use server";

import { revalidatePath } from "next/cache";
import { FinancementType } from "@prisma/client";
import { getTenantDb } from "@/lib/tenant";
import { auth } from "@/auth";
import { getCurrentOrganisme } from "@/lib/org";
import { nextRef, maxSuffix } from "@/lib/numerotation";

const STAFF = ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"];
const clean = (s?: string | null) => (s && s.trim() !== "" ? s.trim() : null);

export type NouveauSalarie = { nom: string; prenom: string; email?: string };

export type ConventionInput = {
  sessionId: string;
  entrepriseId: string;
  /** Salariés à créer (nouveaux candidats). */
  nouveaux?: NouveauSalarie[];
  /** Candidats existants à inscrire. */
  candidatIdsExistants?: string[];
  financementType?: string; // défaut ENTREPRISE
  montant?: string; // montant global de la convention (€ HT)
};

export type ConventionResult =
  | { ok: true; conventionId: string; inscrits: number; warning?: string }
  | { ok: false; error: string };

/**
 * Crée une convention de GROUPE pour un client pro et inscrit ses salariés à
 * une session : chaque salarié devient un candidat rattaché à l'entreprise + une
 * inscription (rattachée à la convention). Les candidats apparaissent donc
 * immédiatement dans la session ET dans la liste des candidats.
 * Suivi : la convention démarre EN_ATTENTE ; sa signature déclenche la
 * confirmation des inscriptions (cf. signerConvention).
 */
export async function createConventionEntreprise(
  input: ConventionInput,
): Promise<ConventionResult> {
  const session = await auth();
  if (!session?.user || !STAFF.includes(session.user.role as string))
    return { ok: false, error: "Non autorisé." };
  const org = await getCurrentOrganisme();
  if (!org) return { ok: false, error: "Organisme introuvable." };

  const db = await getTenantDb();

  const sess = await db.session.findUnique({
    where: { id: input.sessionId },
    select: { id: true },
  });
  if (!sess) return { ok: false, error: "Session introuvable." };
  const ent = await db.entreprise.findUnique({
    where: { id: input.entrepriseId },
    select: { id: true },
  });
  if (!ent) return { ok: false, error: "Client professionnel introuvable." };

  const fin: FinancementType =
    input.financementType && input.financementType in FinancementType
      ? (input.financementType as FinancementType)
      : FinancementType.ENTREPRISE;

  // 1) Salariés : création des nouveaux candidats + collecte des candidatIds.
  // Dédup : un « nouveau salarié » qui existe déjà (même e-mail, sinon même
  // nom+prénom) est RÉUTILISÉ au lieu de créer un doublon (rattaché à l'entreprise
  // au passage).
  const candidatIds = new Set<string>(input.candidatIdsExistants ?? []);
  for (const s of input.nouveaux ?? []) {
    const nom = clean(s.nom);
    const prenom = clean(s.prenom);
    if (!nom || !prenom) continue;
    const email = clean(s.email);

    const existing = await db.candidat.findFirst({
      where: email
        ? { email: { equals: email, mode: "insensitive" } }
        : {
            nom: { equals: nom, mode: "insensitive" },
            prenom: { equals: prenom, mode: "insensitive" },
          },
      select: { id: true, entrepriseId: true },
    });
    if (existing) {
      if (existing.entrepriseId !== input.entrepriseId) {
        await db.candidat.update({
          where: { id: existing.id },
          data: { entrepriseId: input.entrepriseId },
        });
      }
      candidatIds.add(existing.id);
      continue;
    }

    const c = await db.candidat.create({
      data: {
        nom,
        prenom,
        email: email ?? `${prenom}.${nom}@${Date.now()}.local`.toLowerCase().replace(/\s+/g, ""),
        entrepriseId: input.entrepriseId,
        financementType: fin,
        statut: "INSCRIT",
        createdById: session.user.id,
      },
      select: { id: true },
    });
    candidatIds.add(c.id);
  }

  if (candidatIds.size === 0)
    return { ok: false, error: "Aucun salarié à inscrire." };

  // 2) Convention de groupe. Numéro amorcé depuis l'historique de l'année (évite
  // un redémarrage à 0001 → collision si des conventions préexistent). (A06-018)
  const yearConv = new Date().getFullYear();
  const reference = await nextRef(org.id, "CONV", async () => {
    const rows = await db.convention.findMany({
      where: { reference: { startsWith: `CONV-${yearConv}-` } },
      select: { reference: true },
    });
    return maxSuffix(rows.map((r) => r.reference));
  });
  const montant =
    input.montant && input.montant.trim() !== ""
      ? Number(input.montant.replace(",", "."))
      : null;
  const convention = await db.convention.create({
    data: {
      reference,
      sessionId: input.sessionId,
      entrepriseId: input.entrepriseId,
      montant: montant !== null && !Number.isNaN(montant) ? montant : null,
    },
    select: { id: true },
  });

  // 3) Inscriptions (rattachées entreprise + convention). Évite les doublons.
  let inscrits = 0;
  for (const candidatId of candidatIds) {
    const existe = await db.inscription.findFirst({
      where: { candidatId, sessionId: input.sessionId },
      select: { id: true },
    });
    if (existe) {
      // Déjà inscrit : on le rattache seulement à la convention.
      await db.inscription.update({
        where: { id: existe.id },
        data: { conventionId: convention.id, entrepriseId: input.entrepriseId, financementType: fin },
      });
      inscrits++;
      continue;
    }
    await db.inscription.create({
      data: {
        candidatId,
        sessionId: input.sessionId,
        entrepriseId: input.entrepriseId,
        conventionId: convention.id,
        financementType: fin,
        statut: "EN_ATTENTE",
        source: "convention",
      },
    });
    inscrits++;
  }

  revalidatePath(`/sessions/${input.sessionId}`);
  revalidatePath(`/clients-pro/${input.entrepriseId}`);
  revalidatePath("/candidats");

  // Avertissement de capacité (n'empêche pas l'inscription groupée).
  let warning: string | undefined;
  const capSess = await db.session.findUnique({
    where: { id: input.sessionId },
    select: { nbPlaces: true },
  });
  if (capSess) {
    const total = await db.inscription.count({
      where: { sessionId: input.sessionId, statut: { not: "ANNULEE" } },
    });
    if (total > capSess.nbPlaces)
      warning = `Session complète : ${total}/${capSess.nbPlaces} inscrits (capacité dépassée).`;
  }
  return { ok: true, conventionId: convention.id, inscrits, warning };
}

/**
 * Signe la convention → confirme toutes les inscriptions rattachées (VALIDEE).
 * (Génération des documents et envoi des convocations au client pro = étape
 * suivante, pilotée par le parcours / les automatisations.)
 */
export async function signerConvention(conventionId: string): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user || !STAFF.includes(session.user.role as string))
    return { ok: false, error: "Non autorisé." };
  const db = await getTenantDb();

  const conv = await db.convention.findUnique({
    where: { id: conventionId },
    select: { id: true, sessionId: true, entrepriseId: true },
  });
  if (!conv) return { ok: false, error: "Convention introuvable." };

  await db.convention.update({
    where: { id: conventionId },
    data: { signatureStatut: "SIGNEE", dateSignature: new Date() },
  });
  await db.inscription.updateMany({
    where: { conventionId },
    data: { statut: "VALIDEE" },
  });

  if (conv.sessionId) revalidatePath(`/sessions/${conv.sessionId}`);
  if (conv.entrepriseId) revalidatePath(`/clients-pro/${conv.entrepriseId}`);
  return { ok: true };
}
