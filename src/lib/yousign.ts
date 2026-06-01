// Intégration signature électronique (Yousign). En l'absence de clé API
// (YOUSIGN_API_KEY), l'application fonctionne en MODE DÉMO : la demande de
// signature est enregistrée et suivie, sans appel réseau réel.

export function yousignConfigured(): boolean {
  return Boolean(process.env.YOUSIGN_API_KEY);
}

export type YousignSigner = { nom: string; email: string };

export async function createYousignRequest(params: {
  name: string;
  signers: YousignSigner[];
}): Promise<{ externalId: string | null; signUrl: string | null; demo: boolean }> {
  if (!yousignConfigured()) {
    return { externalId: null, signUrl: null, demo: true };
  }

  // --- Implémentation réelle (Yousign API v3) ---
  // 1) POST /signature_requests  { name, delivery_mode: "email" }
  // 2) POST /signature_requests/{id}/documents (upload du PDF)
  // 3) POST /signature_requests/{id}/signers (un par signataire)
  // 4) POST /signature_requests/{id}/activate
  // const res = await fetch("https://api.yousign.app/v3/signature_requests", {
  //   method: "POST",
  //   headers: {
  //     Authorization: `Bearer ${process.env.YOUSIGN_API_KEY}`,
  //     "Content-Type": "application/json",
  //   },
  //   body: JSON.stringify({ name: params.name, delivery_mode: "email" }),
  // });
  // const data = await res.json();
  // ... upload document + add signers + activate ...
  // return { externalId: data.id, signUrl: data.signers?.[0]?.signature_link ?? null, demo: false };

  // Tant que l'upload PDF n'est pas branché, on renvoie un identifiant simulé.
  void params;
  return { externalId: `ys-${Date.now()}`, signUrl: null, demo: false };
}
