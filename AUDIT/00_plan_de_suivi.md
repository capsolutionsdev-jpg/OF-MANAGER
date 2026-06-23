# Livrable 1 — Plan de suivi de l'audit

**Projet audité :** CAP Compétence Manager — plateforme de gestion interne (SaaS multi-tenant) pour organismes de formation.
**Dépôt :** `~/Desktop/cap-competence-manager`
**Date de cadrage :** 2026-06-22
**Pilote :** Chef de projet informatique (audit pluridisciplinaire)
**Nature de la mission :** audit de l'existant (le projet est déjà bien avancé) → détection failles/bugs/non-conformités → propositions de correction et d'amélioration. **Aucune modification de code à ce stade.**

---

## 0. Empreinte technique constatée (faits, non suppositions)

Constats issus de l'exploration du dépôt (sources citées) :

| Élément | Constat | Source |
|---|---|---|
| Stack | Next.js **16.2.6** (App Router), React **19.2.4**, TypeScript strict | `package.json` |
| Base de données | PostgreSQL via Prisma **6.19** ; **~80 modèles**, **~40 enums**, schéma de **1735 lignes** | `prisma/schema.prisma` |
| Auth | NextAuth **v5 beta**, adapter Prisma, bcryptjs ; middleware edge | `src/auth.ts`, `src/auth.config.ts`, `src/middleware.ts` |
| Multi-tenant | Isolation par `Organisme`, helpers `tenant.ts`, `tenant-host.ts`, `superadmin-guard.ts`, `section-guard.ts` | `src/lib/` |
| Modules métier | CRM, candidats, formations, sessions, planning, émargement, évaluations, e-learning, Qualiopi (réclamations/veille/partenaires), comptabilité (devis/factures/paiements/facture-formateur), BPF, RGPD, console superadmin, billing Stripe | `src/app/(app)/`, `src/app/console/` |
| Surface code | **~43 000 lignes** TS/TSX ; **47** fichiers `use server` ; **40+** fichiers d'actions ; **11** routes API | `src/` |
| Intégrations | Stripe, Upstash Redis (rate-limit), Vercel Blob, Anthropic SDK (IA), Yousign (signature), SMS, email | `package.json`, `src/lib/` |
| Tests existants | Vitest (unit/intégration, ~11 fichiers `lib/__tests__`), Playwright e2e (a11y, auth, export, security, smoke) | `src/lib/__tests__/`, `e2e/` |
| Sécurité déjà traitée | crypto (chiffrement clés API), CSP, anti-injection formules CSV, session unique, isolation tenant | `src/lib/crypto.ts`, `next.config.ts`, git log |
| Docs existantes | `SECURITE-multi-tenant.md`, `DEPLOIEMENT.md`, `ONBOARDING.md`, `TARIFS-et-offres.md`, `PLAN_DE_TEST.md`, `RAPPORT_DE_TEST.md` | `docs/`, racine |
| CI/CD | GitHub Actions présent ; déploiement Vercel (`vercel.json`) | `.github/`, `vercel.json` |

> Le projet n'est donc **pas** un prototype : c'est une application mature et étendue. L'audit ciblera la **profondeur** (exactitude des règles métier, conformité, sécurité réelle) plutôt que la complétude fonctionnelle.

---

## 1. Périmètre de l'audit

### Modules métier
1. **CRM** — prospects/leads multicanal, candidats, entreprises (clients pro), financeurs, pipeline, scoring, interactions, tâches.
2. **Suivi pédagogique** — formations, sessions, planning, salles, formateurs, émargements (+ signature), présences, évaluations, e-learning (cours/modules/leçons/quiz), positionnement, comptes rendus.
3. **Suivi comptable** — devis, conventions, contrats, factures, paiements, factures formateurs, financements OPCO/CPF, BPF.

