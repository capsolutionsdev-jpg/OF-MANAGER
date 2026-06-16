import type { Role } from "@prisma/client";

// Sections de l'application qu'un gérant peut accorder à un collaborateur.
// La « key » correspond au 1er segment d'URL (ex. /candidats → "candidats").
export const SECTIONS: { key: string; label: string }[] = [
  { key: "candidats", label: "Candidats" },
  { key: "crm", label: "CRM (prospects)" },
  { key: "kanban", label: "Pipeline Kanban" },
  { key: "taches", label: "Tâches & rappels" },
  { key: "notifications", label: "Notifications & alertes" },
  { key: "leads-multicanal", label: "Capture de leads multi-canal" },
  { key: "scoring", label: "Scoring & segmentation" },
  { key: "sms", label: "SMS & séquences" },
  { key: "ia", label: "Assistant IA" },
  { key: "rapports", label: "Rapports analytiques" },
  { key: "portail-client", label: "Espace client entreprise" },
  { key: "clients-pro", label: "Clients pro" },
  { key: "formations", label: "Formations" },
  { key: "sessions", label: "Sessions & émargement" },
  { key: "planning", label: "Planning général" },
  { key: "salles", label: "Salles" },
  { key: "elearning", label: "E-learning" },
  { key: "signatures", label: "Signatures" },
  { key: "automatisations", label: "Automatisations" },
  { key: "formateurs", label: "Formateurs" },
  { key: "comptabilite", label: "Suivi comptable" },
  { key: "facturation", label: "Devis & facturation" },
  { key: "bpf", label: "BPF" },
  { key: "qualiopi", label: "Qualiopi" },
  { key: "rgpd", label: "RGPD" },
  { key: "support", label: "Support technique" },
];

export const SECTION_KEYS = SECTIONS.map((s) => s.key);

// Rôles autorisés à accéder à chaque section (1er segment d'URL).
// SOURCE DE VÉRITÉ du périmètre par rôle, alignée avec navItems (lib/navigation.ts).
// NB : ce tableau est dupliqué dans auth.config.ts (compatible edge/middleware,
// sans import) — garder les deux strictement alignés.
export const SECTION_ROLES: Record<string, Role[]> = {
  crm: ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"],
  kanban: ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"],
  taches: ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"],
  notifications: ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"],
  "leads-multicanal": ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"],
  scoring: ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"],
  sms: ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"],
  ia: ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"],
  rapports: ["ADMIN", "RESPONSABLE_FORMATION"],
  "portail-client": ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"],
  candidats: ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"],
  "clients-pro": ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"],
  formations: ["ADMIN", "RESPONSABLE_FORMATION"],
  sessions: ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT", "FORMATEUR"],
  planning: ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT", "FORMATEUR"],
  salles: ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"],
  elearning: ["ADMIN", "RESPONSABLE_FORMATION", "FORMATEUR"],
  signatures: ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"],
  automatisations: ["ADMIN", "RESPONSABLE_FORMATION"],
  formateurs: ["ADMIN", "RESPONSABLE_FORMATION"],
  comptabilite: ["ADMIN", "RESPONSABLE_FORMATION"],
  facturation: ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"],
  bpf: ["ADMIN", "RESPONSABLE_FORMATION"],
  qualiopi: ["ADMIN", "RESPONSABLE_FORMATION"],
  rgpd: ["ADMIN", "RESPONSABLE_FORMATION"],
  support: ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"],
};

/** Le rôle a-t-il le droit d'accéder à cette section (avant filtrage permission) ? */
export function roleAllowedInSection(role: Role, sectionKey: string): boolean {
  const allowed = SECTION_ROLES[sectionKey];
  // Section non listée = non protégée par rôle (ex. dashboard, mes-cours).
  return !allowed || allowed.includes(role);
}

// Rôles « personnel administratif » soumis au filtrage par section.
// ADMIN = accès total ; FORMATEUR / APPRENANT = périmètre propre (non filtré ici).
const STAFF_ROLES: Role[] = ["RESPONSABLE_FORMATION", "ASSISTANT"];

/** Un compte staff (hors ADMIN) a-t-il accès à la section donnée ? */
export function canAccessSection(
  role: Role,
  permissions: string[] | undefined,
  sectionKey: string,
): boolean {
  if (role === "ADMIN") return true;
  if (!STAFF_ROLES.includes(role)) return true; // formateur/apprenant : géré par leur rôle
  return (permissions ?? []).includes(sectionKey);
}

export function isStaffRole(role: Role): boolean {
  return STAFF_ROLES.includes(role);
}
