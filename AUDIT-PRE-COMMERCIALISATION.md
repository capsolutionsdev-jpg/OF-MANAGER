# RAPPORT D'AUDIT GÉNÉRAL — PRÉ-COMMERCIALISATION
## Plateforme CAP Compétences / OFManager — gestion d'organismes de formation (SaaS multi-tenant)

> Audit final avant mise sur le marché. Chef de projet : audit logiciel senior.
> Périmètre : code source réel du dépôt `cap-competence-manager` (Next.js 16 / React 19 / Prisma 6 / Neon Postgres / next-auth v5 / Vercel).
> Date : 2026-07. Cible : commercialisation SaaS B2B auprès d'autres organismes de formation.

---

## 0. SYNTHÈSE EXÉCUTIVE

**Verdict global : 🟠 FEU ORANGE — commercialisation possible après levée des points BLOQUANTS (estimés ~2 à 4 semaines).**

La plateforme est **nettement plus mature** qu'un produit pré-lancement typique. Points forts vérifiés dans le code :

- **Cloisonnement multi-tenant applicatif systématique** (`scopedPrisma` injecte/filtre `organismeId` sur toutes les opérations — `src/lib/tenant.ts`), avec **RLS PostgreSQL déjà conçue** (flag `RLS_ENABLED`).
- **Contrôle d'accès par rôle + permissions + fonctionnalités** dans le middleware (`src/auth.config.ts`), robuste (bloque l'accès par URL directe).
- **Aucun secret en dur** dans le code, `.env*` non versionné, mots de passe **bcrypt**.
- **Rate-limiting** (Upstash) + **CSP** (à nonces, flag `CSP_NONCE`) + **purge RGPD automatisée** (cron `rgpd-purge`).
- **Suite de tests** (12 fichiers) + **CI** (`.github/workflows/ci.yml`).
- **Facturation civique** avec mention TVA correcte (art. 261-4-4°a CGI).

Mais **5 points bloquants** et plusieurs majeurs subsistent **spécifiquement pour un usage multi-clients externes payants** — détaillés ci-dessous.

### Feux par domaine

| Domaine | Feu | Commentaire |
|---|---|---|
| Architecture multi-tenant | 🟠 | Scoping applicatif solide, mais `organismeId` nullable partout + RLS non activée |
| Cybersécurité | 🟠 | Bonnes bases ; défense en profondeur (RLS) à activer, env prod à compléter |
| RGPD | 🟠 | Purge + registre partiels ; **DPA sous-traitance manquant** pour le SaaS |
| Qualiopi | 🟢/🟠 | Preuves structurées ; matrice de conservation à réconcilier avec RGPD |
| Comptabilité/facturation | 🟠 | TVA OK ; **numérotation séquentielle des factures à formaliser** |
| Juridique (SaaS B2B) | 🔴 | CGV SaaS / SLA / réversibilité / DPA **à produire** |
| QA / fonctionnel | 🟠 | Bug de rôle corrigé ce jour ; classe de bugs à re-balayer |
| UX / accessibilité | 🟠 | Non audité RGAA/WCAG (obligation financements publics) |
| DevOps / infra | 🟢/🟠 | Vercel+Neon (UE à confirmer) ; PRA/restauration à tester |
| Intégrité des données | 🟠 | 34 `onDelete` ; nullable org = risque d'orphelins |

---

## 1. PHASE 1 — CADRAGE (périmètre réel)

**Modules identifiés (routes `src/app/(app)`)** : dashboard, CRM (prospects/candidats/entreprises), sessions & planning, émargement signé, positionnement, satisfaction (stagiaire/entreprise/OPCO), suivi 6 mois, e-learning (cours/apprenants/quiz), documents (conventions, convocations, attestations, certificats, contrats formateur), comptabilité/devis/paiements, BPF, Qualiopi/RGPD, administration des comptes, validations, examen-civique (produit e-learning + facturation en ligne Stripe), console SUPERADMIN (éditeur multi-organismes).

**Flux publics tokenisés** (hors auth) : `/prospect`, `/parcours`, `/signer`, `/satisfaction*`, `/positionnement`, `/reclamer`, `/compte-rendu`, `/contrat-formateur`, `/emarger`, `/devis-accept`, `/api/public/*`, `/api/stripe/*`, `/api/civique/*`.

