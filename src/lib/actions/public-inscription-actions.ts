"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  publicInscriptionSchema,
  type PublicInscriptionValues,
} from "@/lib/validators/public-inscription";

export type ActionResult = { ok: true } | { ok: false; error: string };

const clean = (s?: string) => (s && s.trim() !== "" ? s.trim() : null);

export async function submitPublicInscription(
  values: PublicInscriptionValues,
): Promise<ActionResult> {
  const parsed = publicInscriptionSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Formulaire invalide." };
  const v = parsed.data;

  // La session doit exister et être ouverte aux inscriptions.
  const session = await prisma.session.findUnique({
    where: { id: v.sessionId },
    select: { id: true, organismeId: true },
  });
  if (!session) return { ok: false, error: "Session introuvable." };
  // Tenant dérivé de la session ciblée (le formulaire public n'a pas de session utilisateur).
  const orgId = session.organismeId;

  // Prérequis réglementaires (autorisation CNAPS / carte pro). On ne calcule une
  // valeur QUE lorsqu'elle est réellement renseignée : `undefined` laisse Prisma
  // ignorer le champ (à la création → défaut null ; à la mise à jour → valeur
  // existante conservée). On n'écrase donc JAMAIS une donnée déjà en base quand
  // le formulaire de la formation en cours n'affiche pas la case correspondante.
  const cnapsNumeroVal = clean(v.cnapsNumero) ?? undefined;
  const cnapsValiditeVal = v.cnapsValiditeDate ? new Date(v.cnapsValiditeDate) : undefined;
  const carteProNumeroVal = v.hasCarteProAps ? (clean(v.carteProNumero) ?? undefined) : undefined;
  const carteProValiditeVal =
    v.hasCarteProAps && v.carteProValiditeDate ? new Date(v.carteProValiditeDate) : undefined;

  // Candidat : réutiliser s'il existe déjà (par email, dans le même organisme), sinon créer.
  let candidat = await prisma.candidat.findFirst({
    where: { email: v.email.trim(), organismeId: orgId },
  });
  if (!candidat) {
    candidat = await prisma.candidat.create({
      data: {
        organismeId: orgId,
        nom: v.nom.trim(),
        prenom: v.prenom.trim(),
        email: v.email.trim(),
        telephone: clean(v.telephone),
        dateNaissance: v.dateNaissance ? new Date(v.dateNaissance) : null,
        ville: clean(v.ville),
        codePostal: clean(v.codePostal),
        situationPro: clean(v.situationPro),
        employeur: clean(v.employeur),
        financementType: v.financementType ? v.financementType : null,
        cnapsNumero: cnapsNumeroVal,
        cnapsValiditeDate: cnapsValiditeVal,
        carteProNumero: carteProNumeroVal,
        carteProValidite: carteProValiditeVal,
        statut: "NOUVEAU",
      },
    });
  } else {
    // Candidat existant : mise à jour partielle — uniquement les champs de
    // prérequis effectivement fournis, pour ne pas remettre à null une valeur
    // déjà connue (perte de donnée réglementaire).
    const prereqData: Prisma.CandidatUpdateInput = {};
    if (cnapsNumeroVal !== undefined) prereqData.cnapsNumero = cnapsNumeroVal;
    if (cnapsValiditeVal !== undefined) prereqData.cnapsValiditeDate = cnapsValiditeVal;
    if (carteProNumeroVal !== undefined) prereqData.carteProNumero = carteProNumeroVal;
    if (carteProValiditeVal !== undefined) prereqData.carteProValidite = carteProValiditeVal;
    if (Object.keys(prereqData).length > 0) {
      await prisma.candidat.update({ where: { id: candidat.id }, data: prereqData });
    }
  }

  try {
    await prisma.inscription.create({
      data: {
        organismeId: orgId,
        candidatId: candidat.id,
        sessionId: v.sessionId,
        financementType: v.financementType ? v.financementType : null,
        statut: "EN_ATTENTE",
        consentementRgpd: true,
        consentementDate: new Date(),
        source: "formulaire_public",
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return {
        ok: false,
        error: "Une demande d'inscription existe déjà pour cet email sur cette session.",
      };
    }
    throw e;
  }

  // Trace du consentement RGPD.
  await prisma.consentement.create({
    data: {
      organismeId: orgId,
      candidatId: candidat.id,
      type: "INSCRIPTION_FORMATION",
      accepte: true,
    },
  });

  revalidatePath("/");
  return { ok: true };
}
