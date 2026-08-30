"use server";

import { revalidatePath } from "next/cache";
import { CandidatStatut, CnapsStatut, InscriptionStatut } from "@prisma/client";
import { requireStaffTenant } from "@/lib/tenant";
import { auth } from "@/auth";
import {
  candidatFormSchema,
  type CandidatFormValues,
} from "@/lib/validators/candidat";
import { createInscription } from "@/lib/actions/inscription-actions";

export type ActionResult =
  | { ok: true; id: string; inscriptionId?: string; warning?: string }
  | { ok: false; error: string };

const clean = (s?: string) => (s && s.trim() !== "" ? s.trim() : null);

function toData(v: CandidatFormValues) {
  return {
    nom: v.nom.trim(),
    prenom: v.prenom.trim(),
    genre: v.genre,
    email: v.email.trim(),
    telephone: clean(v.telephone),
    dateNaissance: v.dateNaissance ? new Date(v.dateNaissance) : null,
    lieuNaissance: clean(v.lieuNaissance),
    departementNaissance: clean(v.departementNaissance),
    paysNaissance: clean(v.paysNaissance),
    nationalite: clean(v.nationalite),
    adresse: clean(v.adresse),
    ville: clean(v.ville),
    codePostal: clean(v.codePostal),
    pays: clean(v.pays) ?? "France",
    situationPro: clean(v.situationPro),
    employeur: clean(v.employeur),
    posteOccupe: clean(v.posteOccupe),
    dernierDiplome: clean(v.dernierDiplome),
    sourceConnaissance: clean(v.sourceConnaissance),
    assignedToId: clean(v.assignedToId),
    financementType: v.financementType ? v.financementType : null,
    formationSouhaiteeId: clean(v.formationSouhaiteeId),
    statut: v.statut,
    cnapsStatut: v.cnapsStatut ? v.cnapsStatut : null,
    carteProNumero: clean(v.carteProNumero),
    carteProValidite: v.carteProValidite ? new Date(v.carteProValidite) : null,
    ssiapNiveau:
      v.ssiapNiveau && /^[123]$/.test(v.ssiapNiveau.trim()) ? Number(v.ssiapNiveau.trim()) : null,
    ssiapDiplomeNumero: clean(v.ssiapDiplomeNumero),
    ssiapDiplomeDate: v.ssiapDiplomeDate ? new Date(v.ssiapDiplomeDate) : null,
    situationHandicap: !!v.situationHandicap,
    besoinsAdaptation: clean(v.besoinsAdaptation),
    // Photo d'identité : uniquement si fournie (image valide) → n'écrase pas la
    // photo existante lors d'une mise à jour sans nouvelle photo.
    ...(v.photoDataUrl && v.photoDataUrl.startsWith("data:image/")
      ? { photoUrl: v.photoDataUrl }
      : {}),
  };
}

/**
 * Renseigne le diplôme SSIAP DÉTENU par un candidat (n° + date, niveau optionnel)
 * — retranscrit sur les attestations de recyclage / remise à niveau générées.
 * Action ciblée utilisable depuis la fiche session et le formulaire d'inscription.
 */
export async function setCandidatSsiap(
  candidatId: string,
  input: { numero?: string; date?: string; niveau?: string },
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  const { db } = await requireStaffTenant();
  const data: {
    ssiapDiplomeNumero: string | null;
    ssiapDiplomeDate: Date | null;
    ssiapNiveau?: number;
  } = {
    ssiapDiplomeNumero: clean(input.numero),
    ssiapDiplomeDate: input.date ? new Date(input.date) : null,
  };
  if (input.niveau && /^[123]$/.test(input.niveau.trim())) data.ssiapNiveau = Number(input.niveau.trim());
  const r = await db.candidat.updateMany({ where: { id: candidatId }, data });
  if (r.count === 0) return { ok: false, error: "Candidat introuvable." };
  revalidatePath("/candidats");
  return { ok: true, id: candidatId };
}

/**
 * Renseigne les prérequis/spécificités d'un candidat au moment de l'inscription
 * sur place : diplôme SSIAP détenu, autorisation CNAPS, carte professionnelle.
 * Ces attributs appartiennent au candidat (réutilisables d'une session à l'autre).
 */