**Documents générés (PDF)** : `src/lib/documents/` (build-pdf, templates, certificat-signature, zip du dossier).

**Modèle de données** : Prisma, ~1500 lignes de schéma, **47 modèles portant `organismeId`**, 34 règles `onDelete`.

---

## 2. PHASE 2 — CONSTATS PAR EXPERT

Criticité : **BLOQUANT** (empêche la vente) · **MAJEUR** (à corriger vite après/avant selon risque) · **MINEUR** · **AMÉLIORATION**.

### 2.1 Architecte logiciel / Auditeur technique

| # | Constat | Criticité | Preuve / Localisation | Recommandation |
|---|---|---|---|---|
| ARC-1 | **`organismeId` déclaré nullable (`String?`) sur les 47 modèles multi-tenant (0 en `NOT NULL`)**. La base ne peut garantir qu'aucune ligne n'est orpheline/globale ; un bug d'insertion peut créer une donnée sans tenant (invisible ou mal cloisonnée), et la RLS stricte exige `NOT NULL`. | **BLOQUANT** | `prisma/schema.prisma` (grep : 47 `organismeId String?`, 0 requis) | Passer `organismeId` en `NOT NULL` sur tous les modèles tenant (migration additive + backfill), après vérif qu'aucune ligne n'est nulle. Garder nullable uniquement pour `GLOBAL_MODELS`. |
| ARC-2 | **235 usages directs du client `prisma` brut** (hors `getTenantDb`, qui compte 194 usages). Chaque appel direct doit filtrer `organismeId` à la main ; une seule omission sur un modèle tenant = fuite inter-organismes. | **MAJEUR** | grep `prisma.` dans `src/app` + `src/lib/actions` = 235 | Inventorier les 235 appels ; migrer vers `getTenantDb()` partout où c'est du tenant ; réserver `prisma` brut à l'auth, la console SUPERADMIN et les flux publics par token (déjà la convention documentée). Ajouter un lint/revue ciblée. |
| ARC-3 | Bonne séparation edge/runtime (`auth.config.ts` sans Prisma) et couche de scoping centralisée : **dette maîtrisée**. | AMÉLIORATION | `src/lib/tenant.ts`, `src/auth.config.ts` | Documenter la règle « tenant ⇒ getTenantDb » dans `CONTRIBUTING`. |

### 2.2 Expert cybersécurité

| # | Constat | Criticité | Preuve | Recommandation |
|---|---|---|---|---|
| SEC-1 | **RLS PostgreSQL conçue mais NON ACTIVÉE** (`process.env.RLS_ENABLED !== "true"` ⇒ `set_config` inerte). La seule barrière effective est applicative (ARC-2). Pour des clients externes payants, la défense en profondeur est absente. | **BLOQUANT** | `src/lib/tenant.ts:51` | Activer la RLS avant l'onboarding du 1er client externe : rôle `app_rls`, policies `USING (organismeId = current_setting('app.org'))`, bascule `DATABASE_URL` vers le rôle applicatif, `RLS_ENABLED=true`. Tester le cloisonnement. |
| SEC-2 | **Variables d'environnement de production à compléter** : `SECRETS_ENCRYPTION_KEY` (chiffrement des secrets), `UPSTASH_REDIS_*` (rate-limit partagé), clés Stripe. Sans Upstash, le rate-limit login retombe en mémoire **par instance** (inefficace en serverless multi-instances Vercel). | **MAJEUR** | `src/lib/rate-limit.ts:39-53` ; note projet SECRETS_ENCRYPTION_KEY | Définir toutes les env prod avant lancement ; re-saisir les clés API chiffrées ensuite. Vérifier le fallback rate-limit. |
| SEC-3 | **Session JWT sans révocation immédiate** : rôle/permissions/désactivation ne prennent effet qu'au renouvellement du token. Un compte désactivé ou rétrogradé conserve son accès jusqu'à expiration. | **MAJEUR** | `src/auth.config.ts` (`session.strategy: "jwt"`, claims figés) ; illustré par le bug QA-1 (re-login requis) | Vérifier `isActive`/`sid` côté serveur sur actions sensibles (le token porte un `sid` — brancher une invalidation), ou réduire `maxAge` + revalidation. |
| SEC-4 | Bonnes bases : bcrypt, CSP (flag), rate-limit, `.env` non versionné, aucun secret en dur, suite `security.test.ts`. | AMÉLIORATION | `src/lib/__tests__/security.test.ts` | Activer `CSP_NONCE=true` après vérif navigateur ; planifier un **pentest externe** (injection/XSS/CSRF/IDOR) avant lancement. |
| SEC-5 | Pas de test d'IDOR automatisé sur les flux publics tokenisés (accès pièce, documents). | MINEUR | `/api/public/piece/[id]` | Ajouter des tests : un token d'un organisme ne doit jamais résoudre une ressource d'un autre. |

