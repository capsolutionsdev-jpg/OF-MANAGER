# OFManager — Remédiation & re-test (Phases 47/48)

> Branche : `security/audit-remediation` (base `origin/main` @ `7a198cd`).
> Vérification globale : `tsc --noEmit` **OK**, `eslint` **OK**, `vitest` **800 passed / 6 skipped / 0 échec**,
> `npm audit --omit=dev` **0 critical** (était 1).

## Correctifs appliqués (scope : blocker + motif racine BFLA + bump next)

| Finding | Statut | Commit | Détail |
|---|---|---|---|
| **OFM-03** XSS stockée `photoUrl` | **FIXED** | `30fa92d` | `isSafeImageDataUrl()` (base64 strict) appliqué au **rendu** (`resolve.ts`) + aux **écritures** (parcours/candidat/prospect). Test dédié. |
| **OFM-13** XSS signatures PDF | **FIXED** | `30fa92d` | Les 4 sinks `<img src>` de `build-pdf.ts` (signatures stagiaire/satisfaction/formateur) validés avant rendu. |
| **OFM-01** BFLA client-pro (ENTREPRISE) | **FIXED** | `f31a922` | `requireUser()` rejette `ENTREPRISE` + vérification d'appartenance de `entrepriseId` au tenant. |
| BFLA formateur | **FIXED** | `f31a922` | `createFormateur`/`updateFormateur` → check `STAFF`. |
| BFLA blog/vitrine | **FIXED** | `f31a922` | `article-actions`/`photo-vitrine-actions` → `requireStaffTenant()`. |
| BFLA qualiopi/t3p/registre | **FIXED** | `f31a922` | Garde `isNonStaffRole()` sur toutes les actions. |
| BFLA positionnement | **FIXED** | `f31a922` | `requireUser()` rejette `ENTREPRISE`. |
| BFLA contrat-formateur/compte-rendu | **FIXED** | `f31a922` | `sendContratFormateur`/`sendCompteRendu` (actions exportées) gardées personnel. |
| BFLA validation | **FIXED** | `f31a922` | `ctx()` rejette non-staff + section `validations` ajoutée à `SECTION_ROLES`. |
| **OFM-02** `next@16.3.1` RCE | **FIXED** | `4b64788` | Bump → `next@16.3.6` (≥16.3.3). `next` disparaît de l'audit prod. |

**Nouveau primitif** : `isNonStaffRole()` (source unique, `permissions.ts`) + 2 tests de non-régression
(`non-staff-role.test.ts`, `escape-image-dataurl.test.ts`).

**Propriété de sûreté** : toutes les modifications de garde sont *strictement plus restrictives*
pour les rôles non-staff et *neutres* pour le personnel → aucun accès légitime cassé
(confirmé par 800 tests verts).

## Re-test des vecteurs (Phase 48)

- XSS `photoUrl`/signatures : la charge `data:image/png;base64,x" onerror=…` est désormais **rejetée**
  au rendu comme à l'écriture (test `escape-image-dataurl.test.ts` — le payload exact échoue).
- BFLA `ENTREPRISE` : les actions de gestion lèvent « Non autorisé » pour tout rôle non-staff
  (`isNonStaffRole` / `requireStaffTenant`). Vérifié par lecture de code + typecheck + suite.
- `next` : `npm audit --omit=dev` ne liste plus `next` (0 critical).

## Reste à traiter (fast-follow — NON inclus dans cette branche)

Medium : OFM-11 (assertLiveSession sur `document-actions`/`manual-send-actions` `staffOrg()`),
OFM-12 (stack trace prod `parcours/[token]/documents`), OFM-14 (injection formule CSV compta/FEC),
OFM-15 (AuditLog sur exports de masse), OFM-16 (effacement RGPD `EmailLog`/`SmsLog`),
OFM-18 (`entrepriseId` devis).
Hardening : token invitation haché, Blob privé + URL signée, CORS civique, anti-rejeu Wedof,
idempotence paiement/provisioning, Cache-Control PDF privés, raffinement ASSISTANT sur les
sections qui l'excluent (blog/vitrine/formateurs/qualiopi — actuellement `requireStaffTenant`
autorise ASSISTANT, que le middleware bloque déjà par URL).

Détail complet des findings restants : `FINDINGS.md` / `findings-raw.json`.
