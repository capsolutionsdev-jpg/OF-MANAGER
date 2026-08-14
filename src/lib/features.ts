// Catalogue des fonctionnalités activables par organisme (console SUPERADMIN).
// La clé correspond, quand c'est pertinent, au 1er segment d'URL / à la section
// de navigation (cf. lib/permissions.ts). Stockées dans Organisme.fonctionnalites.
//
// Deux groupes : « Cœur » (activées par défaut à la création d'un OF) et
// « Modules avancés » (options activées/vendues à la demande, OFF par défaut).

export type Feature = { key: string; label: string; description?: string; group: "Cœur" | "Modules avancés" | "Support" };

export const FEATURES: Feature[] = [
  // ── Cœur ──
  { key: "crm", label: "CRM (prospection)", description: "Prospects, pipeline, relances", group: "Cœur" },
  { key: "candidats", label: "Candidats & inscriptions", group: "Cœur" },
  { key: "clients-pro", label: "Clients pro (B2B)", description: "Conventions entreprise, OPCO", group: "Cœur" },
  { key: "formations", label: "Catalogue de formations", group: "Cœur" },
  { key: "sessions", label: "Sessions & émargement", group: "Cœur" },
  { key: "suivi-pedagogique", label: "Suivi pédagogique", group: "Cœur" },
  { key: "formateurs", label: "Gestion des formateurs", group: "Cœur" },
  { key: "planning", label: "Planning général", group: "Cœur" },
  { key: "salles", label: "Gestion des salles", group: "Cœur" },
  { key: "documents", label: "Génération automatique des documents", group: "Cœur" },
  { key: "signatures", label: "Signature électronique", group: "Cœur" },
  { key: "automatisations", label: "Automatisation des envois (convocations, attestations…)", group: "Cœur" },
  { key: "elearning", label: "E-learning", group: "Cœur" },
  { key: "comptabilite", label: "Suivi comptable", group: "Cœur" },
  { key: "facturation", label: "Devis & facturation", group: "Cœur" },
  { key: "financements", label: "Financements (CPF / OPCO)", description: "Suivi des prises en charge CPF (Wedof) et OPCO, bordereaux, accords", group: "Cœur" },
  { key: "qualiopi", label: "Suivi Qualiopi", group: "Cœur" },
  { key: "bpf", label: "Bilan Pédagogique & Financier (BPF)", group: "Cœur" },
  { key: "rgpd", label: "RGPD", group: "Cœur" },

  // ── Modules avancés (options, OFF par défaut) ──
  { key: "kanban", label: "Pipeline Kanban (drag-and-drop)", description: "Glisser-déposer + prévisionnel pondéré", group: "Modules avancés" },
  { key: "taches", label: "Tâches & rappels / agenda commercial", description: "Échéances, affectations, à faire", group: "Modules avancés" },
  { key: "notifications", label: "Notifications & alertes in-app", description: "Lead, relance, impayé, signature due", group: "Modules avancés" },
  { key: "devis-signature", label: "Signature électronique du devis", description: "Bon pour accord en 1 clic", group: "Modules avancés" },
  { key: "leads-multicanal", label: "Capture de leads multi-canal", description: "Formulaire web + EDOF (CPF) / Kairos (France Travail)", group: "Modules avancés" },
  { key: "sms", label: "SMS & séquences de relance", description: "Convocations/rappels + relances automatiques", group: "Modules avancés" },
  { key: "portail-client", label: "Espace client entreprise", description: "Self-service : salariés, documents, factures", group: "Modules avancés" },
  { key: "rapports", label: "Rapports analytiques", description: "Conversion, CA prévisionnel, délais", group: "Modules avancés" },
  { key: "scoring", label: "Scoring & segmentation des prospects", description: "Score d'engagement, tags dynamiques", group: "Modules avancés" },
  { key: "ia", label: "Assistant IA", description: "Rédaction/relance e-mails, résumé, qualification des leads", group: "Modules avancés" },
  { key: "site-vitrine", label: "Site vitrine — pilotage", description: "Publier/piloter les fiches du site public (statut, tarif, durée) + trafic", group: "Modules avancés" },
  { key: "blog", label: "Blog du site vitrine", description: "Rédiger et publier les articles du site public", group: "Modules avancés" },
  { key: "diplomes", label: "Gestion des diplômes", description: "Suivi des diplômes (certificateur → reçu → remis) + attestation de remise", group: "Modules avancés" },
  { key: "jurys", label: "Gestion de jury", description: "Jurys d'examen, défraiement personnalisé, notes de défraiement", group: "Modules avancés" },
  { key: "parcours-t3p", label: "Parcours examen Taxi / VTC (T3P)", description: "Suivi du parcours CMA : prérequis, inscription, frais, épreuves, carte professionnelle", group: "Modules avancés" },

  // ── Support (inclus dans toutes les formules) ──
  { key: "support", label: "Support technique", description: "Le client contacte l'éditeur depuis sa plateforme (incidents, renseignements)", group: "Support" },
];

export const FEATURE_KEYS = FEATURES.map((f) => f.key);

/** Fonctionnalités « Cœur » : activées par défaut à la création d'un organisme. */
export const CORE_FEATURE_KEYS = FEATURES.filter((f) => f.group === "Cœur").map((f) => f.key);

/** Modules avancés : options vendues à la demande (servent au calcul de la formule). */
export const ADVANCED_FEATURE_KEYS = FEATURES.filter((f) => f.group === "Modules avancés").map((f) => f.key);

/** Libellé d'une fonctionnalité à partir de sa clé. */
export const featureLabel = (key: string): string =>
  FEATURES.find((f) => f.key === key)?.label ?? key;

/** Groupes ordonnés pour l'affichage console. */
export const FEATURE_GROUPS: Array<Feature["group"]> = ["Cœur", "Modules avancés", "Support"];

/** Un organisme a-t-il la fonctionnalité activée ? (vide = tout activé par défaut) */
export function hasFeature(fonctionnalites: string[] | undefined, key: string): boolean {
  if (!fonctionnalites || fonctionnalites.length === 0) return true;
  return fonctionnalites.includes(key);
}
