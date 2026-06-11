import type { Role } from "@prisma/client";

// Sections de l'application qu'un gérant peut accorder à un collaborateur.
// La « key » correspond au 1er segment d'URL (ex. /candidats → "candidats").
export const SECTIONS: { key: string; label: string }[] = [
  { key: "candidats", label: "Candidats" },
  { key: "crm", label: "CRM (prospects)" },
  { key: "clients-pro", label: "Clients pro" },
  { key: "formations", label: "Formations" },
  { key: "sessions", label: "Sessions & émargement" },
  { key: "elearning", label: "E-learning" },
  { key: "signatures", label: "Signatures" },
  { key: "automatisations", label: "Automatisations" },
  { key: "formateurs", label: "Formateurs" },
  { key: "bpf", label: "BPF" },
  { key: "qualiopi", label: "Qualiopi" },
  { key: "rgpd", label: "RGPD" },
];

export const SECTION_KEYS = SECTIONS.map((s) => s.key);

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
