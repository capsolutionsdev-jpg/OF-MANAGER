"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getCurrentEntreprise } from "@/lib/entreprise-portal";
import { getTenantDb, requireStaffTenant } from "@/lib/tenant";
import { createConventionEntreprise } from "@/lib/actions/convention-actions";

/** Un salarié d'une demande : soit un candidat existant, soit un nouveau. */
export type SalarieDemande = { candidatId: string } | { nom: string; prenom: string; email?: string };

function isExistant(s: SalarieDemande): s is { candidatId: string } {
  return typeof (s as { candidatId?: unknown }).candidatId === "string";
}

/**
 * CLIENT (rôle ENTREPRISE) : demande l'inscription de salariés à une session.
 * L'entreprise est TOUJOURS déduite de la session (jamais de l'entrée client).
 * Crée une DemandeInscription EN_ATTENTE que l'OF validera.
 */
export async function createDemandeInscription(input: {
  sessionId: string;
  salaries: SalarieDemande[];
}): Promise<{ ok: boolean; error?: string }> {
  const entreprise = await getCurrentEntreprise();
  if (!entreprise) return { ok: false, error: "Non autorisé." };

  const db = await getTenantDb();

  // La session doit exister dans le tenant, être ouverte et non archivée.
  const session = await db.session.findFirst({
    where: { id: input.sessionId, isArchived: false, statut: { in: ["PLANIFIEE", "OUVERTE"] } },
    select: { id: true },
  });
  if (!session) return { ok: false, error: "Cette session n'est pas ouverte aux inscriptions." };

  const salaries = (input.salaries ?? []).filter(Boolean);
  if (salaries.length === 0) return { ok: false, error: "Ajoutez au moins un salarié." };

  // Candidats existants : doivent appartenir À CETTE entreprise (anti-IDOR).
  const candidatIds = salaries.filter(isExistant).map((s) => s.candidatId);
  const nomsById = new Map<string, { nom: string; prenom: string }>();
  if (candidatIds.length > 0) {
    const owned = await db.candidat.findMany({
      where: { id: { in: candidatIds }, entrepriseId: entreprise.id },
      select: { id: true, nom: true, prenom: true },
    });
    if (owned.length !== new Set(candidatIds).size) {
      return { ok: false, error: "Un des salariés sélectionnés est invalide." };
    }
    for (const c of owned) nomsById.set(c.id, { nom: c.nom, prenom: c.prenom });
  }
  // Nouveaux salariés : nom + prénom obligatoires.
  for (const s of salaries) {
    if (!isExistant(s) && (!s.nom?.trim() || !s.prenom?.trim())) {
      return { ok: false, error: "Nom et prénom sont requis pour chaque nouveau salarié." };
    }
  }

  // On dénormalise le nom des candidats existants dans le JSON (affichage staff
  // sans jointure) ; la confirmation ne réutilise QUE le candidatId.
  const salariesJson = salaries.map((s) =>
    isExistant(s)
      ? { candidatId: s.candidatId, ...nomsById.get(s.candidatId) }
      : { nom: s.nom.trim(), prenom: s.prenom.trim(), ...(s.email?.trim() ? { email: s.email.trim() } : {}) },
  );

  await db.demandeInscription.create({
    data: {
      entrepriseId: entreprise.id,
      sessionId: input.sessionId,
      salariesJson: salariesJson as unknown as Prisma.InputJsonValue,
      statut: "EN_ATTENTE",
    },
  });

  revalidatePath("/espace-entreprise/formation");
  revalidatePath("/espace-entreprise/inscriptions");
  return { ok: true };
}

/**
 * STAFF : confirme une demande → réutilise createConventionEntreprise (crée les
 * candidats + la convention de groupe + les inscriptions EN_ATTENTE), puis passe
 * la demande à CONFIRMEE.
 */
export async function confirmerDemandeInscription(
  demandeId: string,
): Promise<{ ok: boolean; error?: string; warning?: string }> {
  const { db, session } = await requireStaffTenant();

  const demande = await db.demandeInscription.findFirst({
    where: { id: demandeId },
    select: { id: true, entrepriseId: true, sessionId: true, statut: true, salariesJson: true },
  });
  if (!demande) return { ok: false, error: "Demande introuvable." };
  if (demande.statut !== "EN_ATTENTE" && demande.statut !== "CONTRE_PROPOSEE") {
    return { ok: false, error: "Cette demande a déjà été traitée." };
  }

  // Verrou atomique : on passe à CONFIRMEE UNIQUEMENT si la demande est encore
  // en attente. Si deux collaborateurs cliquent simultanément, un seul obtient
  // count===1 → évite une double convention / double inscription (TOCTOU).
  const claim = await db.demandeInscription.updateMany({
    where: { id: demandeId, statut: { in: ["EN_ATTENTE", "CONTRE_PROPOSEE"] } },
    data: { statut: "CONFIRMEE", traiteeParId: session.user.id },
  });
  if (claim.count !== 1) return { ok: false, error: "Cette demande vient d'être traitée." };

  const salaries = (Array.isArray(demande.salariesJson) ? demande.salariesJson : []) as unknown as SalarieDemande[];
  const candidatIdsExistants = salaries.filter(isExistant).map((s) => s.candidatId);
  const nouveaux = salaries
    .filter((s): s is { nom: string; prenom: string; email?: string } => !isExistant(s))
    .map((s) => ({ nom: s.nom, prenom: s.prenom, email: s.email }));

  const res = await createConventionEntreprise({
    sessionId: demande.sessionId,
    entrepriseId: demande.entrepriseId,
    nouveaux,
    candidatIdsExistants,
    financementType: "ENTREPRISE",
  });
  if (!res.ok) {
    // Échec de la convention → on relâche le verrou pour permettre une nouvelle tentative.
    await db.demandeInscription.updateMany({
      where: { id: demandeId, statut: "CONFIRMEE" },
      data: { statut: "EN_ATTENTE", traiteeParId: null },
    });
    return { ok: false, error: res.error };
  }

  revalidatePath("/demandes-inscription");
  return { ok: true, warning: res.warning };
}

/** STAFF : refuse une demande (motif optionnel communiqué au client). */
export async function refuserDemandeInscription(
  demandeId: string,
  motif?: string,
): Promise<{ ok: boolean; error?: string }> {
  const { db } = await requireStaffTenant();

  const demande = await db.demandeInscription.findFirst({
    where: { id: demandeId },
    select: { id: true, statut: true },
  });
  if (!demande) return { ok: false, error: "Demande introuvable." };
  if (demande.statut === "CONFIRMEE") return { ok: false, error: "Cette demande est déjà confirmée." };

  await db.demandeInscription.update({
    where: { id: demandeId },
    data: { statut: "REFUSEE", motif: motif?.trim() || null },
  });

  revalidatePath("/demandes-inscription");
  return { ok: true };
}
