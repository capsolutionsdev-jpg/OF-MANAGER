# Rapport de test — OFManager (cap-competence-manager)

> Campagne QA automatisée. Date : 2026-06 · Env : Windows 11, Node + Next.js 16
> (mode dev), Vitest 4, Playwright (Chromium), base Neon de développement.
> Réf. stratégie : `PLAN_DE_TEST.md`.

## 1. Synthèse

| Indicateur | Valeur |
|---|---|
| Tests exécutés | **76** |
| — Unitaires (Vitest) | 50 |
| — Intégration (Vitest, Prisma mocké) | 11 |
| — E2E + a11y + sécurité (Playwright) | 15 |
| **Taux de réussite** | **100 %** (76/76) |
| Bugs **bloquants / critiques** ouverts | **0** |
| Bugs majeurs / mineurs / cosmétiques | 1 / 3 / 1 |

**Commandes** : `npm test` (unit + intégration) · `npm run test:e2e` (Playwright).

## 2. Couverture par niveau

- **Unitaire** : formules & sièges (`planKeyForOrg`, comptes inclus 3/5/∞, 20 €),
  chiffrement des secrets (roundtrip, héritage clair), validateurs (positif /
  négatif / **valeurs aux limites**), rate-limit, anti-injection CSV, détection
  de type de fichier (magic-bytes).
- **Intégration** (Prisma simulé) : résolution des formules (overrides + défauts),
  logique de sièges (override prioritaire, exclusion apprenants/formateurs),
  purge RGPD (filtre tenant + butoir par organisme).
- **E2E** : smoke (vitrine, login, tarifs, 404), authentification & autorisation
  (route protégée → login, client → dashboard, SUPERADMIN → console, mauvais
  mot de passe).
- **Accessibilité** (axe) : 0 violation **critique** sur `/login` et `/dashboard`.
- **Sécurité** : en-têtes (CSP `object-src 'none'`, HSTS, X-Frame-Options,
  nosniff) ; **injection SQL au login → aucun contournement** ; **XSS → aucun
  script exécuté** ; accès direct aux routes protégées → bloqué.
- **Performance (smoke-load)** : `/login`, 10 connexions / 10 s → 150 requêtes,
  **0 erreur**, ~14 req/s, latence p99 ≈ 756 ms *(mode dev, indicatif)*.

## 3. Bugs détectés (par sévérité)

### 🟠 BUG-01 — Contraste de couleur insuffisant (tableau de bord) · **Majeur**
- **Repro** : se connecter (client) → `/dashboard` → scan axe-core.
- **Attendu** : contraste texte/fond conforme WCAG 2.1 AA (≥ 4.5:1).
- **Obtenu** : violation axe `color-contrast` (gravité *serious*) sur certains
  textes secondaires.
- **Env** : Chromium, dashboard tenant.
- **Correctif** : assombrir `--muted-foreground` / libellés secondaires sur les
  surfaces concernées.

### 🟡 BUG-02 — Champs texte sans longueur maximale · **Mineur**
- **Repro** : `candidatFormSchema.safeParse({ nom: "x".repeat(5000), … })`.
- **Attendu** : rejet au-delà d'une borne raisonnable (ex. 200 car.).
- **Obtenu** : accepté (aucune borne max) → risque d'abus / stockage.
- **Correctif** : ajouter `.max(...)` aux validateurs (nom, prénom, adresse…).

### 🟡 BUG-03 — `<h1>` absent sur `/login` · **Mineur**
- **Repro** : axe sur `/login` → `page-has-heading-one` (moderate).
- **Attendu** : un titre de niveau 1 par page (structure / lecteurs d'écran).
- **Correctif** : ajouter un `<h1>` (visuellement ou en `sr-only`).

### 🟡 BUG-04 — Landmark non unique (tableau de bord) · **Mineur**
- **Repro** : axe sur `/dashboard` → `landmark-unique` (moderate).
- **Correctif** : différencier les régions (aria-label) dupliquées.

### ⚪ BUG-05 — `next/image` sans `sizes` (logo) · **Cosmétique**
- **Repro** : console navigateur à l'affichage du logo.
- **Obtenu** : avertissement de performance Next.
- **Correctif** : ajouter `sizes` sur les `<Image fill>`.

> **Aucune fuite inter-tenant, aucun contournement d'autorisation, aucune
> injection SQL/XSS réussie** n'a été détecté.

## 4. Critères de sortie

| Critère | Cible | Atteint |
|---|---|---|
| Cas exécutés | 100 % | ✅ |
| Réussite | ≥ 95 % | ✅ 100 % |
| Bug bloquant/critique ouvert | 0 | ✅ |

## 5. Limites de la campagne (à compléter)

- **Parcours d'écriture (CRUD) & isolation tenant réelle** : non encore exécutés
  — prévus sur une **branche Neon de test** (`DATABASE_URL_TEST`), pour ne pas
  toucher la base de dev.
- **Charge** : smoke uniquement, en **mode dev** → rejouer sur un **build de
  production** pour des chiffres représentatifs.
- **Compatibilité** : seul Chromium testé (ajouter Firefox/WebKit + mobile).

## 6. Recommandation : **GO conditionné** ✅

Le socle est sain : **0 bug bloquant ou critique**, sécurité et autorisations
validées, logique métier critique couverte. Avant lancement public :
1. Corriger **BUG-01** (contraste) et les mineurs **BUG-02/03/04**.
2. Définir les env de prod : `SECRETS_ENCRYPTION_KEY`, `UPSTASH_*`, `STRIPE_*`.
3. Provisionner la branche Neon de test et activer les tests d'écriture/isolation.
4. Rejouer le load-test sur build de production.
