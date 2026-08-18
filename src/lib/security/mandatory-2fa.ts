import type { Role } from "@prisma/client";

/**
 * Rôles à hauts privilèges pour lesquels la double authentification (TOTP) est
 * OBLIGATOIRE (§11) :
 *  - `ADMIN` = gérant de l'organisme (accès complet au tenant, gestion des comptes) ;
 *  - `SUPERADMIN` = éditeur de la plateforme (accès à TOUS les tenants + console).
 *
 * Les autres rôles staff (RESPONSABLE_FORMATION, ASSISTANT) et non-staff
 * (FORMATEUR, APPRENANT) peuvent activer la 2FA mais n'y sont pas contraints.
 */
export const ROLES_2FA_OBLIGATOIRE: Role[] = ["ADMIN", "SUPERADMIN"];

/**
 * L'utilisateur doit-il ENRÔLER la 2FA avant d'accéder à l'application ?
 * Vrai uniquement pour un rôle à 2FA obligatoire qui ne l'a pas encore activée.
 * Fonction pure (utilisable en couche layout serveur, testable unitairement).
 */
export function requires2faEnrollment(role: Role, totpEnabled: boolean): boolean {
  return ROLES_2FA_OBLIGATOIRE.includes(role) && !totpEnabled;
}
