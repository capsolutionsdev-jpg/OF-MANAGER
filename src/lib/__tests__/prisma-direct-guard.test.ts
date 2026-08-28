import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Garde-fou d'isolation multi-tenant (ARC-2 / TRX-5).
 *
 * Les pages de l'espace connecté doivent lire les données via `getTenantDb()`
 * (scoping automatique par organisme), et NON via le client brut `@/lib/prisma`
 * (qui exige un filtre `organismeId` manuel — un oubli = fuite entre organismes).
 *
 * Ce test échoue si une NOUVELLE page importe `@/lib/prisma` directement. Les
 * cas légitimes existants (admin, profil, RGPD, layout, module de validations
 * générique) sont explicitement recensés ci-dessous. Réduire cette liste au fil
 * de l'eau ; ne JAMAIS l'agrandir sans justification.
 */
const ALLOWLIST = new Set([
  "administration/page.tsx",
  "layout.tsx",
  "mon-compte/page.tsx",
  "rgpd/page.tsx",
  "validations/page.tsx",
  // Wedof : lit UNIQUEMENT l'Organisme de la session (where { id: orgId de session })
  // pour l'état de connexion ; les dossiers de financement passent par getTenantDb.
  "financements/page.tsx",
  // Site vitrine : TOUTES les données tenant (formations, sessions) passent par
  // getTenantDb() ; le client brut ne lit QUE le User de la session
  // (where { id: session.user.id }, entité d'auth GLOBALE) pour la permission
  // « blog ». Self-scopé, hors-tenant — même motif que mon-compte/administration.
  "site-vitrine/page.tsx",
]);

/**
 * Détecte un accès au client Prisma BRUT (non cloisonné), sous ses deux formes :
 *  - import depuis `@/lib/prisma` (client brut / prismaBase) ;
 *  - import de `bypassPrisma` depuis `@/lib/tenant` (client en mode BYPASS RLS).
 * (Correctif audit P2-9 : la seconde forme échappait à la garde.)
 */
function usesRawPrisma(src: string): boolean {
  return (
    /from ["']@\/lib\/prisma["']/.test(src) ||
    /import[^;]*\bbypassPrisma\b[^;]*from\s*["']@\/lib\/tenant["']/.test(src)
  );
}

const APP_DIR = path.resolve(__dirname, "../../app/(app)");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.endsWith(".tsx")) out.push(full);
  }
  return out;
}

