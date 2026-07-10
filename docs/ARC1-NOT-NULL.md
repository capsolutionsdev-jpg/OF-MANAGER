# ARC-1 — Passage `organismeId NOT NULL` : constats & plan

## ✅ Mise à jour — backfill effectué (2026-07)
Les orphelins **dérivables** ont été rattachés à leur tenant (via leurs relations) :
**11 lignes corrigées** — EmailLog (7, via `session`), AuditLog (4, via l'entité CRM), + la
paire candidat/interaction dérivable. **Reste : 2 `User` SUPERADMIN (NULL légitime)** et
**1 candidat orphelin** sans aucune inscription (donnée non rattachable → décision : suppression
recommandée, ou attribution manuelle).

**Exceptions assumées (rester nullable)** : `User` (SUPERADMIN), `AuditLog` (événements
système/login), `EmailLog` (e-mails niveau éditeur/prospect) — ces trois tables ont des cas
org-less légitimes ; leurs nuls résiduels ont été nettoyés mais la **colonne reste nullable**.

**Reste à faire pour le `NOT NULL` de contrainte** : (1) trancher le candidat orphelin ;
(2) appliquer `organismeId String` (NOT NULL) sur les tables métier hors exceptions +
`GLOBAL_MODELS`, après vérification qu'aucun flux n'insère de nul (getTenantDb injecte toujours
l'org ; risque résiduel sur d'éventuels `prisma.create` directs à auditer). Opération de contrainte
= fenêtre contrôlée (non bâclée), la **donnée est désormais propre**.

## Résultat du scan (`node scripts/check-null-org.mjs`)

60 tables tenant analysées. **15 lignes** avec `organismeId IS NULL` :

| Table | Nb NULL | Nature | Action |
|---|---|---|---|
| `User` | 2 | **Intentionnel** — comptes **SUPERADMIN** (éditeur, « hors organisme ») | **Garder nullable** (exception explicite) |
| `EmailLog` | 7 | E-mails système envoyés sans `organismeId` (certains `sendEmail`/logs de flux publics) | Corriger les sites d'insert + backfill |
| `AuditLog` | 4 | Événements sans org (ex. `LOGIN` avant résolution de l'org) | Garder nullable **ou** backfill best-effort |
| `Candidat` | 1 | Orphelin/legacy | **Backfill** (rattacher au bon OF) ou purge |
| `CandidatInteraction` | 1 | Orphelin lié au candidat ci-dessus | **Backfill** / purge |

## Conclusion : NE PAS appliquer `NOT NULL` en l'état

- Un `NOT NULL` global **échouerait** (lignes NULL présentes) et **casserait** des cas légitimes (`User` SUPERADMIN).
- `EmailLog` NOT NULL ferait **échouer** des envois existants (ex. certains e-mails de convocation insèrent un `EmailLog` sans `organismeId`) → régression du parcours de signature.

## Plan de remédiation (séquencé, à valider)

1. **Exceptions assumées** : `User` (SUPERADMIN) et `AuditLog` (événements système) restent **nullable** → à ajouter à une liste `NULLABLE_ORG_MODELS` documentée, cohérente avec `GLOBAL_MODELS`.
2. **Corriger les sites d'insertion** qui omettent `organismeId` :
   - `EmailLog` : passer `organismeId` à **tous** les `prisma.emailLog.create` (ex. e-mails de convocation/bienvenue dans `src/lib/actions/parcours-actions.ts` en insèrent sans org).
   - Vérifier `CandidatInteraction`.
3. **Backfill** des orphelins réels (`Candidat`, `CandidatInteraction`, `EmailLog`) : script `scripts/backfill-org.mjs` (à écrire) rattachant chaque ligne à son OF via une relation parente (ex. `Candidat.formationSouhaitee`/inscription → session → organisme), sinon décision manuelle (rattachement ou purge).
4. **Re-scanner** (`check-null-org.mjs`) → 0 NULL sur les tables ciblées.
5. **Passer `NOT NULL`** sur les tables **hors exceptions** (schéma `organismeId String`) + `prisma db push` (opération verrouillante brève).
6. **DAT-1** : auditer les FK sans `onDelete` explicite (34 règles présentes) et compléter les cascades.

## Pourquoi c'est différé (et non bâclé)

Cette étape touche l'intégrité de données de prod et exige un backfill raisonné + la correction des sites d'insertion, **sans** casser les flux (signature, e-mails). Elle doit être menée en fenêtre contrôlée avec vérification, pas en une passe automatique. Le scan et le plan sont livrés ; l'application du `NOT NULL` reste une action explicite à ordonnancer.