### 2.3 Auditeur RGPD

| # | Constat | Criticité | Preuve | Recommandation |
|---|---|---|---|---|
| RGPD-1 | **DPA (accord de sous-traitance) inexistant** : en SaaS, l'éditeur devient **sous-traitant RGPD** de chaque OF client (art. 28 RGPD). Aucun contrat de sous-traitance, ni registre côté sous-traitant, ni doc de mesures de sécurité. | **BLOQUANT** (vente B2B) | Aucun fichier DPA/`sous-traitant` trouvé dans `src/app` | Produire : DPA type, registre des traitements (sous-traitant), fiche des mesures techniques/organisationnelles, liste des sous-traitants ultérieurs (Vercel, Neon, Upstash, Stripe, e-mail). |
| RGPD-2 | Purge automatisée présente (`/api/cron/rgpd-purge`) + page RGPD + consentements tracés : socle réel. | AMÉLIORATION | `src/app/api/cron/rgpd-purge`, `src/app/(app)/rgpd` | Documenter la **matrice des durées de conservation** par donnée et l'exposer aux OF clients. |
| RGPD-3 | **Contradiction purge vs obligations de preuve** (voir §3, TRX-1). | MAJEUR | — | Réconcilier purge RGPD ↔ conservation Qualiopi/fiscale. |
| RGPD-4 | Droits des personnes (accès/rectif/effacement/portabilité) : à outiller de façon self-service côté OF client et apprenant. | MINEUR | — | Ajouter un parcours « exercer mes droits » + export de données personnelles par apprenant. |

### 2.4 Auditeur Qualiopi

| # | Constat | Criticité | Preuve | Recommandation |
|---|---|---|---|---|
| QUA-1 | Chaîne de preuves structurée (positionnement, émargement signé horodaté, satisfaction, suivi 6 mois, certificats) + **nouveau workflow de validation de session bloquant l'archivage** tant que les docs obligatoires ne sont pas validés (garde-fou ind. conformité). | 🟢 POINT FORT | `src/lib/validation/*`, `src/app/(app)/sessions/[id]/validation` | Rattacher explicitement chaque preuve aux 32 indicateurs (mapping indicateur→preuve) pour l'audit certificateur. |
| QUA-2 | **Indicateur 26 (handicap) / accessibilité** : référent handicap et adaptation présents côté contenu, mais **accessibilité numérique (RGAA/WCAG) non auditée** (voir UX-1). | MAJEUR | — | Audit RGAA obligatoire si clients avec financements publics/ERP. |
| QUA-3 | Documents générés (conventions, émargement, attestations) : vérifier la conformité **par certificateur** (les mentions varient). | MINEUR | `src/lib/documents/templates.ts` | Revue documentaire par un référent Qualiopi sur un jeu réel. |

### 2.5 Auditeur comptable / conformité financière

| # | Constat | Criticité | Preuve | Recommandation |
|---|---|---|---|---|
| CPT-1 | **Numérotation séquentielle continue des factures non formalisée** dans le module principal (aucune séquence/`numero` détectée dans les actions ; facturation OF via devis/documents). Le CGI impose une numérotation chronologique **sans rupture ni doublon**. | **MAJEUR** | grep « numero/sequence » vide sur `facture*` ; `src/lib/actions/{devis,paiement}-actions.ts` | Introduire une séquence de numérotation atomique par organisme (transaction/compteur), anti-trou et anti-doublon, non réutilisable après annulation (avoir). |
| CPT-2 | **TVA formation traitée correctement** côté civique : « TVA non applicable, art. 261-4-4°a CGI ». | 🟢 POINT FORT | `src/app/(app)/examen-civique/facture/[id]/route.ts:72` | Généraliser la même logique (exonération vs assujetti) au module OF principal et gérer la franchise (art. 293 B) si l'OF y est soumis. |
| CPT-3 | Export comptable présent (route `export/comptable`) ; **format FEC** non confirmé. | MINEUR | `src/app/(app)/examen-civique/export/comptable/route.ts` | Vérifier/ajouter un export FEC conforme pour l'expert-comptable du client. |
| CPT-4 | Fiabilité du **BPF** : module présent (`bpf/`, `inscription-actions.ts`). Calcul à vérifier sur jeu réel. | MINEUR | `src/app/(app)/bpf` | Recette BPF avec données historiques + réconciliation avec la compta. |

