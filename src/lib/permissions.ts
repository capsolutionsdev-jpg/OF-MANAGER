import type { Role } from "@prisma/client";
import { SECTION_ROLES, STAFF_FILTRES } from "@/lib/section-roles";

// Source unique de la matrice rôles↔sections (cf. lib/section-roles). Réexport
// pour préserver les imports existants `import { SECTION_ROLES } from "@/lib/permissions"`.
export { SECTION_ROLES };

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

/** Le rôle a-t-il le droit d'accéder à cette section (avant filtrage permission) ? */
export function roleAllowedInSection(role: Role, sectionKey: string): boolean {
  const allowed = SECTION_ROLES[sectionKey];
  // Section non listée = non protégée par rôle (ex. dashboard, mes-cours).
  return !allowed || allowed.includes(role);
}

// Rôles « personnel administratif » soumis au filtrage par section (= STAFF_FILTRES,
// source unique). ADMIN = accès total ; FORMATEUR / APPRENANT = périmètre propre.
const STAFF_ROLES: Role[] = STAFF_FILTRES;

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
