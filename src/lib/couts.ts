// Coût de revient & marge par client (reframe du « monitoring perf/OVH » du plan :
// OVH est HORS architecture, la stack est Vercel/Neon/Resend). Repères tarifaires
// fournisseurs (feuilles 10-11). Les coûts sont ESTIMÉS depuis la conso comptable
// (e-mails, inscriptions→PDF, SMS) ; Neon (CU) n'étant pas attribuable en direct
// par client, une part d'infra forfaitaire est amortie par client actif. PUR.

export const COUT_EMAIL_EUR = 0.001; // Resend ≈ 0,9 $/1000 × 0,92
export const COUT_INSCRIPTION_EUR = 0.02; // ≈ 8 PDF/stagiaire (CPU Vercel) + stockage
export const COUT_SMS_EUR = 0.045; // coût d'achat fournisseur
export const COUT_INFRA_FIXE_EUR = 5; // part Neon/Vercel/Blob amortie par client actif

export type UsageCounts = { emails: number; inscriptions: number; sms: number };

export type CoutClient = {
  emailsEur: number;
  inscriptionsEur: number;
  smsEur: number;
  infraEur: number;
  total: number;
};

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Coût mensuel estimé d'un client depuis sa conso comptable — PUR. */
export function estimateClientCost(u: UsageCounts): CoutClient {
  const emailsEur = round2(u.emails * COUT_EMAIL_EUR);
  const inscriptionsEur = round2(u.inscriptions * COUT_INSCRIPTION_EUR);
  const smsEur = round2(u.sms * COUT_SMS_EUR);
  const infraEur = COUT_INFRA_FIXE_EUR;
  return {
    emailsEur,
    inscriptionsEur,
    smsEur,
    infraEur,
    total: round2(emailsEur + inscriptionsEur + smsEur + infraEur),
  };
}

/** Marge (€ et %) d'un revenu récurrent face à un coût — PUR. */
export function marge(revenu: number, cout: number): { euros: number; pct: number } {
  const euros = round2(revenu - cout);
  const pct = revenu > 0 ? Math.round((euros / revenu) * 100) : 0;
  return { euros, pct };
}

export const OPTIMISATIONS = [
  {
    titre: "Images base64 → Vercel Blob",
    detail: "Le stockage Neon coûte ~15× le Blob et gonfle aussi le transfert. Sortir les images encodées en base64 de Postgres.",
    gain: "Plusieurs centaines d'€/an à 50 clients",
  },
  {
    titre: "Cache de prompts Anthropic",
    detail: "Activer le prompt caching sur l'assistant IA pour réduire le coût par appel.",
    gain: "Coût IA/appel réduit",
  },
  {
    titre: "Cache des rapports BPF",
    detail: "Le BPF est recalculé à chaque affichage — le mettre en cache.",
    gain: "Moins de CPU / DB",
  },
  {
    titre: "Neon : palier Launch vs Scale",
    detail: "Le passage Launch→Scale double le CU-heure (0,106 $ → 0,222 $). À 100 clients, Neon ≈ 45 % de la facture infra — surveiller le palier.",
    gain: "Poste n°1 à surveiller",
  },
];