### 2.6 Testeur QA / non-régression

| # | Constat | Criticité | Preuve | Recommandation |
|---|---|---|---|---|
| QA-1 | **Bug corrigé pendant l'audit** : à la signature d'un parcours, `provisionElearning` **écrasait le rôle** de tout utilisateur partageant l'e-mail en `APPRENANT` (rétrogradation d'un ADMIN → redirection espace élève). Classe de bug : effets de bord des flux publics sur des comptes privilégiés. | MAJEUR (résolu) | `src/lib/actions/parcours-actions.ts` (corrigé : conserve les rôles privilégiés) | Balayer les autres `user.update`/`upsert` déclenchés par des flux publics (mêmes e-mails candidat/formateur/admin). |
| QA-2 | Cohérence inter-modules (CRM→pédagogique→facturation) : propagée via `organismeId` + relations, mais **non couverte par des tests end-to-end**. | MAJEUR | 12 tests unitaires, pas d'E2E détecté | Ajouter des tests E2E sur 3 parcours critiques : inscription→signature→facture ; création session→émargement→BPF ; archivage bloqué si validation incomplète. |
| QA-3 | Messages d'erreur : présents et en français dans les server actions ; cas limites à couvrir (e-mails invalides, doublons). | MINEUR | actions `*-actions.ts` | Étendre la couverture des cas limites. |

### 2.7 Expert UX/UI & accessibilité

| # | Constat | Criticité | Preuve | Recommandation |
|---|---|---|---|---|
| UX-1 | **Accessibilité RGAA/WCAG non auditée** (contrastes, navigation clavier, ARIA, formulaires). Obligation légale probable (organismes recevant du public / financements publics). | MAJEUR | — | Audit RGAA + corrections ; viser au moins la conformité partielle documentée (déclaration d'accessibilité). |
| UX-2 | Interface cohérente (design system shadcn/base-ui, composants réutilisés). | AMÉLIORATION | `src/components/ui/*` | RAS ; poursuivre l'homogénéité. |

### 2.8 Juriste / contractuel SaaS

| # | Constat | Criticité | Preuve | Recommandation |
|---|---|---|---|---|
| JUR-1 | **CGV/CGU SaaS B2B, contrat d'abonnement, SLA, clause de réversibilité, PI du code** : absents en tant que documents produit. Les pages `mentions-legales`/`rgpd`/CGV existantes concernent l'OF vis-à-vis de SES stagiaires, pas l'éditeur vis-à-vis de SES OF clients. | 🔴 **BLOQUANT** (vente) | `src/app/(app)/mentions-legales`, `/rgpd` (périmètre OF→stagiaire) | Rédiger le corpus contractuel SaaS : CGV/abonnement, SLA (dispo, support, RTO/RPO), **réversibilité/export des données à la résiliation**, responsabilité en cas de perte, PI, DPA (cf. RGPD-1). |
| JUR-2 | Réversibilité technique : un export complet des données d'un OF client (formats ouverts) n'est pas garanti. | MAJEUR | — | Fournir un export tenant complet (CSV/JSON + PDF) déclenchable, aligné sur la clause de réversibilité. |

### 2.9 Expert DevOps / infrastructure

| # | Constat | Criticité | Preuve | Recommandation |
|---|---|---|---|---|
| OPS-1 | **Localisation des données (RGPD)** : Neon + Vercel — région à **confirmer dans l'UE** (l'endpoint DB observé est `eu-central-1`, cohérent). À documenter contractuellement. | MAJEUR | endpoint `…eu-central-1.aws.neon.tech` | Confirmer/verrouiller l'hébergement UE (Vercel + Neon + Upstash + e-mail) et l'inscrire au DPA. |
| OPS-2 | **PRA / restauration de sauvegarde non testée**. Neon fournit du PITR, mais la procédure de restauration (RTO/RPO) n'est pas documentée ni éprouvée. | MAJEUR | — | Documenter et **tester** une restauration ; définir RTO/RPO au SLA. |
| OPS-3 | Environnements & CI présents (`.github/workflows/ci.yml`). Staging distinct à confirmer. | MINEUR | `.github/workflows/ci.yml` | Séparer nettement dev/staging/prod ; interdire `prisma migrate reset` en prod (déjà la pratique : `db push` additif). |
| OPS-4 | **Monitoring/alerting** applicatif (erreurs, taux 5xx, latence) non détecté. | MINEUR | — | Brancher Sentry/observabilité + alertes. |

