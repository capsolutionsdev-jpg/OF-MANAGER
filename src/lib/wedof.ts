import "server-only";
import type { FinancementType } from "@prisma/client";
import { decryptSecret } from "@/lib/crypto";

// Connecteur Wedof (getwedof.com) — suivi des dossiers CPF (EDOF).
// API REST, base https://www.wedof.fr, authentification par en-tête X-API-KEY.
// Chaque OF branche SA clé (chiffrée sur Organisme.wedofApiKey).

const WEDOF_BASE = "https://www.wedof.fr";

type WedofFolder = {
  externalId: string;
  state?: string;
  billingState?: string;
  type?: string;
  amountTtc?: number | string | null;
  amountToInvoice?: number | string | null;
  updatedOn?: string | null;
  lastUpdate?: string | null;
  permalink?: string | null;
  externalLink?: string | null;
  attendee?: { firstName?: string; lastName?: string; email?: string } | null;
};

/** Appel HTTP authentifié à l'API Wedof. `key` = clé API EN CLAIR. */
async function wedofRequest(
  key: string,
  path: string,
  opts: { method?: string; params?: Record<string, string | number | undefined>; body?: unknown } = {},
): Promise<Response> {
  const url = new URL(WEDOF_BASE + path);
  for (const [k, v] of Object.entries(opts.params ?? {})) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }
  return fetch(url, {
    method: opts.method ?? "GET",
    headers: {
      "X-API-KEY": key,
      Accept: "application/json",
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    // Jamais mis en cache : données financières temps réel.
    cache: "no-store",
  });
}

/** Vérifie qu'une clé API est valide (appel léger). */
export async function testWedofKey(key: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await wedofRequest(key, "/api/registrationFolders", { params: { limit: 1 } });
    if (res.status === 401 || res.status === 403) return { ok: false, error: "Clé API refusée par Wedof." };
    if (!res.ok) return { ok: false, error: `Wedof a répondu ${res.status}.` };
    return { ok: true };
  } catch {
    return { ok: false, error: "Wedof injoignable." };
  }
}

/** Déchiffre la clé stockée. */
export function wedofKeyOf(stored: string | null | undefined): string | null {
  return decryptSecret(stored);
}

/** Liste paginée des dossiers d'inscription (registrationFolders). */
export async function listRegistrationFolders(
  key: string,
  params: { page?: number; limit?: number; period?: string; since?: string } = {},
): Promise<WedofFolder[]> {
  const res = await wedofRequest(key, "/api/registrationFolders", {
    params: { limit: params.limit ?? 100, page: params.page ?? 1, period: params.period, since: params.since },
  });
  if (!res.ok) throw new Error(`Wedof ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : (data?.data ?? []);
}

// ── Traduction Wedof → nos données ──

const TYPE_MAP: Record<string, FinancementType> = {
  cpf: "CPF",
  opco: "OPCO",
  poleEmploi: "FRANCE_TRAVAIL",
  kairosAif: "FRANCE_TRAVAIL",
  individual: "AUTOFINANCEMENT",
  company: "ENTREPRISE",
};

const REFUSE = new Set([
  "refusedByAttendee", "refusedByOrganism", "refusedByFinancer", "rejected",
  "rejectedWithoutTitulaireSuite", "rejectedWithoutCdcSuite", "rejectedWithoutOfSuite",
]);
const ANNULE = new Set([
  "canceledByAttendee", "canceledByAttendeeNotRealized", "canceledByOrganism", "canceledByFinancer",
]);

/** État Wedof (+ facturation) → notre état simple. */
export function mapEtat(state?: string, billingState?: string):
  "A_MONTER" | "EN_COURS" | "ACCEPTE" | "REFUSE" | "A_FACTURER" | "FACTURE" | "SOLDE" | "ANNULE" {
  if (billingState === "paid") return "SOLDE";
  if (billingState === "billed") return "FACTURE";
  if (billingState === "toBill") return "A_FACTURER";
  const s = state ?? "";
  if (REFUSE.has(s)) return "REFUSE";
  if (ANNULE.has(s)) return "ANNULE";
  if (["serviceDoneDeclared", "serviceDoneValidated", "terminated"].includes(s)) return "A_FACTURER";
  if (["accepted", "inTraining"].includes(s)) return "ACCEPTE";
  if (["validated", "waitingAcceptation"].includes(s)) return "EN_COURS";
  return "A_MONTER"; // notProcessed
}

/** Transforme un dossier Wedof en données pour DossierFinancement. */
export function mapFolder(f: WedofFolder) {
  const montant = Number(f.amountToInvoice ?? f.amountTtc ?? 0) || null;
  return {
    wedofId: f.externalId,
    wedofEtat: f.state ?? null,
    wedofMajLe: f.lastUpdate || f.updatedOn ? new Date(f.lastUpdate ?? f.updatedOn!) : null,
    type: TYPE_MAP[f.type ?? "cpf"] ?? "CPF",
    financeur: f.type === "cpf" ? "CPF" : (f.type ?? null),
    etat: mapEtat(f.state, f.billingState),
    montant,
    email: f.attendee?.email?.toLowerCase() ?? null,
    nom: [f.attendee?.firstName, f.attendee?.lastName].filter(Boolean).join(" ") || null,
  };
}
