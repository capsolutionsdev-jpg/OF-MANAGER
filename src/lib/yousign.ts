// Intégration signature électronique (Yousign).
//
// ⚠️ ÉTAT : le flux réel Yousign API v3 (création de la demande + upload du PDF +
// ajout des signataires + activation) n'est PAS encore branché. Tant que le
// drapeau `YOUSIGN_IMPLEMENTED` est à `false`, TOUTE l'application utilise la
// signature INTERNE (dessin manuscrit + IP + horodatage = signature électronique
// SIMPLE) — on NE FAIT PAS semblant d'utiliser Yousign, même si une clé API est
// posée. Auparavant, avec une clé, `createYousignRequest` renvoyait un identifiant
// SIMULÉ (`ys-…`) avec `demo:false`, laissant croire à une signature Yousign
// réelle (constat d'audit de pré-commercialisation §10).
//
// Pour activer Yousign : implémenter le flux v3 ci-dessous PUIS passer
// `YOUSIGN_IMPLEMENTED` à `true`. `yousignConfigured()` est la source unique de
// vérité consommée par l'app (UI + création de demande).

const YOUSIGN_IMPLEMENTED = false;

/** Yousign réellement UTILISABLE : intégration branchée ET clé API posée. */
export function yousignConfigured(): boolean {
  return YOUSIGN_IMPLEMENTED && Boolean(process.env.YOUSIGN_API_KEY);
}

export type YousignSigner = { nom: string; email: string };

export async function createYousignRequest(params: {
  name: string;
  signers: YousignSigner[];
}): Promise<{ externalId: string | null; signUrl: string | null; demo: boolean }> {
  if (!yousignConfigured()) {
    // Repli EXPLICITE sur la signature interne. On ne renvoie JAMAIS de faux
    // identifiant. Si une clé est posée mais le flux non branché, on le signale.
    if (process.env.YOUSIGN_API_KEY && !YOUSIGN_IMPLEMENTED) {
      console.warn(
        "[yousign] YOUSIGN_API_KEY posée mais le flux Yousign API v3 n'est pas branché " +
          "→ repli sur la signature interne (mode démo). Voir lib/yousign.ts.",
      );
    }
    return { externalId: null, signUrl: null, demo: true };
  }

  // --- Implémentation réelle (Yousign API v3) — À BRANCHER, puis YOUSIGN_IMPLEMENTED=true ---
  // 1) POST /signature_requests            { name, delivery_mode: "email" }
  // 2) POST /signature_requests/{id}/documents   (upload du PDF — le PDF doit être
  //    fourni par l'appelant : ajouter un paramètre `document` à cette fonction)
  // 3) POST /signature_requests/{id}/signers     (un par signataire)
  // 4) POST /signature_requests/{id}/activate
  // return { externalId: data.id, signUrl: data.signers?.[0]?.signature_link ?? null, demo: false };
  void params;
  // Sécurité : tant que le flux n'est pas implémenté, on reste en mode démo.
  return { externalId: null, signUrl: null, demo: true };
}