### 2.10 Data analyst / intégrité

| # | Constat | Criticité | Preuve | Recommandation |
|---|---|---|---|---|
| DAT-1 | Risque d'**orphelins** lié au `organismeId` nullable (ARC-1) et aux `onDelete` partiels (34 règles). | MAJEUR | schema (34 `onDelete`) | Après passage `NOT NULL`, auditer les FK sans `onDelete` explicite ; ajouter contraintes/cascade cohérentes. |
| DAT-2 | Fiabilité des indicateurs des tableaux de bord (taux de réussite, CA, BPF) : non revérifiée sur données réelles. | MINEUR | `dashboard/`, `bpf/` | Recette chiffrée : comparer les KPI affichés à des requêtes SQL de contrôle. |

---

## 3. PHASE 3 — ANALYSE TRANSVERSALE (contradictions inter-domaines)

| # | Contradiction | Domaines en tension | Arbitrage recommandé |
|---|---|---|---|
| TRX-1 | **Purge RGPD** (`rgpd-purge`) efface des données personnelles, mais **Qualiopi** exige la conservation des preuves (émargements, attestations) et le **fisc** 10 ans pour les factures. | RGPD ⇄ Qualiopi ⇄ Comptabilité | Matrice de conservation différenciée : anonymiser plutôt que supprimer les pièces à valeur probante ; ne purger que les données sans obligation légale ; documenter la base légale par catégorie. |
| TRX-2 | **Session JWT** (bon pour UX/perf, pas d'accès DB au middleware) empêche la **révocation immédiate** (sécurité) : un compte rétrogradé/désactivé garde l'accès jusqu'à expiration. | UX/Perf ⇄ Sécurité | Contrôle serveur `isActive`/`sid` sur actions sensibles + `maxAge` court ; c'est exactement ce qu'a révélé QA-1. |
| TRX-3 | **`organismeId` nullable** facilite les modèles globaux et l'onboarding (souplesse), mais casse l'**intégrité d'isolation** et empêche la RLS stricte. | Architecture/DX ⇄ Sécurité/Intégrité | `NOT NULL` sur tenant + exceptions explicites (`GLOBAL_MODELS`). |
| TRX-4 | **Validation « signé sur place »** (souplesse UX/Qualiopi) pourrait masquer qui a réellement validé. | UX ⇄ Qualiopi/RGPD (traçabilité) | Déjà atténué : la validation manuelle **trace le collaborateur + horodatage + commentaire** (AuditLog). Maintenir cette exigence. |
| TRX-5 | **235 accès `prisma` directs** (perf/simplicité) ⇄ garantie d'isolation (un oubli = fuite). | DX ⇄ Sécurité | RLS (SEC-1) comme filet + migration progressive vers `getTenantDb`. |

---

## 4. MATRICE DE CRITICITÉ GLOBALE

**🔴 BLOQUANT (avant toute vente externe)**
- ARC-1 — `organismeId` → `NOT NULL` sur les modèles tenant.
- SEC-1 — Activer la RLS PostgreSQL (`RLS_ENABLED`).
- RGPD-1 — Produire le **DPA sous-traitance** + registre + mesures de sécurité.
- JUR-1 — Corpus contractuel SaaS (CGV/abonnement, SLA, **réversibilité**, PI).
- SEC-2 — Compléter les **env de production** (chiffrement des secrets, rate-limit partagé, Stripe).

**🟠 MAJEUR (avant lancement large / sous 30 j)**
- ARC-2 — Inventaire & réduction des `prisma` directs sur modèles tenant.
- SEC-3 / TRX-2 — Révocation de session (isActive/sid) sur actions sensibles.
- CPT-1 — Numérotation séquentielle des factures (anti-trou).
- QA-2 — Tests E2E des parcours critiques.
- UX-1 / QUA-2 — Audit RGAA/WCAG.
- JUR-2 — Export/réversibilité tenant complet.
- OPS-1/OPS-2 — Hébergement UE verrouillé + PRA testé.
- RGPD-3 / TRX-1 — Matrice de conservation réconciliée.
- QA-1 — (résolu) balayer la classe de bug provisioning.

**🟡 MINEUR**
- Politique de mot de passe **incohérente** : 8 caractères (staff/admin) vs **6 (apprenant/formateur)**, sans exigence de complexité (`apprenant-actions.ts:24`, `formateur-actions.ts:204`). → uniformiser à ≥ 8 + complexité.
- SEC-5 tests IDOR ; CPT-3 FEC ; CPT-4 BPF ; RGPD-4 droits self-service ; OPS-3/4 staging & monitoring ; DAT-2 recette KPI ; QUA-3 revue documentaire par certificateur.

**🟢 POINTS FORTS À VALORISER**
- Cloisonnement applicatif systématique + RLS prête ; contrôle d'accès fin ; bcrypt/CSP/rate-limit ; purge RGPD ; workflow de validation Qualiopi bloquant l'archivage ; TVA formation correcte ; CI + tests.

---

## 5. PLAN D'ACTION PRIORISÉ (estimation d'effort)

| Priorité | Action | Effort indicatif |
|---|---|---|
| 1 | ARC-1 : migration `organismeId NOT NULL` (backfill + vérif nuls) | 2–3 j |
| 2 | SEC-1 : activer RLS (rôle, policies, bascule URL, tests d'isolation) | 3–5 j |
| 3 | SEC-2 : env prod complètes + re-saisie clés | 0,5 j |
| 4 | RGPD-1 + JUR-1 : DPA + CGV/SLA/réversibilité (juridique) | 5–10 j (externe) |
| 5 | ARC-2 : inventaire `prisma` directs + migration ciblée | 3–5 j |
| 6 | CPT-1 : numérotation factures atomique anti-trou | 2 j |
| 7 | SEC-3 : révocation session sur actions sensibles | 1–2 j |
| 8 | QA-2 : tests E2E parcours critiques | 3 j |
| 9 | UX-1/QUA-2 : audit RGAA + corrections prioritaires | 5–10 j |
| 10 | OPS-2 : test de restauration + doc RTO/RPO | 1 j |
| 11 | MINEURS : mot de passe ≥8, FEC, monitoring, recette KPI | 2–4 j |

**Chemin critique avant 1er client externe payant : actions 1 → 5 (≈ 2 à 3 semaines dev + volet juridique en parallèle).**

---

## 6. DÉCISION GO / NO-GO

- **🔴 NO-GO en l'état** pour une vente à des organismes tiers **tant que** les 5 bloquants ne sont pas levés (isolation NOT NULL + RLS, env prod, DPA, contrats SaaS).
- **🟠 GO CONDITIONNEL** : la base technique est saine et au-dessus de la moyenne ; une fois le chemin critique (§5, actions 1–5) traité et le volet juridique livré, la plateforme est **commercialisable** avec les majeurs planifiés en post-lancement immédiat.
- **Recommandation** : lever les bloquants, faire réaliser un **pentest externe** et une **revue Qualiopi documentaire** sur données réelles, puis démarrer par un **pilote encadré (1–2 OF)** avant l'ouverture large.

---

### Annexe — Éléments vérifiés dans le code (traçabilité)
`src/lib/tenant.ts` (scoping + RLS flag) · `src/auth.config.ts` (autorisation) · `src/middleware.ts` (matcher public/privé) · `src/lib/rate-limit.ts` (Upstash) · `src/lib/actions/parcours-actions.ts` (bug rôle corrigé) · `src/app/(app)/sessions/[id]/validation` + `src/lib/validation/*` (garde-fou Qualiopi) · `src/app/(app)/examen-civique/facture/[id]/route.ts` (TVA) · `prisma/schema.prisma` (47 `organismeId String?`, 34 `onDelete`) · `.github/workflows/ci.yml` + `src/**/__tests__` (12 tests).

> **Non exécuté dans cet audit (à planifier)** : pentest externe actif, audit RGAA outillé, tests de charge/scalabilité, recette chiffrée BPF/KPI sur données de production, revue documentaire Qualiopi par certificateur. Ces travaux nécessitent un accès environnement dédié et/ou des experts métier externes.