export async function setCandidatPrerequis(
  candidatId: string,
  input: {
    ssiapNumero?: string;
    ssiapDate?: string;
    ssiapNiveau?: string;
    cnapsStatut?: string;
    carteProNumero?: string;
    carteProValidite?: string;
  },
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  const { db } = await requireStaffTenant();

  const data: Record<string, unknown> = {};
  if (input.ssiapNumero !== undefined) data.ssiapDiplomeNumero = clean(input.ssiapNumero);
  if (input.ssiapDate !== undefined)
    data.ssiapDiplomeDate = input.ssiapDate ? new Date(input.ssiapDate) : null;
  if (input.ssiapNiveau && /^[123]$/.test(input.ssiapNiveau.trim()))
    data.ssiapNiveau = Number(input.ssiapNiveau.trim());
  if (input.cnapsStatut && input.cnapsStatut in CnapsStatut)
    data.cnapsStatut = input.cnapsStatut as CnapsStatut;
  if (input.carteProNumero !== undefined) data.carteProNumero = clean(input.carteProNumero);
  if (input.carteProValidite !== undefined)
    data.carteProValidite = input.carteProValidite ? new Date(input.carteProValidite) : null;

  if (Object.keys(data).length === 0) return { ok: true, id: candidatId };
  const r = await db.candidat.updateMany({ where: { id: candidatId }, data });
  if (r.count === 0) return { ok: false, error: "Candidat introuvable." };
  revalidatePath("/candidats");
  revalidatePath(`/candidats/${candidatId}`);
  return { ok: true, id: candidatId };
}

export async function createCandidat(
  values: CandidatFormValues,
): Promise<ActionResult> {
  const { db } = await requireStaffTenant();
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };

  const parsed = candidatFormSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Données invalides." };

  const candidat = await db.candidat.create({
    data: { ...toData(parsed.data), createdById: session.user.id },
  });

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "CREATE",
      entityType: "Candidat",
      entityId: candidat.id,
    },
  });

  // Rattachement direct à une session choisie (#1) → crée l'inscription en
  // EN_ATTENTE (pré-rattachement, sans déclencher le parcours/e-mails). Best-effort :
  // un échec (déjà inscrit, session pleine…) ne doit pas faire échouer la création.
  let inscriptionId: string | undefined;
  let warning: string | undefined;
  const sessionId = parsed.data.sessionId?.trim();
  if (sessionId && parsed.data.formationSouhaiteeId) {
    try {
      const insc = await createInscription({
        candidatId: candidat.id,
        sessionId,
        financementType: parsed.data.financementType ?? "",
        statut: InscriptionStatut.EN_ATTENTE,
        montant: "",
      });
      // Id de l'inscription créée → permet au formulaire de proposer la signature
      // « sur place » immédiatement après la création (point d'entrée inscription).
      // On remonte aussi l'avertissement éventuel (ex. session complète).
      if (insc.ok) {
        inscriptionId = insc.inscriptionId;
        warning = insc.warning;
      }
    } catch (e) {
      console.error("[createCandidat] rattachement à la session échoué", e);
    }
  }

  revalidatePath("/candidats");
  return { ok: true, id: candidat.id, inscriptionId, warning };
}

export async function updateCandidat(
  id: string,
  values: CandidatFormValues,
): Promise<ActionResult> {
  const { db } = await requireStaffTenant();
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };

  const parsed = candidatFormSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Données invalides." };

  await db.candidat.update({
    where: { id },
    data: toData(parsed.data),
  });

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "UPDATE",
      entityType: "Candidat",
      entityId: id,
    },
  });

  revalidatePath("/candidats");
  revalidatePath(`/candidats/${id}`);
  return { ok: true, id };
}

export async function archiveCandidat(id: string): Promise<ActionResult> {
  const { db } = await requireStaffTenant();
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };

  await db.candidat.update({
    where: { id },
    data: { statut: "ARCHIVE" },
  });

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "ARCHIVE",
      entityType: "Candidat",
      entityId: id,
    },
  });

  revalidatePath("/candidats");
  return { ok: true, id };
}

export async function setCandidatStatut(
  id: string,
  statut: CandidatStatut,
): Promise<{ ok: boolean }> {
  const session = await auth();
  if (!session?.user) return { ok: false };

  const { db } = await requireStaffTenant();
  await db.candidat.update({ where: { id }, data: { statut } });
  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "STATUT",
      entityType: "Candidat",
      entityId: id,
    },
  });
  revalidatePath("/crm");
  revalidatePath("/candidats");
  return { ok: true };
}