### Axes transverses
4. **Architecture & dette technique** (cohérence, couplage inter-modules, scalabilité).
5. **Données** (modèle, intégrité référentielle, cohérence d'un apprenant inter-modules, indexation, reporting/export réglementaire).
6. **Qualité & tests** (couverture, cas métier critiques non testés, non-régression).
7. **DevOps / Infra** (CI/CD, hébergement UE, sauvegardes, supervision, secrets, reproductibilité).
8. **Sécurité & RGPD** (authn/authz, isolation multi-tenant, injection/XSS/CSRF, chiffrement, données personnelles/sensibles, registre, conservation, droits, sous-traitance).
9. **Métier OF (MOA)** — adéquation aux processus réels d'un organisme de formation.
10. **QUALIOPI** — section centrale : 7 critères / 32 indicateurs du RNQ, preuves traçables vs angles morts.

### Hors périmètre (déclaré)
- Le **site vitrine** public `cap-digital-academy` (dépôt distinct) — non audité ici.
- L'évaluation de la qualité *graphique*/branding (sauf impact UX/accessibilité).
- Le test de charge réel en production (seulement revue de la capacité et du smoke-load existant).

---

## 2. Phasage

| Phase | Objectif | Sortie | Statut |
|---|---|---|---|
| **Phase 1 — Audit** | Revérifier tout l'existant, sourcer chaque constat | Livrables 2 (9 fiches spécialistes) + Livrable 3 (synthèse) | ⏳ En attente du feu vert |
| **Phase 2 — Corrections prioritaires** | Traiter Critiques + Majeures (failles, bugs, non-conformités bloquantes) | PRs de correction validées une à une | ⛔ Non démarrée |
| **Phase 3 — Améliorations** | Réduction de dette, robustesse, confort, fonctionnalités au-delà des correctifs | Backlog priorisé + implémentations | ⛔ Non démarrée |

> Règle de gouvernance : **aucune modification de code sans validation explicite**. L'audit produit des constats et des propositions ; le passage en Phase 2 se fait sur décision du commanditaire, ligne par ligne du tableau de suivi.

---

## 3. Tableau de suivi (registre central des constats)

> Ce tableau est **vide à ce stade** : il sera alimenté pendant la Phase 1 par chaque spécialiste (Livrable 2), puis consolidé dans `10_synthese.md` (Livrable 3).
> Convention d'**ID** : `<PREFIXE-SPÉCIALISTE>-<n°>` — ex. `SEC-01`, `DB-03`, `QLP-07`.

| Préfixe | Spécialiste | Fichier |
|---|---|---|
| `ARC` | Architecte / Tech Lead | `01_architecture.md` |
| `BCK` | Développeur backend | `02_backend.md` |
| `FRT` | Frontend / UX | `03_frontend_ux.md` |
| `DB` | DBA / Data engineer | `04_donnees.md` |
| `QA` | QA / Testeur | `05_qualite_tests.md` |
| `OPS` | DevOps / SRE | `06_devops_infra.md` |
| `SEC` | Sécurité / RGPD | `07_securite_rgpd.md` |
| `MOA` | Business Analyst OF | `08_metier_formation.md` |
| `QLP` | Auditeur Qualiopi | `09_qualiopi.md` |

**Schéma de colonnes du registre :**

| ID | Module | Type | Sévérité | Description | Fichier:ligne | Spécialiste | Statut | Effort |
|----|--------|------|----------|-------------|---------------|-------------|--------|--------|
| _(à remplir)_ | CRM / Pédago / Compta / Transverse | faille / bug / non-conformité / amélioration | Critique / Majeure / Mineure | … | `chemin:ligne` | préfixe | À traiter / En cours / Corrigé / Reporté / Refusé | XS/S/M/L/XL |

---

## 4. Légende & critères de priorisation

### Types de constat (à distinguer strictement)
- **Bug** — comportement défaillant : « ça ne marche pas / pas comme attendu ».
- **Faille** — risque sécurité ou intégrité des données (fuite, injection, escalade, perte).
- **Non-conformité** — écart à une exigence métier (processus OF) ou réglementaire (Qualiopi, RGPD, facturation).
- **Amélioration** — au-delà de la remise en état : robustesse, performance, UX, dette technique.

### Sévérités
| Niveau | Définition | Exemples |
|---|---|---|
| **Critique** | Exploitation immédiate / perte de données / fuite inter-tenant / blocage d'un processus légal | fuite de données d'un autre organisme, facture fausse, émargement falsifiable |
| **Majeure** | Impact fort mais contournable / non-conformité documentaire / bug bloquant un workflow | indicateur Qualiopi non traçable, calcul TVA erroné, absence de droit RGPD |
| **Mineure** | Gêne, dette, incohérence sans impact direct | friction UX, libellé, index manquant non bloquant |

### Effort (échelle de charge)
`XS` < 0,5 j · `S` ≈ 1 j · `M` ≈ 2–3 j · `L` ≈ 1 sem · `XL` > 1 sem / chantier.

### Priorisation (Phase 2)
Score de priorité = **Sévérité (poids 3/2/1)** pondéré par **inverse de l'effort** et par **exposition** (faille exploitable à distance / non-conformité auditée prochainement = priorité majorée). Le Top 10 du Livrable 3 applique ce calcul.

---

## 5. Journal d'avancement

| Date | Étape | Détail |
|---|---|---|
| 2026-06-22 | Cadrage | Détection d'un écart de dépôt : prompt initialement collé dans le site vitrine `cap-digital-academy`. Redirection validée vers `cap-competence-manager`. |
| 2026-06-22 | Exploration | Cartographie de la stack, du schéma (~80 modèles), des modules et des tests existants (faits ci-dessus, section 0). |
| 2026-06-22 | Livrable 1 | Plan de suivi rédigé. **En attente du feu vert pour lancer la Phase 1 (audit complet, Livrable 2).** |
| 2026-06-23 | Re-validation | Dépôt ré-exploré : stack, schéma (~80 modèles), modules, tests (11 unit Vitest + 5 specs Playwright) et CI (`lint`+`tsc`+`vitest`, sans `build` ni e2e) confirmés. Plan inchangé, toujours valide. **En attente du feu vert.** |
| 2026-06-23 | Phase 1 · Fiches 01→09 | Audit pluridisciplinaire complet rédigé (`01`→`09`) : ~52 constats sourcés (9 critiques, ~24 majeures, ~13 mineures). |
| 2026-06-23 | Phase 1 · Synthèse | `10_synthese.md` : registre consolidé, Top 10 actions, feuille de route 3 phases, avis global, 8 propositions de fonctionnalités. **Audit terminé.** |
| 2026-06-23 | Phase 2A · Lot 1 | Correctifs (branche `chore/audit-phase-2a`) : crons authentifiés (OPS-01/02, SEC-02) ; unicité multi-tenant références + indicateurs Qualiopi (DB-01, DB-02, QLP-01) ; numérotation devis fiabilisée (BCK-01). `tsc` 0, 62 tests, base Neon synchronisée. |
| 2026-06-23 | Phase 2A · Lot 2 | `SECRETS_ENCRYPTION_KEY` obligatoire en prod (SEC-04/OPS-04) ; CI durcie (base Postgres éphémère → test d'isolation tenant exécuté + `next build`) (QA-01/02). SEC-01 constaté **déjà mitigé** par le proxy `/api/public/piece/[id]` (résiduel blob privé → Phase 3). RLS PostgreSQL (ARC-01/DB-03) **différé en Phase 3** (migration dédiée). **Phase 2A clôturée.** |
| 2026-06-23 | Phase 2B (code) | TVA exonération OF dans les devis (MOA-02/BCK-04) ; devis accepté ≠ « payé » (BCK-02/MOA-03) ; **export de portabilité RGPD** (SEC-07) ; **source unique de la matrice rôles** `lib/section-roles.ts` (ARC-02, fin de la duplication). Constat : **aucun flux de création de facture** dans le code → MOA-01/04 (numérotation/immuabilité) **sans objet tant que la fonctionnalité n'existe pas**. `tsc` 0, 62 tests, build OK. |
| 2026-06-23 | Phase 2B (transverse) | **ARC-04** : `section-guard` revalide rôle/permissions/features/compte actif en direct depuis la base (fini le JWT figé). **BCK-03** : `lib/action-result.ts` + actions devis non muettes. **FRT-01** : toasts sur les actions devis (composant client `useTransition`). **FRT-04** : axe étendu aux écrans denses (`/candidats`,`/crm`,`/sessions`,`/devis`,`/qualiopi`). **OPS-05** : baseline migrations (`docs/db-baseline.sql` + `docs/MIGRATIONS.md`). `tsc` 0, 62 tests, build OK. **Phase 2B code close** ; restent OPS-03 (hébergement), OPS-06 (backups/supervision), QLP-02 (RNQ) — en attente d'infos. |
| 2026-06-23 | Phase 3 · Lot 1 | **2FA (TOTP)** comptes à privilèges : `lib/totp.ts` (RFC 6238, test unitaire dont vecteur officiel) ; `User.totpSecret/totpEnabled` (additif) ; code exigé au login si activée ; enrôlement dans `/mon-compte` + `/console/compte`. `tsc` 0, 66 tests, build OK. |
| 2026-06-23 | Phase 3 · Lot 2 | **Export du dossier d'audit Qualiopi** (`/qualiopi/dossier`) : ZIP synthèse 32 indicateurs + preuves classées par critère/indicateur + registres (réclamations/veille/partenaires), CSV anti-injection, cloisonné tenant. `tsc` 0, build OK. |
| 2026-06-23 | Phase 3 — clôture | **Résiduel (lots dédiés / infra / décision, NON bâclés)** : RLS PostgreSQL (ARC-01), CSP à nonces (SEC-05), blobs privés (SEC-01 résiduel — déjà mitigé par le proxy), observabilité Sentry (OPS-06, compte externe), extraction `Inscription`/couche cas d'usage (ARC-03/08). À planifier hors « one-shot » (risque/migration/vérif navigateur). |

---

### Prochaine étape
Sur feu vert : production séquentielle des 9 fiches spécialistes (`01` → `09`), chacune sourcée fichier/ligne, puis consolidation dans `10_synthese.md`.
