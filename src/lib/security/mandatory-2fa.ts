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
 * Interrupteur d'ENFORCEMENT de la 2FA obligatoire. OFF par défaut (fail-safe) :
 * la 2FA reste DISPONIBLE (activable dans « Mon compte ») mais n'est PAS imposée,
 * donc aucun risque de verrouiller un admin hors de l'application. À passer à
 * `true` via l'env `ENFORCE_ADMIN_2FA=true` UNIQUEMENT une fois la 2FA validée de
 * bout en bout en prod (enrôlement + reconnexion avec code).
 */
export const ADMIN_2FA_ENFORCED = process.env.ENFORCE_ADMIN_2FA === "true";

/**
 * L'utilisateur doit-il ENRÔLER la 2FA avant d'accéder à l'application ?
 * Vrai uniquement pour un rôle à 2FA obligatoire qui ne l'a pas encore activée.
 * Fonction pure (utilisable en couche layout serveur, testable unitairement).
 */
export function requires2faEnrollment(role: Role, totpEnabled: boolean): boolean {
  return ROLES_2FA_OBLIGATOIRE.includes(role) && !totpEnabled;
}
