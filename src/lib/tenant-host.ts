import { cache } from "react";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

// Labels de sous-domaine réservés (pas un tenant).
export const RESERVED = new Set([
  "www", "app", "localhost", "api", "console", "admin",
  "static", "assets", "mail", "smtp", "ftp", "ns", "cdn", "vercel",
]);

/**
 * Organisme déduit du sous-domaine de la requête publique
 * (ex. `of1.app.fr` ou `of1.localhost:3100` → tenant dont sousDomaine = "of1").
 * Permet d'afficher la marque du bon OF sur les pages publiques (avant login).
 * Mis en cache par requête. NULL si pas de sous-domaine identifiable.
 */
export const getOrganismeFromHost = cache(async () => {
  const h = await headers();
  const host = (h.get("host") ?? "").split(":")[0].toLowerCase();
  const labels = host.split(".");
  if (labels.length < 2) return null; // ex. "localhost" seul, IP simple
  const sub = labels[0];
  if (!sub || RESERVED.has(sub) || /^\d+$/.test(sub)) return null;
  try {
    return await prisma.organisme.findUnique({ where: { sousDomaine: sub } });
  } catch {
    // Coupure DB transitoire (Neon) : ne jamais faire planter la page de login.
    return null;
  }
});

/** Marque publique (sous-domaine sinon valeurs par défaut CAP). */
export async function getPublicBranding() {
  const org = await getOrganismeFromHost();
  return {
    // Marque par défaut = le PRODUIT (OFManager) ; un sous-domaine de client
    // remplace par sa propre marque (nom + logo).
    nom: org?.nom ?? "OFManager",
    logoUrl: org?.logoUrl ?? null,
    couleurPrimaire: org?.couleurPrimaire ?? "#1A5FD4",
    theme: org?.theme ?? null,
    design: org?.design ?? null,
  };
}