describe("Garde-fou : pas d'accès prisma direct dans les pages (app)", () => {
  it("aucune page hors allowlist n'importe @/lib/prisma", () => {
    const offenders: string[] = [];
    for (const file of walk(APP_DIR)) {
      const rel = path.relative(APP_DIR, file).replace(/\\/g, "/");
      const src = readFileSync(file, "utf8");
      if (usesRawPrisma(src) && !ALLOWLIST.has(rel)) {
        offenders.push(rel);
      }
    }
    expect(
      offenders,
      `Ces pages doivent utiliser getTenantDb() au lieu de @/lib/prisma :\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});

/**
 * Même garde-fou pour les SERVER ACTIONS (OBS-1). Une action tenant-facing doit
 * muter via `getTenantDb()` (scoping auto). Le client brut `@/lib/prisma` reste
 * légitime pour des cas précis (flux PUBLICS tokenisés sans session, console
 * SUPERADMIN, facturation/Stripe liée à l'org, seed démo, TOTP du compte courant).
 * Ces cas sont recensés ci-dessous.
 *
 * ⚠️ Ce test échoue si une NOUVELLE action importe `@/lib/prisma`. Avant d'ajouter
 * un fichier à l'allowlist, VÉRIFIER qu'il applique bien le motif « vérifier-puis-
 * muter » (`findFirst({ id, organismeId })` avant toute écriture) ou qu'il est
 * intrinsèquement hors-tenant. Idéalement, réduire cette liste au fil de l'eau.
 */
const ACTIONS_ALLOWLIST = new Set([
  // Flux PUBLICS (résolus par token, pas de session → pas de getTenantDb)
  "parcours-actions.ts",
  "public-inscription-actions.ts",
  "dossier-actions.ts",
  "prospect-actions.ts",
  "compte-rendu-actions.ts",
  "contrat-formateur-actions.ts",
  "emargement-signature-actions.ts",
  "apprenant-actions.ts",
  "manual-send-actions.ts",
  // Compte client B2B (rôle ENTREPRISE) : même motif que apprenant-actions —
  // lit l'Entreprise via getTenantDb() (findFirst { id, organismeId }) AVANT toute
  // écriture, puis crée/lie le User via le client brut (entité GLOBALE, unicité
  // e-mail cross-tenant). Vérifier-puis-muter respecté (l'AuditLog, lui, passe
  // par getTenantDb()).
  "entreprise-account-actions.ts",
  "document-actions.ts",
  "session-guard-actions.ts",
  "session-validation-actions.ts",
  // Console SUPERADMIN / hors-tenant
  "console-actions.ts",
  // Contrat de prestation éditeur↔OF : opère sur ContratPrestation + Organisme
  // (données éditeur GLOBALES, pas tenant-scoped). create/send gardés
  // requireSuperAdmin ; la signature publique est résolue par token (sans session).
  "contrat-prestation-actions.ts",
  "contrat-prestation-public.ts",
  // Facturation éditeur : FactureEditeur + Organisme (données éditeur GLOBALES),
  // gardé requireSuperAdmin. Hors-tenant.
  "facture-editeur-actions.ts",
  // Abonnement/SEPA éditeur : Organisme + Stripe (données éditeur globales),
  // gardé requireSuperAdmin. Hors-tenant.
  "console-billing-actions.ts",
  // Impersonation « mode support » : lit Organisme + écrit AuditLog (données
  // éditeur globales), gardé requireSuperAdmin. Hors-tenant.
  "impersonation-actions.ts",
  // Sync SSIAP au déploiement : garde requireSuperAdmin + scope explicite par
  // organismeId (CAP), updateMany où { reference, organismeId } — hors-tenant.
  "ssiap-config.ts",
  // Garde SUPERADMIN explicite ; provisionne le catalogue d'un tenant cible
  // (creates scopes par organismeId passe en argument, verifie en base).
  "formations-config-actions.ts",
  "superadmin-account-actions.ts",
  "organisme-actions.ts",
  "agrements-actions.ts",
  "demo-actions.ts",
  "civique-actions.ts",
  "growth-actions.ts",
  // Compte courant / facturation / paramètres
  "totp-actions.ts",
  "billing-actions.ts",
  // Cycle de vie démo : mute la ligne Organisme du tenant courant (id de session),
  // après vérification isDemo — pas de données filles, getTenantDb inapplicable.
  "demo-lifecycle-actions.ts",
  "pricing-actions.ts",
  "notification-actions.ts",
  // Scopés manuellement par organismeId (updateMany where {id, organismeId})
  "devis-actions.ts",
  "support-actions.ts",
  "depense-actions.ts",
  "validation-actions.ts",
  "formateur-actions.ts",
  "jury-actions.ts",
  // AutomationSettings cloisonné par organisme : upsert avec where explicite
  // { organismeId } (unique) + garde STAFF_ADMIN. Client brut légitime.
  "automation-settings-actions.ts",
  // Wedof : mute UNIQUEMENT l'Organisme de la session (requireAdminOrg = id de
  // session) ; garde ADMIN — scoping manuel explicite (motif vérifier-puis-muter).
  "financements-actions.ts",
  // E-learning : tout passe par getTenantDb ; prismaBase (RLS) n'est utilisé que
  // pour l'échange atomique d'ordre sur des entités DÉJÀ vérifiées in-tenant (txWithOrg).
  "cours-actions.ts",
]);

const ACTIONS_DIR = path.resolve(__dirname, "../actions");

function walkTs(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walkTs(full));
    else if (entry.endsWith(".ts")) out.push(full);
  }
  return out;
}

describe("Garde-fou : pas d'accès prisma direct dans les server actions", () => {
  it("aucune action hors allowlist n'importe @/lib/prisma", () => {
    const offenders: string[] = [];
    for (const file of walkTs(ACTIONS_DIR)) {
      const rel = path.relative(ACTIONS_DIR, file).replace(/\\/g, "/");
      const src = readFileSync(file, "utf8");
      if (usesRawPrisma(src) && !ACTIONS_ALLOWLIST.has(rel)) {
        offenders.push(rel);
      }
    }
    expect(
      offenders,
      `Ces actions doivent utiliser getTenantDb() (ou être ajoutées à l'allowlist si le cas est légitime) :\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});
