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
  // On ne confirme que depuis EN_ATTENTE : une CONTRE_PROPOSEE doit d'abord être
  // acceptée par le client (ce qui la repointe sur la nouvelle session → EN_ATTENTE).
  if (demande.statut !== "EN_ATTENTE") {
    return { ok: false, error: "Cette demande a déjà été traitée." };
  }

  // Verrou atomique : on passe à CONFIRMEE UNIQUEMENT si la demande est encore
  // en attente. Si deux collaborateurs cliquent simultanément, un seul obtient
  // count===1 → évite une double convention / double inscription (TOCTOU).
  const claim = await db.demandeInscription.updateMany({
    where: { id: demandeId, statut: "EN_ATTENTE" },
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

  // Verrou atomique : on ne refuse que depuis EN_ATTENTE (une CONTRE_PROPOSEE est
  // dans les mains du client). Évite d'écraser un état concurrent (accept/confirm).
  const claim = await db.demandeInscription.updateMany({
    where: { id: demandeId, statut: "EN_ATTENTE" },
    data: { statut: "REFUSEE", motif: motif?.trim() || null },
  });
  if (claim.count !== 1) return { ok: false, error: "Cette demande n'est plus en attente." };

  revalidatePath("/demandes-inscription");
  return { ok: true };
}

/**
 * STAFF : propose une AUTRE session au client (contre-proposition). La demande
 * passe en CONTRE_PROPOSEE — la balle est dans le camp du client (accepter/refuser).
 */
export async function proposerAutreDate(
  demandeId: string,
  sessionProposeeId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { db } = await requireStaffTenant();

  const demande = await db.demandeInscription.findFirst({
    where: { id: demandeId },
    select: { id: true, statut: true, sessionId: true, session: { select: { formationId: true } } },
  });
  if (!demande) return { ok: false, error: "Demande introuvable." };
  if (demande.statut !== "EN_ATTENTE") return { ok: false, error: "Cette demande a déjà été traitée." };
  if (sessionProposeeId === demande.sessionId) return { ok: false, error: "Choisissez une session différente." };

  const sess = await db.session.findFirst({
    where: { id: sessionProposeeId, isArchived: false, statut: { in: ["PLANIFIEE", "OUVERTE"] } },
    select: { id: true, formationId: true },
  });
  if (!sess) return { ok: false, error: "La session proposée n'est pas ouverte aux inscriptions." };
  // La contre-proposition doit rester la MÊME formation (identité du contrat / Qualiopi).
  if (sess.formationId !== demande.session.formationId) {
    return { ok: false, error: "La session proposée doit concerner la même formation." };
  }

  const claim = await db.demandeInscription.updateMany({
    where: { id: demandeId, statut: "EN_ATTENTE" },
    data: { statut: "CONTRE_PROPOSEE", sessionProposeeId },
  });
  if (claim.count !== 1) return { ok: false, error: "Cette demande vient d'être traitée." };

  revalidatePath("/demandes-inscription");
  return { ok: true };
}

/**
 * CLIENT : accepte la contre-proposition → la demande est repointée sur la
 * session proposée et repasse EN_ATTENTE (l'OF n'a plus qu'à la confirmer).
 */
export async function accepterContreProposition(
  demandeId: string,
): Promise<{ ok: boolean; error?: string }> {
  const entreprise = await getCurrentEntreprise();
  if (!entreprise) return { ok: false, error: "Non autorisé." };
  const db = await getTenantDb();

  const demande = await db.demandeInscription.findFirst({
    where: { id: demandeId, entrepriseId: entreprise.id },
    select: { id: true, statut: true, sessionProposeeId: true },
  });
  if (!demande) return { ok: false, error: "Demande introuvable." };
  if (demande.statut !== "CONTRE_PROPOSEE" || !demande.sessionProposeeId) {
    return { ok: false, error: "Aucune date proposée à accepter." };
  }

  const claim = await db.demandeInscription.updateMany({
    where: { id: demandeId, entrepriseId: entreprise.id, statut: "CONTRE_PROPOSEE" },
    data: { sessionId: demande.sessionProposeeId, sessionProposeeId: null, statut: "EN_ATTENTE" },
  });
  if (claim.count !== 1) return { ok: false, error: "Cette demande a déjà évolué." };

  revalidatePath("/espace-entreprise/inscriptions");
  revalidatePath("/demandes-inscription");
  return { ok: true };
}

/** CLIENT : refuse la contre-proposition → la demande est annulée. */
export async function refuserContreProposition(
  demandeId: string,
): Promise<{ ok: boolean; error?: string }> {
  const entreprise = await getCurrentEntreprise();
  if (!entreprise) return { ok: false, error: "Non autorisé." };
  const db = await getTenantDb();

  const claim = await db.demandeInscription.updateMany({
    where: { id: demandeId, entrepriseId: entreprise.id, statut: "CONTRE_PROPOSEE" },
    data: { statut: "ANNULEE" },
  });
  if (claim.count !== 1) return { ok: false, error: "Aucune date proposée à refuser." };

  revalidatePath("/espace-entreprise/inscriptions");
  revalidatePath("/demandes-inscription");
  return { ok: true };
}
