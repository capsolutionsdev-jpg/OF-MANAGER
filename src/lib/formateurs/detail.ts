import { cache } from "react";
import { getTenantDb } from "@/lib/tenant";

/**
 * Chargeur partagé de la fiche formateur et de ses onglets
 * (Profil / Planning / Facturation).
 *
 * Enveloppé dans React `cache()` : la requête est dédupliquée entre l'en-tête
 * partagé (qui a besoin des compteurs) et le corps de chaque onglet dans un
 * même passage de rendu.
 *
 * Retourne `null` si le formateur est introuvable → chaque page appelle
 * `notFound()`.
 */
export const getFormateurDetail = cache(async (id: string) => {
  const db = await getTenantDb();
  const f = await db.formateur.findUnique({
    where: { id },
    include: {
      sessions: { include: { formation: true }, orderBy: { dateDebut: "asc" } },
      formations: { select: { id: true, titre: true }, orderBy: { titre: "asc" } },
      factures: {
        orderBy: { createdAt: "desc" },
        include: { session: { include: { formation: { select: { titre: true } } } } },
      },
    },
  });
  if (!f) return null;

  return { f };
});
