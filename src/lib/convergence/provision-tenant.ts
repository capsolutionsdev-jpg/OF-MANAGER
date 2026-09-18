/**
 * Provisioning d'un tenant (Organisme) — logique PURE : aucune dépendance base ni
 * import applicatif (donc testable sans DB, et importable par un script `tsx`).
 * Le script `scripts/provision-tenant.ts` s'appuie dessus puis effectue les
 * écritures Prisma. Convergence CAP + ASPR — cf. docs/convergence/AUDIT-PREPARATION.md.
 */

export const FORMULES = ["INDEPENDANT", "PRO", "CROISSANCE", "RESEAU"] as const;
export type Formule = (typeof FORMULES)[number];

// Bundle « tout activé » pour un OF établi (ASPR). Copie de ALL_FEATURES
// (src/lib/demo/provision.ts) — gardé synchrone à la main ; ajustable ensuite
// dans la console éditeur (Organisme.fonctionnalites).
export const ALL_TENANT_FEATURES: string[] = [
  "crm", "candidats", "clients-pro", "formations", "sessions", "suivi-pedagogique",
  "formateurs", "planning", "salles", "documents", "signatures", "automatisations",
  "elearning", "comptabilite", "facturation", "qualiopi", "bpf", "rgpd", "kanban",
  "taches", "notifications", "devis-signature", "leads-multicanal", "sms",
  "portail-client", "rapports", "scoring", "ia", "support", "diplomes", "jurys",
];

// Noyau réservé (copie du cœur de RESERVED, src/lib/tenant-host.ts) — validation
// de forme uniquement ; l'unicité réelle est vérifiée en base par le script.
const RESERVED_SUBDOMAINS = new Set([
  "www", "app", "api", "console", "admin", "mail", "ftp", "staging", "dev", "test", "demo", "of",
]);

/** Normalise une chaîne en label de sous-domaine (a-z0-9 + tirets). */
export function normalizeSubdomain(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 40);
}

/** Vrai si le label a une forme de sous-domaine valide et non réservée. */
export function isValidSubdomainShape(s: string): boolean {
  return (
    /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(s) &&
    !RESERVED_SUBDOMAINS.has(s) &&
    !/^\d+$/.test(s)
  );
}

export type TenantProvisionInput = {
  nom: string;
  sousDomaine: string;
  adminEmail: string;
  adminNom: string;
  formule: Formule;
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Valide + normalise l'entrée de provisioning. Renvoie les erreurs, sinon l'entrée propre. */
export function validateTenantInput(
  raw: Partial<TenantProvisionInput>,
): { ok: true; input: TenantProvisionInput } | { ok: false; errors: string[] } {
  const errors: string[] = [];

  const nom = (raw.nom ?? "").trim();
  if (!nom) errors.push("nom requis");

  const sousDomaine = normalizeSubdomain(raw.sousDomaine ?? nom);
  if (!isValidSubdomainShape(sousDomaine)) {
    errors.push(`sous-domaine invalide ou réservé : "${sousDomaine}"`);
  }

  const adminEmail = (raw.adminEmail ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(adminEmail)) errors.push("e-mail administrateur invalide");

  const adminNom = (raw.adminNom ?? "").trim();
  if (!adminNom) errors.push("nom de l'administrateur requis");

  const formule = raw.formule as Formule;
  if (!FORMULES.includes(formule)) errors.push(`formule invalide (attendu : ${FORMULES.join(", ")})`);

  if (errors.length) return { ok: false, errors };
  return { ok: true, input: { nom, sousDomaine, adminEmail, adminNom, formule } };
}

/**
 * Données de création de l'Organisme (hors champs gérés en base : id/timestamps).
 * `statut`/`formule` sont des littéraux d'enum Prisma (typés côté script).
 */
export function buildOrganismeCreateData(input: TenantProvisionInput, fonctionnalites: string[]) {
  return {
    nom: input.nom.slice(0, 80),
    email: input.adminEmail,
    sousDomaine: input.sousDomaine,
    statut: "ACTIF",
    formule: input.formule,
    couleurPrimaire: "#1A5FD4",
    design: "defaut",
    fonctionnalites: { set: fonctionnalites },
  };
}
