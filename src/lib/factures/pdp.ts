// =============================================================
//  PDP — Plateforme de Dématérialisation Partenaire (transmission des factures).
//
//  Provider-AGNOSTIQUE : le code ne dépend d'AUCUN prestataire. Le choix se règle
//  par variables d'environnement (PDP_PROVIDER + clés) ; sans configuration, on
//  retombe sur un NoopAdapter qui DÉGRADE proprement (comme Stripe/YouSign non
//  configurés). Quand une PDP est retenue et le compte ouvert, il suffit de poser
//  les env (et, au besoin, de spécialiser l'adaptateur ici).
//
//  Réforme 2026 : plus d'envoi direct — toute facture B2B transite par une PDP,
//  qui gère aussi le cycle de vie (Déposée/Rejetée/Encaissée) et l'e-reporting.
// =============================================================

export type PdpTransmitInput = {
  numero: string;
  clientSiren: string | null;
  montantTTC: number;
  facturx: Uint8Array; // le PDF Factur-X (PDF/A-3 + XML CII embarqué)
};
export type PdpTransmitResult = { ok: boolean; reference?: string; error?: string };

export interface PdpAdapter {
  readonly name: string;
  readonly configured: boolean;
  transmit(input: PdpTransmitInput): Promise<PdpTransmitResult>;
}

/** Aucune PDP configurée → dégrade sans erreur silencieuse. */
class NoopPdpAdapter implements PdpAdapter {
  readonly name = "none";
  readonly configured = false;
  async transmit(): Promise<PdpTransmitResult> {
    return { ok: false, error: "Aucune PDP configurée (définissez PDP_PROVIDER + PDP_API_URL + PDP_API_KEY)." };
  }
}

/**
 * Adaptateur REST générique : convient à toute PDP exposant un POST multipart du
 * fichier Factur-X. Réglé par PDP_API_URL + PDP_API_KEY (Bearer). À spécialiser
 * selon la PDP retenue (champs/entêtes propres), mais le contrat reste le même.
 */
class RestPdpAdapter implements PdpAdapter {
  readonly name: string;
  private readonly url: string;
  private readonly apiKey: string;
  constructor(url: string, apiKey: string, name = "rest") {
    this.url = url;
    this.apiKey = apiKey;
    this.name = name;
  }
  get configured(): boolean {
    return !!this.url && !!this.apiKey;
  }
  async transmit(input: PdpTransmitInput): Promise<PdpTransmitResult> {
    try {
      const form = new FormData();
      form.append(
        "file",
        new Blob([input.facturx as BlobPart], { type: "application/pdf" }),
        `factur-x-${input.numero}.pdf`,
      );
      form.append("numero", input.numero);
      if (input.clientSiren) form.append("clientSiren", input.clientSiren);
      const res = await fetch(this.url, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}` },
        body: form,
      });
      if (!res.ok) return { ok: false, error: `PDP a répondu ${res.status}` };
      const data = (await res.json().catch(() => ({}))) as { id?: string; reference?: string };
      return { ok: true, reference: data.id ?? data.reference };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Échec de transmission PDP" };
    }
  }
}

/** Sélectionne l'adaptateur PDP depuis l'environnement (Noop si non configuré). */
export function getPdpAdapter(): PdpAdapter {
  const provider = process.env.PDP_PROVIDER?.trim().toLowerCase();
  if (!provider || provider === "none") return new NoopPdpAdapter();
  // Tous les prestataires passent aujourd'hui par l'adaptateur REST générique ;
  // spécialiser ici (Iopole, Pennylane, Docaposte…) une fois la PDP retenue.
  const adapter = new RestPdpAdapter(process.env.PDP_API_URL ?? "", process.env.PDP_API_KEY ?? "", provider);
  return adapter.configured ? adapter : new NoopPdpAdapter();
}

// ---- e-reporting : transmission des DONNÉES d'encaissement (statut de paiement) ----

export type EreportingPayload = {
  type: "ENCAISSEMENT";
  numero: string;
  montantTTC: number;
  devise: "EUR";
  dateEncaissement: string | null; // ISO 8601
};

/** Construit la charge d'e-reporting (encaissement) d'une facture — PUR (testé). */
export function buildEreportingPayload(f: {
  numero: string;
  montantTTC: number;
  paidAt: Date | null;
}): EreportingPayload {
  return {
    type: "ENCAISSEMENT",
    numero: f.numero,
    montantTTC: f.montantTTC,
    devise: "EUR",
    dateEncaissement: f.paidAt ? f.paidAt.toISOString() : null,
  };
}
