# Plan de test — OFManager (cap-competence-manager)

> Document de stratégie QA. Statut : **proposition** (en attente de validation de
> l'outillage et de l'environnement de test avant génération en masse).

## 1. Objectifs & périmètre

**Objectif** : garantir la fiabilité, la sécurité et la conformité d'un SaaS
multi-tenant de gestion d'organismes de formation (Next.js 16 / TypeScript /
Prisma / Postgres Neon / next-auth v5 / Stripe).

### Sera testé (IN)
- **Cloisonnement multi-tenant** (`scopedPrisma`) — priorité absolue.
- **Authentification, rôles, sessions** (middleware, guards, session unique).
- **Server actions** (~45) : validation des entrées, autorisation, effets.
- **CRUD métier** : candidats, sessions, formations, inscriptions, factures.
- **Facturation / sièges** : formules, limites de comptes, webhook Stripe.
- **RGPD** : anonymisation, purge par durée de conservation.
- **Flux publics par token** : parcours candidat, signature, lead, dépôt de pièces.
- **API routes** : `/api/lead`, `/api/stripe/webhook`, `/api/cron/*`, `/api/upload`, `/api/public/piece`.
- **Non-fonctionnel** : sécurité (injection, XSS, autz, rate-limit, CSV injection),
  accessibilité, performance de base, gestion des erreurs.

### Ne sera PAS testé initialement (OUT)
- Tests de pénétration externes (→ audit cyber dédié).
- Charge à grande échelle / tenue en production (smoke-load seulement).
- Envois réels Brevo / paiements réels Stripe (→ mocks + mode test).
- Régression visuelle pixel-perfect des 10 skins (→ contrôle manuel).

## 2. Stratégie

**Automatisé d'abord**, manuel pour l'exploratoire et le visuel.

| Niveau | Outil | Cible |
|---|---|---|
| Unitaire | **Vitest** (déjà en place) | Fonctions pures (lib/), validateurs Zod, helpers |
| Intégration | **Vitest + DB de test isolée** | Server actions, `scopedPrisma`, requêtes Prisma |
| Système / E2E | **Playwright** (à installer) | Parcours complets sur l'app lancée |
| Accessibilité | **@axe-core/playwright** | Pages clés (login, dashboard, formulaires) |
| Sécurité | Vitest + Playwright ciblés | Injection, XSS, autz par URL, rate-limit |
| Perf / charge | **autocannon** (smoke-load) | Endpoints critiques, point de rupture indicatif |

## 3. Environnement de test

> ⚠️ **Décision critique** : les tests d'intégration/E2E **NE DOIVENT JAMAIS**
> tourner sur la base Neon de dev/prod (risque de drift et de perte de données,
> cf. règle projet). Il faut une **base isolée**.

Options (à valider) :
- **A. Postgres local via Docker** (recommandé) — isolation totale, `prisma migrate reset` libre, rapide en CI.
- **B. Branche Neon de test** — proche de la prod, nécessite le branching Neon.
- **C. Mock Prisma** — pas de DB, rapide, mais ne teste pas le SQL réel ni le scoping.

**Jeux de données** : script de seed de test (tenant A, tenant B pour vérifier
l'isolation, comptes par rôle). **Comptes de test** :
- SUPERADMIN (éditeur) · ADMIN (gérant tenant A) · RESPONSABLE_FORMATION · ASSISTANT · FORMATEUR · APPRENANT · + un ADMIN tenant B (test d'isolation).

## 4. Critères d'entrée / sortie

**Entrée** : build vert, lint+typecheck OK, DB de test provisionnée + seedée.

**Sortie (Go)** :
- 100 % des cas de test exécutés.
- ≥ 95 % de réussite.
- **0 bug bloquant ou critique** ouvert (notamment : 0 fuite inter-tenant, 0 contournement d'autorisation).

## 5. Zones à risque (loi 80/20 — à prioriser)

1. **`scopedPrisma` / isolation multi-tenant** — une fuite = critique. *Aucun test aujourd'hui.*
2. **Autorisation** (middleware `SECTION_ROLES`, `requireSuperAdmin`, session unique) — escalade de privilèges.
3. **Facturation & sièges** (webhook Stripe, enforcement des comptes, résolution des prix/MRR).
4. **RGPD** (anonymisation, purge) — perte de données / non-conformité.
5. **Flux publics par token** (parcours, signer, lead, dépôt de pièces) — surface non authentifiée.
6. **Uploads & génération de documents** (magic-bytes, PDF, proxy de pièces).

## 6. Niveaux & types couverts

- **Unitaire** : cas valides / invalides / **valeurs aux limites** (0, -1, max, max+1, vide, très long).
- **Intégration** : action → DB, front → API, formats de données, connexions.
- **Système** : application complète, fonctionnel + non-fonctionnel.
- **E2E** : inscription → connexion → action métier → déconnexion.
- **Fonctionnels** : smoke, positifs, négatifs, limites, **régression** (suite rejouable).
- **Non-fonctionnels** : performance, charge/stress, sécurité, compatibilité, accessibilité, gestion d'erreurs.

## 7. Format des cas de test

Chaque cas : `ID` · titre explicite · pré-condition · étapes · données de test ·
résultat attendu · **priorité** (P1/P2/P3). Nommage lisible
(`TU-TENANT-01`, `E2E-INSCRIPTION-01`, `SEC-INJECTION-01`…).

## 8. Risques & livrables

**Risques projet** : DB partagée (mitigé par DB isolée), dépendances externes
(mitigé par mocks), couverture initiale faible (mitigé par priorisation 80/20).

**Livrables** : `PLAN_DE_TEST.md` (ce document), suites de tests par niveau,
intégration CI, `RAPPORT_DE_TEST.md` (synthèse + bugs + Go/No-Go).

## 9. Commande unique
```
npm run test        # unitaires + intégration (Vitest)
npm run test:e2e    # E2E + a11y + sécurité (Playwright)
```

## 10. Activer les tests d'écriture / isolation (branche Neon de test)

Les tests qui ÉCRIVENT en base (isolation multi-tenant, CRUD) sont **auto-ignorés**
tant que `DATABASE_URL_TEST` n'est pas défini → ils ne touchent jamais la base de
dev/prod. Pour les activer (≈ 2 min) :

1. **Créer une branche Neon de test** (console Neon → *Branches* → *New branch*, ou
   `neonctl branches create`). Copier sa chaîne de connexion.
2. **Provisionner le schéma** sur la branche :
   ```
   DATABASE_URL_TEST="postgres://…branche-test…" npx prisma db push
   ```
3. **(optionnel) Seed** de 2 organismes + gérants + données :
   ```
   DATABASE_URL_TEST="postgres://…" node scripts/seed-test.cjs
   ```
   → `admin-a@test.local` / `admin-b@test.local` (mdp `Test1234!`).
4. **Lancer les tests** : Vitest redirige Prisma vers cette base (cf.
   `src/test/setup-db.ts`) et exécute alors l'isolation multi-tenant :
   ```
   DATABASE_URL_TEST="postgres://…" npm run test
   ```

Sous Windows PowerShell : `$env:DATABASE_URL_TEST="postgres://…"; npm run test`.

> La branche Neon est jetable (`prisma migrate reset` / suppression libre) :
> aucun risque pour la base principale.
