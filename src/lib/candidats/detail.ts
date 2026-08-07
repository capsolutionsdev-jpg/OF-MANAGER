import { cache } from "react";
import { auth } from "@/auth";
import { canAccessSection, roleAllowedInSection } from "@/lib/permissions";
import { getTenantDb } from "@/lib/tenant";

/**
 * Chargeur partagé de la fiche candidat et de ses onglets
 * (Profil / Inscriptions / Paiements / CRM / Historique).
 * Enveloppé dans React cache() : dédupe la requête entre l'en-tête partagé et
 * le corps de la page dans un même passage de rendu.
 * Retourne null si le candidat est introuvable → chaque page appelle notFound().
 */
export const getCandidatDetail = cache(async (id: string) => {
  const db = await getTenantDb();
  const candidat = await db.candidat.findUnique({
    where: { id },
    include: {
      inscriptions: {
        include: {
          session: { include: { formation: true } },
          paiements: {
            select: {
              id: true,
              montant: true,
              date: true,
              mode: true,
              enregistrePar: { select: { name: true } },
            },
            orderBy: { date: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      interactionsCandidat: {
        include: { user: { select: { name: true } } },
        orderBy: { date: "desc" },
      },
      pieces: {
        orderBy: { createdAt: "desc" },
        select: { id: true, label: true, categorie: true, url: true, mimeType: true, statut: true, motifRefus: true },
      },
      apprenant: { select: { userId: true } },
    },
  });
  if (!candidat) return null;

  // Droit d'enregistrer un règlement (onglet Paiements) — identique à l'actuel.
  const session = await auth();
  const peutEncaisser =
    !!session?.user &&
    roleAllowedInSection(session.user.role, "comptabilite") &&
    canAccessSection(session.user.role, session.user.permissions ?? [], "comptabilite");

  return { candidat, peutEncaisser };
});
