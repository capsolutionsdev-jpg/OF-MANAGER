# 05 — QA / Testeur

> Fiche d'audit (Livrable 2). Constats sourcés. **Aucune correction appliquée.**

## QA / Testeur

### 1. Périmètre analysé
- Tests unitaires/intégration Vitest : [src/lib/__tests__/](../src/lib/__tests__/) — 11 fichiers (`utils`, `scoring`, `sms`, `security`, `plans`, `crypto`, `seats`, `rgpd-retention`, `pricing`, `tenant-isolation`, `validators`).
- E2E Playwright : [e2e/](../e2e/) — `auth`, `security`, `a11y`, `export-smoke`, `smoke`.
- CI : [.github/workflows/ci.yml](../.github/workflows/ci.yml).
- Plan/Rapport existants : `PLAN_DE_TEST.md`, `RAPPORT_DE_TEST.md`.

### 2. Constats — couverture & non-régression

| ID | Description | Fichier:ligne | Sévérité | Impact |
|----|-------------|---------------|----------|--------|
| QA-01 | **Le test d'isolation multi-tenant ne s'exécute pas en CI.** `tenant-isolation.test.ts` est conditionné à `DATABASE_URL_TEST` (sinon `describe.skip`), variable absente du workflow CI → le contrôle le plus critique du SaaS **n'est jamais vérifié automatiquement**. | [tenant-isolation.test.ts](../src/lib/__tests__/tenant-isolation.test.ts), [ci.yml:39-40](../.github/workflows/ci.yml) | Majeure | Régression d'isolation indétectée (renvoi ARC-01, DB-03). |
| QA-02 | **CI sans `build` ni e2e.** Le pipeline fait `lint` + `tsc` + `vitest`, mais ni `next build` ni Playwright → une régression de build ou de parcours utilisateur passe la CI. | [ci.yml:33-41](../.github/workflows/ci.yml) | Majeure | Déploiement d'un build cassé possible ; e2e non garants. |
| QA-03 | **Cœurs métier critiques non testés.** Aucun test sur : totaux/TVA/numérotation devis-facture (BCK-01/02/04), moteur d'automatisation du parcours, génération PDF/documents, agrégation BPF, webhook Stripe. | `src/lib/__tests__/` (absences) | Majeure | Les règles à plus fort risque financier/réglementaire ne sont pas couvertes. |
| QA-04 | **Pas de seuil de couverture ni de tests d'intégration base réelle en CI.** La couverture n'est pas mesurée ; les tests touchant la base s'auto-ignorent. | `ci.yml`, `vitest.config.ts` | Mineure | Couverture réelle inconnue, possiblement faible sur le métier. |
| QA-05 | **E2E centrés rendu/sécurité, peu de parcours métier de bout en bout** (créer une session → inscrire → émarger → facturer → BPF). | [e2e/](../e2e/) | Mineure | Régressions fonctionnelles transverses non captées. |

### 3. Corrections proposées
- **QA-01** : provisionner une **base de test** (branche Neon éphémère ou Postgres service container) dans la CI et exécuter `tenant-isolation` + tests d'intégration à chaque PR.
- **QA-02** : ajouter `next build` à la CI ; lancer Playwright (au moins `@smoke`/`@compat`) sur un serveur démarré en CI.
- **QA-03** : tests unitaires ciblés sur la logique financière (totaux, TVA selon `assujettiTva`, numérotation atomique) et le moteur de parcours.
- **QA-04** : activer `--coverage` avec un seuil minimal et le publier.

### 4. AVIS DU SPÉCIALISTE
**Bonnes fondations de test, mais elles ne couvrent pas (et la CI ne garantit pas) les risques les plus élevés.** Il existe un vrai socle (11 fichiers unitaires, e2e a11y/sécurité, plan/rapport documentés) — c'est au-dessus de la moyenne pour un projet de cet âge. Le problème est l'**alignement risque ↔ couverture** : le contrôle d'isolation tenant est *écrit* mais *jamais exécuté en CI* (QA-01), la facturation et le parcours ne sont pas testés (QA-03), et la CI ne build ni ne joue les e2e (QA-02). Autrement dit, **le vert de la CI donne une fausse assurance** sur les zones critiques. Priorité : faire tourner l'isolation et le métier financier en CI.

### 5. AMÉLIORATIONS À AJOUTER
1. **Pipeline de test à étages** : unit (rapide) → intégration base (PR) → e2e (pré-merge) → smoke prod post-déploiement.
2. **Données de test reproductibles** (`seed-test`) + factories.
3. **Tests de non-régression visuels** (Playwright screenshots) sur les écrans clés.
4. **Test de charge** ciblé (autocannon déjà présent) sur login + listes denses.
