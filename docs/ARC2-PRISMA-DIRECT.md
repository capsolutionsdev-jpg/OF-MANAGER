# ARC-2 / TRX-5 — Accès `prisma` directs sur modèles tenant

## Constat

~235 accès directs à `@/lib/prisma` (client brut) dans `src/app` + `src/lib/actions`, contre ~194 via `getTenantDb()`. Le client brut n'injecte **pas** l'`organismeId` : chaque requête doit le filtrer **manuellement**. Un oubli = fuite de données entre organismes clients.

## Cas légitimes (à conserver en `prisma` brut)

- **Authentification** (`auth.ts`) : login par e-mail (avant de connaître l'org).
- **Flux publics par token** (`/parcours`, `/signer`, `/satisfaction`, `/positionnement`, `/compte-rendu`, `/contrat-formateur`, `/emarger`, `civique`) : la ressource est retrouvée par un token unique, pas par session.
- **Console SUPERADMIN** (`/console`) : accès multi-organismes assumé.
- **Crons / tâches système**, **modèles globaux** (`GLOBAL_MODELS` : `Organisme`, `SupportMessage`, `PlanTarif`).

## Défenses en place

1. **Garde-fou automatisé** — `src/lib/__tests__/prisma-direct-guard.test.ts` : échoue si une **nouvelle** page de l'espace connecté importe `@/lib/prisma` (allowlist des 5 cas légitimes actuels). Empêche la régression.
2. **Filet base de données** — RLS PostgreSQL (SEC-1, lot 4) : une fois **activée** (rôle non-owner + `RLS_ENABLED=true`), même un accès direct sans filtre ne verra que l'organisme du contexte `app.org`. C'est la protection de fond.

## Plan de réduction (MAJEUR, ~3–5 j, à ordonnancer)

1. Inventorier les `prisma.<modele>.{findMany,findFirst,update,delete}` sur modèles tenant dans les **server actions** (hors cas légitimes ci-dessus).
2. Migrer vers `getTenantDb()` par domaine (candidats → sessions → compta…), en vérifiant chaque `where`.
3. Étendre le garde-fou aux `src/lib/actions` (allowlist des flux publics/console).
4. Recette : les tests d'isolation (`tenant-isolation.test.ts`, branche Neon de test) restent verts.

> La RLS étant le filet, cette migration est un durcissement **défense-en-profondeur**, pas un correctif d'urgence isolé.
