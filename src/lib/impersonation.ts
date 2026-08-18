import type { Role } from "@prisma/client";

// =============================================================
//  IMPERSONATION « MODE SUPPORT » (SUPERADMIN → ADMIN d'un OF)
//
//  Le SUPERADMIN éditeur peut « se connecter en tant que » un organisme client
//  pour voir/diagnostiquer son espace. On bascule le TOKEN en ADMIN de l'org
//  cible (toute l'autorisation existante — middleware, getTenantDb, sections —
//  s'applique alors telle quelle, sans exception à câbler), en gardant
//  l'identité RÉELLE dans un claim `imp` pour la bannière + la sortie.
//
//  Le chemin de LOGIN n'est jamais touché : la bascule passe par le trigger
//  `update` de NextAuth. La logique de transition est isolée ici (PURE, testée).
// =============================================================

/** Claim stocké dans le JWT pendant une impersonation : identité RÉELLE à
 * restaurer + organisme ciblé. Absent = fonctionnement normal. */
export type ImpClaim = {
  realRole: Role;
  realOrganismeId: string | null;
  realFonctionnalites: string[];
  realPermissions: string[];
  orgId: string;
  orgNom: string;
};

/** Données passées à `update()` : objet pour DÉMARRER, `null` pour ARRÊTER. */
export type ImpStart = { orgId: string; orgNom: string; fonctionnalites: string[] };
export type ImpUpdatePayload = { imp: ImpStart | null };

/** Forme minimale du token manipulée par les transitions (le JWT NextAuth,
 * dont l'index signature masque les types, est casté vers ceci au point d'appel). */
export type ImpTokenLike = {
  role: Role;
  organismeId: string | null;
  fonctionnalites: string[];
  permissions: string[];
  imp?: ImpClaim | null;
};

/**
 * START (pur) : mémorise l'identité réelle puis bascule le token en ADMIN de
 * l'org cible. Refuse l'imbrication (déjà en impersonation → token inchangé,
 * pour ne jamais écraser le « réel » mémorisé).
 */
export function applyImpersonationStart<T extends ImpTokenLike>(token: T, start: ImpStart): T {
  if (token.imp) return token; // pas d'impersonation imbriquée
  token.imp = {
    realRole: token.role,
    realOrganismeId: token.organismeId,
    realFonctionnalites: token.fonctionnalites,
    realPermissions: token.permissions,
    orgId: start.orgId,
    orgNom: start.orgNom,
  };
  token.role = "ADMIN" as Role;
  token.organismeId = start.orgId;
  token.fonctionnalites = start.fonctionnalites;
  token.permissions = []; // ADMIN n'est pas filtré par permissions (cf. STAFF_FILTRES)
  return token;
}

/** STOP (pur) : restaure l'identité réelle et efface le claim. */
export function applyImpersonationStop<T extends ImpTokenLike>(token: T): T {
  if (!token.imp) return token;
  token.role = token.imp.realRole;
  token.organismeId = token.imp.realOrganismeId;
  token.fonctionnalites = token.imp.realFonctionnalites;
  token.permissions = token.imp.realPermissions;
  token.imp = null;
  return token;
}
