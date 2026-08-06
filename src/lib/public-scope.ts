// =============================================================
//  Portée « organisme » des API publiques (sites vitrines).
//
//  MULTI-TENANT : plusieurs sites vitrines interrogent la même console.
//  Chaque site passe désormais SON organisme en query (`?organisme=<id>`),
//  ce qui permet de servir N clients depuis un seul déploiement.
//
//  Repli sur l'env `VITRINE_ORGANISME_ID` pour les déploiements
//  mono-vitrine historiques (comportement inchangé si le paramètre est
//  absent). `undefined` = aucun filtre (toutes les données publiques).
//
//  Ces API sont en LECTURE SEULE et ne renvoient que des informations
//  destinées à être publiques (fiches publiées, sessions ouvertes…) :
//  accepter l'organisme depuis l'appelant n'expose donc rien de sensible.
// =============================================================

export function organismeScope(req: Request): string | undefined {
  const raw = new URL(req.url).searchParams.get("organisme")?.trim();
  if (raw) return raw;
  return process.env.VITRINE_ORGANISME_ID || undefined;
}
