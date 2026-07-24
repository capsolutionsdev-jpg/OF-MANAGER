import type { Role } from "@prisma/client";

// SOURCE UNIQUE de la matrice rôles ↔ sections (1er segment d'URL).
// Module volontairement SANS dépendance runtime (seul un `import type`, effacé à
// la compilation) → importable côté EDGE (middleware / auth.config) ET côté Node
// (permissions, gardes serveur). Évite la duplication qui causait un risque de
// dérive d'autorisation (cf. audit ARC-02).
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
  "site-vitrine": ["ADMIN", "RESPONSABLE_FORMATION"],
  blog: ["ADMIN", "RESPONSABLE_FORMATION"],
  sessions: ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"],
  planning: ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"],
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

// Rôles « personnel administratif » dont l'accès aux sections est, en plus du
// rôle, filtré par les permissions cochées sur leur compte.
export const STAFF_FILTRES: Role[] = ["RESPONSABLE_FORMATION", "ASSISTANT"];
