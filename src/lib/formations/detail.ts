import { cache } from "react";
import { getTenantDb } from "@/lib/tenant";

/**
 * Chargeur partagé de la fiche formation et de ses onglets
 * (Fiche / Diplômes / Sessions).
 *
 * Enveloppé dans React `cache()` : la requête est dédupliquée entre l'en-tête
 * partagé et le corps de la page dans un même passage de rendu (l'en-tête a
 * besoin des compteurs, chaque onglet du détail).
 *
 * Retourne `null` si la formation est introuvable → chaque page appelle
 * `notFound()`.
 */
export const getFormationDetail = cache(async (id: string) => {
  const db = await getTenantDb();
  const f = await db.formation.findUnique({
    where: { id },
    include: { sessions: { orderBy: { dateDebut: "desc" } } },
  });
  if (!f) return null;

  // Inventaire des diplômes délivrés pour cette formation.
  const diplomes = await db.diplome.findMany({
    where: { formationId: id },
    orderBy: [{ numeroDiplome: "asc" }, { createdAt: "desc" }],
  });

  return { f, diplomes };
});
