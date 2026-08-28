# COMPTE RENDU D'AUDIT 07 — Audit performance / charge
## OFMANAGER — Programme d'audit de pré-commercialisation

**Date :** 2026-08-28
**Version auditée :** branche `fix/remediation-audit-06` — commit `0a4916b`
**Chef de projet audit :** Claude Code (chef de projet senior)
**Équipe mobilisée :** Ingénieur performance web · Expert base de données / requêtes · Ingénieur traitements lourds & asynchrones · Architecte scalabilité (cache / limites plateforme / coût) · Analyste observabilité — 5 spécialistes en parallèle (sous-agents) + une passe de **contre-vérification adversariale** de chaque constat 🔴/🟠 + arbitrage du chef de projet.
**Périmètre couvert :** temps de réponse des écrans et API des parcours les plus utilisés, comportement à volumétrie réaliste, traitements lourds (PDF, exports, imports, e-mails, crons), configuration de cache/rendu/revalidation, limites de la plateforme d'hébergement, projection de coût, et capacité de diagnostic en production. **Hors périmètre :** qualité esthétique du code (audit 04), disponibilité/reprise (audit 09).
**Durée / profondeur :** analyse statique du code + `prisma/schema.prisma` (3016 lignes) + `vercel.json` + `next.config.ts`. 37 agents, 621 appels d'outils, ~28 min. **Aucune écriture en base, aucun test de charge sur la production** (base Neon partagée). Les mesures live (LCP/TTFB, p95, points de rupture) sont explicitement listées en §5 et seront produites sur une **base de test isolée** (kit `loadtest/` livré, cf. §8).

---

### 1. SYNTHÈSE EXÉCUTIVE

Le socle est **sain et bien pensé** : région Vercel collée à la base (Francfort), génération PDF qui réutilise un seul navigateur avec coupe-circuit à 45 s, colonne PDF lourde (8 Mo) exclue par défaut des requêtes, numérotation atomique, tableau de bord optimisé, idempotence anti-doublon des automatismes, e-mails et crons câblés sur Sentry. **À 10 organismes au lancement, la plateforme tient.**

Le risque est ailleurs : il apparaît **quand le volume grandit** (50 puis 200 organismes, des milliers de stagiaires chacun). Deux points bloquants ressortent. (1) La tâche automatique quotidienne (convocations, rappels, attestations, émargements) **charge en mémoire l'historique de TOUS les organismes d'un coup, génère les PDF en série, et n'a aucune limite de temps configurée** : à l'échelle cible, elle dépasse le plafond de la plateforme et s'interrompt en silence — des documents Qualiopi ne partent jamais. (2) L'écran principal **Candidats** charge toute la table d'un coup **avec les photos** intégrées dedans, sans pagination : il devient inutilisable pour un gros organisme. À côté, une famille récurrente d'écrans de liste (comptabilité, signatures, CRM, sessions) charge toute la table du tenant avant de paginer côté navigateur, plusieurs exports et un ZIP de dossier de session peuvent dépasser le temps limite, des index manquent sur les grosses tables, et des images signées sont stockées dans la base (coût). Enfin, on ne peut aujourd'hui **pas diagnostiquer une lenteur par organisme** en production (logs sans identifiant d'organisme).

| 🔴 Rouge | 🟠 Orange | 🟡 Jaune | 🟢 Vert |
|---|---|---|---|
| 2 | 8 | 20 | 16 |

**VERDICT : GO CONDITIONNEL**
Aucun défaut au go-live à 10 OF, et aucun blocage architectural : la trajectoire est réparable avec des patrons déjà présents dans le dépôt. La commercialisation **à la montée en charge** est conditionnée à : (a) corriger A07-001 (borner le cron + le provisionner + supprimer le N+1) et A07-002 (paginer Candidats + sortir les photos base64 de la liste) **avant d'onboarder au-delà d'une dizaine d'OF** ; (b) traiter les majeurs P1 (pagination serveur des listes, exports, index, purge RGPD, images base64 → Blob) **avant les premiers clients à fort volume**.

---

### 2. TABLEAU DES ANOMALIES

| ID | Gravité | Titre | Composant | Preuve | Impact | Recommandation | Charge | Priorité |
|---|---|---|---|---|---|---|---|---|
| A07-001 | 🔴 | Cron `parcours` : scan non borné de TOUT le parc (tous tenants) + PDF Chromium en boucle + N+1, **sans `maxDuration`** | `automation-engine.ts` / `cron/parcours` / `vercel.json` | `automation-engine.ts:166`, `:173`, `route.ts` (pas de `maxDuration`), `vercel.json:3-25` | À 50-200 OF, dépassement mémoire/temps → cron Qualiopi tué en silence, documents jamais envoyés | Borner par fenêtre de dates + pagination ; sortir les PDF de la boucle (file) ; mémoïser les organismes ; provisionner la route | L | P0 |
| A07-002 | 🔴 | Liste **Candidats** non paginée + photos **base64** dans le payload + rendu DOM intégral | `candidats/page.tsx` + `candidats-table.tsx` | `candidats/page.tsx:23,50`, `candidats-table.tsx:164,170`, `schema:676` | Écran principal : payload de dizaines de Mo, transfert massif, navigateur saturé au volume cible | Pagination serveur + `select` sans base64 + miniature via URL Blob + virtualisation (aligner sur `CrmTable`) | L | P0 |
| A07-003 | 🟠 | **Systémique** : écrans de liste chargent toute la table du tenant (`findMany` sans `take`) puis paginent côté client | comptabilité, signatures, CRM, sessions, détail session | `comptabilite/page.tsx:55`, `signatures/page.tsx:26`, `crm/page.tsx:19`, `sessions/page.tsx:20`, `sessions/detail.ts:62` | TTFB/LCP hors seuils au volume cible ; pics rentrée & fin de mois | Pagination/tri/filtre **serveur** (`take`+curseur), agrégats via `groupBy`/`aggregate`, `select` ciblé | L | P1 |
| A07-004 | 🟠 | Exports (CSV/XLSX/PDF) non bornés + **non provisionnés** ; PDF plein-tableau via Chromium à la mémoire par défaut | routes `*/export` | `candidats/export/route.ts:19`, `export-pdf.ts:29-45`, `administration/export/route.ts:29-40`, `vercel.json` (absent) | Export « inutilisable au-delà d'un volume réaliste » (OOM/timeout) | Borner/streamer, plafonner le PDF, provisionner `memory`/`maxDuration` | M | P1 |
| A07-005 | 🟠 | ZIP dossier de session : boucle série jusqu'à **80 participants** (≈ des centaines de conversions DOCX + N+1 + relecture disque du logo) dans un GET 60 s | `build-session-zip.ts` / `build-zip.ts` | `build-session-zip.ts:8,79`, `build-zip.ts:63,78,116,135` | Grande session → timeout, admin n'obtient rien | Sortir logo/orgConfig de la boucle, paralléliser (concurrence limitée), abaisser le plafond ou déporter en tâche de fond | M | P1 |
| A07-006 | 🟠 | Cron RGPD purge : budget `BATCH=500` **par organisme** (pas global) + ~9 requêtes/candidat en série + pas de `maxDuration` | `rgpd-retention.ts` / `rgpd/anonymise.ts` | `rgpd-retention.ts:12,33,38,50`, `anonymise.ts:124-179` | À 200 OF, jusqu'à ~100 000 anonymisations/run → débit nocturne insuffisant, famine des OF en fin de liste | Budget **global** par run + `maxDuration` + pagination keyset équitable | M | P1 |
| A07-007 | 🟠 | Index manquants sur grosses tables : `Inscription.sessionId` (FK, chemin chaud) ; `(organismeId, createdAt)` sur AuditLog/EmailLog/DocumentGenere ; FK entreprise/apprenant | `schema.prisma` | `schema:1163-1166`, `inscription-actions.ts:506`, `console-audit.ts:34`, `dashboard/page.tsx:128` | Lecture de toute la partition du tenant avant filtre/tri ; coût croissant avec l'historique | Ajouter `@@index([sessionId,statut])`, `@@index([organismeId,createdAt])`, FK ; `prisma db push` hors pic | S | P1 |
| A07-008 | 🟠 | Octets PDF (8 Mo/inscr.) + images **base64** (signatures) stockés **dans Postgres/Neon** | modèle de données / stockage | `schema:1159,1099,1277`, `prisma.ts:18-20`, `couts.ts:48-51` | Stockage + transfert + sauvegardes Neon croissent avec le cumul (poste n°1 de coût) | Migrer vers Vercel Blob (référence par URL) ; étendre l'`omit` aux signatures | L | P2 |
| A07-009 | 🟠 | Projection de coût 10/50/200 OF : modèle **linéaire** vs transfert Neon **super-linéaire** (croît plus vite que le CA) | `couts.ts` (modèle) | `couts.ts:10,29,63-66` vs `automation-engine.ts:166` | Un OF « lourd » sur un petit palier consomme un transfert disproportionné | Corriger d'abord A07-001/003/008 (dominent la facture) ; instrumenter le coût par tenant ; plafond d'usage | L | P2 |
| A07-010 | 🟠 | `runAutomationsNow` : le bouton d'**un** tenant déclenche le balayage **global** (tous OF) en synchrone | `automation-actions.ts` | `automation-actions.ts:31-33` vs `circuit-actions.ts:112` | Un clic consomme du compute proportionnel à toute la plateforme ; timeout probable (cf. audit 05) | Scoper au tenant (`organismeId`) comme `runCircuitsNow`, ou passer en asynchrone | S | P1 |
| A07-011 | 🟡 | Sur-lecture : `PRISMA_OMIT` ne couvre que `dossierPdf` ; colonnes base64/JSON d'Inscription + `photoUrl` Candidat tirées sans `select` (+ `sessions` `formation:true`, fiche candidat charge `url` des pièces) | lib/prisma + loaders | `prisma.ts:18-20`, `sessions/detail.ts`, `candidats/detail.ts:43` | Sur-transfert (quota Neon) sur les vues qui n'affichent pas ces champs | Étendre l'`omit` + `select` explicite là où réellement lu | S | P2 |
| A07-012 | 🟡 | Histogrammes (leads-multicanal, rapports) calculés en JS sur toute la table au lieu d'un `groupBy` SQL | `leads-multicanal/page.tsx`, `rapports/page.tsx` | `leads-multicanal/page.tsx:34`, `rapports/page.tsx:55` | Transfert proportionnel au nb de candidats pour un simple comptage | `groupBy({ by, _count })` en base | S | P2 |
| A07-013 | 🟡 | `next/image` quasi absent du back-office ; `<img>` bruts (dont avatars base64) non lazy/non optimisés | rendu images | 75 `<img>`, `next/image` sur 4 pages publiques seulement, pas de config `images` | Pas de redimensionnement/lazy sur logos & photos | Servir via Blob + `next/image` ; à défaut `loading="lazy"` | L | P2 |
| A07-014 | 🟡 | Aucune frontière `Suspense` : un seul `loading.tsx` pour tout l'espace connecté | segment `(app)` | `grep Suspense (app)` = 0 ; `app/(app)/loading.tsx` | Pas de streaming progressif des blocs prêts sur écrans lourds | Ajouter des `Suspense` autour des blocs coûteux | M | P3 |
| A07-015 | 🟡 | Pagination par **offset** uniquement (aucun curseur Prisma) | stratégie pagination | `grep cursor:` = 0 côté Prisma ; `take:` = 52 | Pages lointaines coûteuses (skip balaye et jette) | Curseur sur clé indexée pour les grosses listes | M | P3 |
| A07-016 | 🟡 | Écritures cloisonnées : `findFirst`-puis-écriture (2 requêtes/`update`/`delete`) — amplification en écriture de masse | `scopedPrisma` | `tenant.ts:93-104,65-77` | Double les allers-retours sous opérations groupées ; pèse sur le pool serverless | Préférer `updateMany`/`deleteMany` (filtre organismeId en 1 requête) pour la masse | M | P3 |
| A07-017 | 🟡 | Console Prospects : `lead.findMany` non borné + colonnes Text + `orderBy` non indexé | `console/prospects/page.tsx` | `console/prospects/page.tsx:13`, `schema:2103-2149` | Impact limité (console éditeur mono-utilisateur) mais non borné | Paginer/`select` sans Text ; `@@index([lu,createdAt])` | S | P3 |
| A07-018 | 🟡 | Signature candidat : 3 lancements Chromium **en série** sur le chemin critique (pas de navigateur mutualisé) | `parcours-actions.ts` | `parcours-actions.ts:589,659,660` | Le candidat attend ~3 démarrages Chromium à froid + 2 e-mails | Regrouper en un seul `htmlToPdfMany`, ou déporter en tâche de fond | S | P2 |
| A07-019 | 🟡 | Envoi e-mail sans throttle / anti-429 / file : boucles cron séquentielles vers Resend/Brevo | `email.ts` + moteurs | `email.ts:99,175`, `automation-engine.ts:141`, `circuits-engine.ts:92` | Débit fournisseur non géré ; latence série alimente le timeout du cron | File d'envoi avec concurrence limitée + backoff sur 429 | M | P2 |
| A07-020 | 🟡 | `importLeadsCsv` : `findFirst`+`create`+`logEvent` par ligne (N+1, pas de `createMany`) | `growth-actions.ts` | `growth-actions.ts:151-173` (borné 500 lignes, SUPERADMIN) | ~1500 allers-retours/import ; impact limité (occasionnel) | Précharger emails (IN) + `createMany({ skipDuplicates })` | S | P3 |
| A07-021 | 🟡 | API publique vitrine : sans `?organisme=` ni `VITRINE_ORGANISME_ID`, réponse « tous tenants » servie avec `Cache-Control: public` | `public/formations`, `public/sessions` | `public-scope.ts:17-21`, `formations/route.ts:29,77` | Risque d'agrégation/cache cross-tenant en cas de misconfig (cf. audit 05) | Exiger un organisme explicite (400 sinon) ou ne pas cacher en public si scope indéterminé | S | P1 |
| A07-022 | 🟡 | Assistant IA : prompt caching Anthropic non activé | `lib/ai.ts` | `ai.ts:49-54` (pas de `cache_control`) | Coût IA par appel plus élevé (system refacturé) ; limité (Haiku par défaut) | `cache_control: { type: "ephemeral" }` sur le bloc system | S | P3 |
| A07-023 | 🟡 | Taux de réussite vitrine : scan non borné des inscriptions certifiées à chaque cache-miss | `vitrine-stats.ts` | `vitrine-stats.ts:24` (amorti par CDN 5 min) | Recalcul lourd au cache-miss pour un gros OF | Précalculer/`groupBy` | S | P3 |
| A07-024 | 🟡 | Logs **sans `organismeId`** → diagnostic multi-tenant à l'aveugle *(reclassé d'orange)* | journalisation | `action-result.ts:25`, `middleware.ts`, `grep organismeId/requestId` = ∅, `EXPLOITATION.md:49` | Impossible de filtrer une lenteur/erreur par OF en prod | Logger JSON structuré (organismeId, route, durée) + `Sentry.setTag('organismeId')` | M | P2 |
| A07-025 | 🟡 | Aucune mesure de **durée** des opérations lourdes (PDF/cron/actions) *(reclassé d'orange)* | métriques durée | `pdf.ts` (aucune durée), `cron-runner.ts:20`, seule mesure = `pdf-test/route.ts:22` | Impossible de détecter une dérive vers le mur 60 s | Journaliser `{tag, organismeId, ms, taille}` en sortie de `htmlToPdfMany`/`runCron` | M | P2 |
| A07-026 | 🟡 | Web Vitals : module dédié **mock jamais appelé**, aucun package RUM | web-vitals front | `performance/web-vitals.ts:73` (mock), pas de `web-vitals`/`@vercel/speed-insights` | LCP/TTFB non mesurés en conditions réelles ; mock trompeur | `@vercel/speed-insights` (1 composant) ou paquet `web-vitals` ; supprimer le mock | S | P2 |
| A07-027 | 🟡 | Sentry : `withSentryConfig` absent → source maps non téléversées (stacks prod illisibles) | Sentry build | `next.config.ts:138` (pas d'enrobage), `grep withSentryConfig` = ∅ | Erreurs serveur minifiées → diagnostic ralenti | Enrober `next.config` + `SENTRY_AUTH_TOKEN` au build | S | P2 |
| A07-028 | 🟡 | `reportError` peu adopté : échecs PDF avalés ne remontent jamais à Sentry (≠ doc) | couverture erreurs | `reportError` = 3 sites ; `automation-engine.ts:72`, `parcours-actions.ts:92` (console seul) | Panne Chromium récurrente invisible dans Sentry | Router les `catch` PDF via `reportError({tag, extra:{organismeId}})` | S | P2 |
| A07-029 | 🟡 | Retries DB transitoires (`withDbRetry`) non journalisés → latence Neon invisible | résilience DB | `db-retry.ts:45-57` (retry sans log), `:68` (échec terminal seul) | Vague de retries (cold start/pool) passe inaperçue jusqu'à l'échec franc | Loguer (warn échantillonné) tentatives + temps cumulé | S | P3 |
| A07-030 | 🟡 | Prisma ne loggue pas les requêtes lentes en prod + aucune route `/health` | observabilité DB | `prisma.ts:30` (`["error"]` en prod), `glob api/health` = ∅ | Requête lente non identifiable ; pas de sonde DB pour l'uptime | `$on('query')` à seuil derrière un flag + route `/api/health` (ping DB) | S | P3 |

---

### 3. FICHES DÉTAILLÉES (toutes les 🔴 et 🟠)

#### A07-001 — Cron `parcours` : balayage non borné de tout le parc (tous tenants) + PDF Chromium en boucle + N+1, sans limite de durée — 🔴
- **Constat :** la tâche automatique quotidienne des automatismes Qualiopi (convocations, rappels J-1, attestations d'entrée, certificats, émargements du jour, satisfaction) charge en mémoire **toutes les inscriptions non annulées de TOUS les organismes**, sans filtre de date ni pagination, puis itère dessus en générant des PDF Chromium **en série** et en envoyant des e-mails. La route n'a **aucun `maxDuration`/`memory` configuré** (contrairement à ses 21 routes PDF sœurs et à son jumeau `documents-b2b`). Confirmé indépendamment par 3 spécialistes (DB, traitements, scalabilité), 0 réfutation.
- **Preuve :** `src/lib/automation-engine.ts:166` `prisma.inscription.findMany({ where: { statut: { not: "ANNULEE" } }, include: { candidat:{include:{entreprise}}, session:{include:{formation}} } })` — `prisma` brut (BYPASS, tous tenants), aucun `take`, aucune borne de date. Boucle `:171` avec génération PDF `:340/:382/:594/:606` (`safePdf → buildSingleDocPdf → htmlToPdfMany`, `pdf.ts:5` lance Chromium serverless). `src/app/api/cron/parcours/route.ts` n'exporte pas `maxDuration` et est **absent** de `vercel.json:3-25`. N+1 : `automation-engine.ts:173` `orgConfigFor(i.organismeId)` → `org-identity.ts:58` `organisme.findUnique` **non mémoïsé**, exécuté pour chaque inscription. `runCircuits` (même invocation, `route.ts:13`) refait un `findMany` par OF + `circuitStepRun.findMany` par (inscription × circuit) — `circuits-engine.ts:42,65`.
- **Scénario d'impact :** à la charge cible (50-200 OF × dizaines de milliers d'inscriptions = 1 à 4 M de lignes), le seul N+1 `orgConfigFor` = 1 à 4 M de `findUnique` séquentiels (bien au-delà de tout `maxDuration` Vercel), et le `findMany` charge tout le parc dans une fonction au budget mémoire par défaut. La fonction est tuée au plafond plateforme ; **Vercel Cron ne réessaie pas** (`cron-runner.ts:6-8`). Aggravant : le jalon idempotent est posé **avant** l'envoi (`claim` puis `send`, PDF lent entre les deux pour la convocation examen) → un kill par timeout laisse un document **marqué envoyé mais jamais expédié** (rappel J-1, convocation) = perte fonctionnelle silencieuse et non-conformité Qualiopi. Latent à 10 OF, garanti sur la trajectoire 50→200.
- **Cause racine :** boucle héritée d'un usage mono-organisme, jamais shardée par tenant ni bornée par date, PDF générés en synchrone dans le cron, route non provisionnée. Le patron correct **existe déjà** dans le dépôt : `publish-auto.ts:23` (`MAX_DOCS_PER_RUN=15`, `take`, `maxDuration=60`) et `circuits-engine.ts:25-45` (shard par organisme).
- **Recommandation :** (1) **immédiat** — déclarer `memory:1769`+`maxDuration:60` sur `/api/cron/parcours` dans `vercel.json` et mémoïser `orgConfigFor` (Map `organismeId→identité` chargée en une requête) ; (2) **borner** le `findMany` à une **fenêtre de dates** (sessions à venir / récentes / jalons non posés) + pagination keyset ; (3) **sortir la génération PDF de la boucle** (file/queue traitée par lots, ou génération à la demande) ; (4) inverser `claim`/`send` (envoyer puis poser le jalon) ; (5) séparer `runAutomations` et `runCircuits` en invocations distinctes.
- **Charge :** L — **Priorité :** P0 — **Type :** Chantier (mais les étapes 1 sont des Quick wins immédiats)
- **Vérification de la correction :** en base de test isolée (kit `loadtest/`), seeder 50 OF × N inscriptions éligibles, invoquer `runAutomations`, mesurer durée + pic mémoire + nb de requêtes ; vérifier durée < 60 s et qu'un kill simulé ne laisse aucun jalon posé sans envoi.

#### A07-002 — Liste Candidats non paginée + photos base64 dans le payload + rendu DOM intégral — 🔴
- **Constat :** l'écran principal **Candidats** charge **toute** la table candidats du tenant, sans `take` et sans `select` (donc toutes les colonnes, **dont la photo en base64**), réinjecte la photo dans la prop envoyée au navigateur, et le composant client rend **toutes** les lignes sans pagination (seule table de l'appli à ne pas paginer), avec une `<img>` base64 et une modale montée par ligne.
- **Preuve :** `src/app/(app)/candidats/page.tsx:23` `db.candidat.findMany({ orderBy, include:{ formationSouhaitee } })` (ni `take` ni `select`) ; `:50` `photoUrl: c.photoUrl` renvoyé au client ; `src/components/candidats/candidats-table.tsx:164` `filtered.map(...)` (aucun `PAGE_SIZE`, contrairement à `crm-table.tsx:64`, `dossiers-table.tsx:55`, `sessions-table.tsx:68`), `:170` `<img src={c.photoUrl}>`. La photo est une data-URL base64 en `@db.Text` : `schema.prisma:676`, écrite en `candidat-actions.ts:55` (compressée ~30-50 Ko, `photo-capture.tsx:57`).
- **Scénario d'impact :** pour un OF à 2 000+ candidats dont ~30 % avec photo, le payload cumule ~36 Mo de photos + ~50 colonnes inutiles + des milliers de `<TableRow>`/modales dans le DOM → transfert Neon massif, TTFB/LCP largement au-delà des seuils, navigateur saturé. **Nuance honnête (arbitrage) :** le palier rouge est surtout porté par l'adoption des photos ; sans photos, il reste un `findMany` non borné + DOM intégral (orange qui se dégrade plus lentement). Retenu 🔴 car c'est l'écran le plus compromis (aucune pagination **du tout** + base64 + modale/ligne) et l'écran principal — arbitrage « au plus grave ».
- **Cause racine :** table de liste jamais migrée vers la pagination serveur ; photo stockée en base64 et sélectionnée par défaut faute de `select`.
- **Recommandation :** pagination/recherche **serveur** (`take`+curseur) ; `select` explicite **sans** `photoUrl` (charger une miniature via URL Blob + `next/image`) ; virtualiser/paginer le rendu client comme `CrmTable`.
- **Charge :** L (M si l'on se limite pagination + retrait base64) — **Priorité :** P0 — **Type :** Chantier (le retrait du base64 du `select` seul est un Quick win)
- **Vérification de la correction :** mesurer poids de réponse et TTFB de `/candidats` à 2 000+ candidats avant/après (base de test isolée) ; confirmer que la photo n'est plus dans le payload de liste.

#### A07-003 — Écrans de liste back-office chargent toute la table du tenant (systémique) — 🟠
- **Constat :** patron répété sur plusieurs écrans principaux : un `findMany` **sans `take`** charge toutes les lignes du tenant (souvent avec jointures imbriquées), puis la pagination/le filtre se font **côté client**. La règle « anomalie répétée > 5 fois = dette systémique » s'applique. **Cas phare = Comptabilité** : `findMany` sur 4 niveaux (candidat + session→formation + factures→paiements + paiements), **filtre d'année en JS** (jamais en SQL — changer d'année ne réduit pas la charge), agrégation entièrement en mémoire, page `force-dynamic` (aucun cache).
- **Preuve :** `comptabilite/page.tsx:36` (`force-dynamic`), `:55` (`findMany` sans `take`), `:175-197` (filtre année en JS), `:407` (créances rendues sans pagination) ; `signatures/page.tsx:26` ; `crm/page.tsx:19` (tout sérialisé au client) ; `sessions/page.tsx:20` (`formation:true` = sur-lecture) ; `sessions/detail.ts:62` (`candidats disponibles` = toute la table candidats à chaque onglet). Scoping tenant confirmé (`tenant.ts:81-84` injecte `organismeId`), mais **jamais** de borne de lignes.
- **Scénario d'impact :** pour « plusieurs milliers de stagiaires » / « dizaines de milliers d'inscriptions » par OF, chaque affichage transfère toute la table depuis Neon puis sérialise des milliers de lignes ; comptabilité au pic fin de mois (BPF), candidats/CRM au pic rentrée → TTFB/LCP hors seuils.
- **Cause racine :** pagination pensée côté client (DOM borné) mais **jamais** côté serveur (requête non bornée) ; agrégats calculés en JS au lieu de SQL.
- **Recommandation :** pagination/tri/filtre **serveur** (`take`+curseur ou `skip/take`) ; pour la comptabilité, filtrer par **année en SQL** (comme l'export FEC le fait déjà) et calculer les totaux via `groupBy`/`aggregate` ; `select` limité aux colonnes affichées.
- **Charge :** L — **Priorité :** P1 — **Type :** Chantier
- **Vérification de la correction :** taille de payload + TTFB de `/comptabilite`, `/signatures`, `/crm`, `/sessions` à quelques milliers de lignes (base de test isolée), avant/après ; nb de lignes retournées par requête borné.

#### A07-004 — Exports (CSV/XLSX/PDF) non bornés et non provisionnés ; PDF plein-tableau via Chromium — 🟠
- **Constat :** les routes d'export chargent toute la table du tenant (`findMany` sans `take`) et, en `?format=pdf`, rendent **toutes** les lignes dans une seule table HTML via Chromium. Aucune de ces routes n'est provisionnée (`maxDuration`/`memory`) alors que le workload Chromium **identique** est jugé nécessiter 1769 Mo/60 s ailleurs. L'export « réversibilité » charge même **10 tables entières** en un JSON en mémoire.
- **Preuve :** `candidats/export/route.ts:19` (sans `take`), `export.ts:57` (route PDF), `export-pdf.ts:29-45,100` (une `<tr>`/ligne → `htmlToPdf`), `administration/export/route.ts:29-40` (10 `findMany` + `JSON.stringify` mono-bloc). `grep maxDuration **/export/route.ts` = 0 ; ces routes absentes de `vercel.json`. Le coupe-circuit `pdf.ts:41` (45 s) borne la **durée**, pas la **mémoire**, et suppose un plafond route de 60 s que ces routes n'ont pas.
- **Scénario d'impact :** export PDF de plusieurs milliers de candidats → DOM géant dans un Chromium à la mémoire par défaut → OOM/timeout, export inutilisable. CSV/XLSX matérialisés en mémoire sans streaming.
- **Cause racine :** exports hérités d'un usage à faible volume ; provisionnement Vercel oublié pour ces routes.
- **Recommandation :** borner/streamer (CSV en flux, curseur), **plafonner** le format PDF au-delà d'un seuil de lignes, provisionner `memory`/`maxDuration`, ou export asynchrone (job + lien) au-delà d'un seuil.
- **Charge :** M — **Priorité :** P1 — **Type :** Standard
- **Vérification de la correction :** durée + pic mémoire d'un export candidats CSV/XLSX/PDF à 1 k / 10 k / 50 k lignes (base de test isolée) ; identifier le seuil où le PDF échouait, confirmer qu'il est plafonné.

#### A07-005 — ZIP dossier de session : génération série jusqu'à 80 participants, synchrone dans un GET 60 s — 🟠
- **Constat :** la génération du ZIP de dossier de session boucle **en série** sur jusqu'à 80 participants ; chaque participant déclenche une requête lourde, un `orgConfigFor` (N+1), une **relecture disque du logo**, et plusieurs conversions HTML→DOCX (≈ 15 documents applicables/participant, pas 5), plus 2 PDF Chromium au niveau session — le tout dans une fonction 60 s, ZIP entièrement en mémoire.
- **Preuve :** `build-session-zip.ts:8` (`MAX_PARTICIPANTS=80`), `:79` (boucle série), `build-zip.ts:63` (`findUnique` lourd/participant), `:78` (`orgConfigFor`), `:116` (`fs.readFile(logo)` par participant, jetée si `org.logoUrl`), `:135` (`HTMLtoDOCX` en série). `templates.ts` = 23 modèles, `families.ts` en applique ~15 → jusqu'à ~1200 conversions DOCX à 80 participants.
- **Scénario d'impact :** une grande cohorte (40-80) → centaines à >1000 conversions DOCX en série + N+1 + 2 Chromium → dépassement des 60 s, l'admin n'obtient rien. Les sessions typiques (10-20) passent mais lentement.
- **Cause racine :** travail par participant non factorisé (logo/orgConfig relus à chaque tour), génération synchrone dans la requête.
- **Recommandation :** hisser logo + `orgConfig` hors de la boucle (une fois/session), mémoïser `orgConfigFor`, paralléliser avec **concurrence limitée**, abaisser le plafond ou déporter en tâche de fond avec lien différé.
- **Charge :** M — **Priorité :** P1 — **Type :** Standard
- **Vérification de la correction :** durée de `buildSessionDossierZip` à 10/40/80 participants (base de test isolée) sous le seuil de 60 s.

#### A07-006 — Cron RGPD purge : budget 500 **par organisme** (pas global) + ~9 requêtes/candidat en série, sans `maxDuration` — 🟠
- **Constat :** le plafond `BATCH=500` est **à l'intérieur** de la boucle « pour chaque organisme » → le travail total = 500 × nombre d'OF, sans budget global ; chaque candidat déclenche ~8-10 opérations en série ; la route n'a pas de `maxDuration` (contrairement à ses crons voisins).
- **Preuve :** `rgpd-retention.ts:12` (`BATCH=500`, commentaire « borné par exécution » trompeur), `:33` (boucle org), `:38` (`take:BATCH` **dans** la boucle), `:50` (anonymisation série) ; `anonymise.ts:124-179` (~9 requêtes/candidat) ; `cron/rgpd-purge/route.ts` sans `maxDuration`, absent de `vercel.json` (alors que `documents-b2b`/`purge-demos` en ont un).
- **Scénario d'impact :** à 200 OF avec backlog, jusqu'à ~100 000 anonymisations lourdes par run en série → le débit nocturne ne suffit pas et les OF en fin de liste sont **affamés** (jamais atteints). Idempotence (`anonymiseLe: null`) → pas de perte de données, mais conformité RGPD retardée.
- **Cause racine :** budget dimensionné par tenant au lieu de global ; route non provisionnée.
- **Recommandation :** budget **global** par run (compteur décrémenté à travers tous les OF), `maxDuration`, pagination keyset équitable entre OF.
- **Charge :** M — **Priorité :** P1 — **Type :** Standard
- **Vérification de la correction :** seeder des candidats expirés sur 50 tenants (base de test) ; vérifier que le run draine équitablement sous `maxDuration`.

#### A07-007 — Index manquants sur les grosses tables — 🟠
- **Constat :** l'intercepteur multi-tenant ajoute **toujours** `organismeId` au `where`, mais les grosses tables n'ont que des index mono-colonne ; plusieurs chemins chauds n'ont **aucun** index exploitable. En particulier : `Inscription.sessionId` (FK) n'est pas indexé alors que le **contrôle de places** l'interroge à chaque inscription ; les journaux (AuditLog/EmailLog/DocumentGenere) sont triés `createdAt desc` sans index (dont le **tableau de bord**).
- **Preuve :** `schema.prisma:1163-1166` (Inscription : pas de `@@index([sessionId])`) vs `inscription-actions.ts:506` `count({ where:{ sessionId, statut } })` ; les tables sœurs déclarent toutes `@@index([sessionId])` (`Seance:1241`, `EmargementSignature:1280`) → l'omission est manifeste. AuditLog `schema:1839-1841` (pas de `createdAt`) vs `console-audit.ts:34`, `dashboard/page.tsx:128` ; EmailLog `schema:1762-1763` vs `automatisations/page.tsx:38`. Le motif `@@index([organismeId, createdAt])` **existe déjà** (`PageVue:2714`) mais n'est pas généralisé. Aucun dossier `prisma/migrations/` → le schéma **est** la base (workflow `db push`).
- **Scénario d'impact :** `WHERE organismeId=X AND sessionId=Y` lit toute la partition du tenant (dizaines de milliers) pour n'en garder que ~20-50 ; `ORDER BY createdAt DESC LIMIT n` trie toute la partition. Coût croissant avec l'historique, sensible au pic rentrée.
- **Cause racine :** stratégie d'indexation non généralisée aux couples `(organismeId, filtre/tri)` réels et aux FK chaudes.
- **Recommandation :** `@@index([sessionId, statut])` (Inscription), `@@index([organismeId, createdAt])` (AuditLog/EmailLog/DocumentGenere), `@@index([createdAt])` (AuditLog console cross-tenant), FK `entrepriseId`/`apprenantId`. `prisma db push` **hors pic** sur la base partagée.
- **Charge :** S — **Priorité :** P1 — **Type :** **Quick win**
- **Vérification de la correction :** `EXPLAIN ANALYZE` sur volumes réalistes (base de test) avant/après : disparition des Seq Scan sur les chemins cités.

#### A07-008 — Octets PDF (8 Mo/inscr.) et images base64 stockés dans Postgres/Neon — 🟠
- **Constat :** le dossier PDF complet (jusqu'à 8 Mo) et les **signatures manuscrites** (PNG base64) sont stockés **en base** (`Bytes`/`@db.Text`), pas sur Vercel Blob. Le garde-fou `PRISMA_OMIT` évite le **sur-transfert runtime** du dossier PDF mais ne couvre **pas** les signatures, et les octets restent stockés/sauvegardés.
- **Preuve :** `schema:1159` (`dossierPdf Bytes?`), `schema:1099,1113,1118,1132,1277` (signatures `@db.Text`), écrites directement en base (`parcours-actions.ts:397/441/468`, `emargement-signature-actions.ts:193`) ; `prisma.ts:18-20` (omit **uniquement** `dossierPdf`) ; `couts.ts:48-51,63-66` : « Neon ≈ 45 % de l'infra à 100 clients », « sortir les images base64 de Postgres ».
- **Scénario d'impact :** stockage + transfert + sauvegardes Neon croissent avec le **cumul** d'inscriptions/émargements — décorrélé du CA (poste n°1 de coût, quota transfert déjà dépassé par le passé). Mitigations réelles : `PRISMA_OMIT` (dossierPdf) + purge cache PDF à 120 j → pas une croissance infinie côté dossier PDF, mais signatures non mitigées.
- **Cause racine :** images/PDF encodés en base au lieu d'être référencés par URL Blob (Blob n'est utilisé que pour les fichiers uploadés).
- **Recommandation :** migrer `dossierPdf` + signatures base64 vers **Vercel Blob** (référence par URL, métadonnées en base) ; étendre `PRISMA_OMIT` aux colonnes signature en attendant.
- **Charge :** L — **Priorité :** P2 — **Type :** Chantier
- **Vérification de la correction :** `pg_total_relation_size` des colonnes Bytes/Text avant/après migration + part dans le transfert Neon.

#### A07-009 — Projection de coût 10/50/200 OF : le transfert Neon croît plus vite que le CA — 🟠
- **Constat (observation étayée par le code + estimation) :** le modèle de coût interne facture l'infra en **forfait plat par OF** (linéaire), alors que les vrais moteurs de coût sont **super-linéaires** : le cron `parcours` transfère l'historique complet de tous les tenants 2×/jour, et les listes non paginées transfèrent des tables entières à chaque vue.
- **Preuve :** `couts.ts:10` (`COUT_INFRA_FIXE_EUR=5`), `:29` (appliqué à plat), `:63-66` (Neon Launch→Scale double le CU-heure, ≈ 45 % de l'infra à 100 clients) vs `automation-engine.ts:166` (scan complet non borné, 2×/jour `vercel.json:28-34`).
- **Scénario d'impact (ordres de grandeur, à mesurer) :** 10 OF ≈ 50 €/mois (marge saine face aux paliers 59-690 €/OF) ; à 50 OF, le seul cron peut ajouter ~100+ Go/mois de transfert Neon ; à 200 OF, bascule Launch→Scale. **Anomalie business :** un OF « lourd » sur un petit palier consomme un transfert disproportionné.
- **Cause racine :** coût non instrumenté par tenant ; drivers super-linéaires (A07-001/003/008) non modélisés.
- **Recommandation :** corriger d'abord A07-001/003/008 (ils dominent la facture) ; instrumenter le coût **par tenant** (déjà amorcé dans `couts.ts`/`usage.ts`) ; surveiller le palier Neon ; envisager un plafond d'usage/facturation au dépassement.
- **Charge :** L — **Priorité :** P2 — **Type :** Chantier
- **Vérification de la correction :** suivre transfert (Go) + CU-heures Neon + GB-secondes Vercel par tenant (dashboards) rapportés au CA du palier.

#### A07-010 — `runAutomationsNow` : le bouton d'un tenant déclenche le balayage global (tous OF) en synchrone — 🟠
- **Constat :** la server action derrière le bouton « Exécuter maintenant » d'un OF appelle `runAutomations()` **sans argument** → le balayage **global** (tous tenants) tourne en synchrone, au budget par défaut. À contraster avec `runCircuitsNow` qui, lui, est correctement scopé au tenant.
- **Preuve :** `automation-actions.ts:31-33` (`runAutomations()` sans `organismeId`) vs `circuit-actions.ts:112-113` (`runCircuits(organismeId)`). Bouton rendu sur `/automatisations` (page tenant) ; `runAutomations` est global (`automation-engine.ts:92,166`). Recoupe l'audit 05 (effets cross-tenant).
- **Scénario d'impact :** un clic d'un admin d'OF lance le sweep de **toute la plateforme** en synchrone → timeout probable au volume cible, et déclenche les envois dus des **autres** tenants ; le compteur du toast agrège d'autres OF.
- **Cause racine :** action non scopée au tenant courant.
- **Recommandation :** scoper `runAutomationsNow` au tenant (`organismeId`) comme `runCircuitsNow`, ou passer en déclenchement **asynchrone** avec retour immédiat.
- **Charge :** S — **Priorité :** P1 — **Type :** **Quick win**
- **Vérification de la correction :** en base de test, vérifier que le clic d'un tenant n'écrit des jalons **que** pour ses inscriptions.

---

### 4. POINTS CONFORMES (🟢)

1. **Région colocalisée** : `vercel.json:1` `"regions":["fra1"]` (collé à Neon Francfort) — latence app↔base minimale.
2. **21 routes PDF provisionnées** `memory:1769`/`maxDuration:60` + binaire Chromium injecté par `PDF_ENTRYPOINTS` — `vercel.json:4-24`, `next.config.ts:51-90,133`.
3. **PDF : un seul navigateur réutilisé** pour un lot de documents + coupe-circuit 45 s — `pdf.ts:53-78`.
4. **Dossier PDF mis en cache en base** (évite Chromium à chaque ouverture) + purge à 120 j — `pdf-cache.ts:47`, cron `purge-pdf-cache`.
5. **Garde-fou anti sur-transfert** : colonne 8 Mo `dossierPdf` exclue par défaut de toutes les requêtes (testé) — `prisma.ts:18-20`, `__tests__/prisma-omit.test.ts`.
6. **Numérotation séquentielle atomique** (`UPDATE ... increment RETURNING`, pas de `count()+1`) — `numerotation.ts:37-42`.
7. **Transactions interactives courtes** (aucun PDF/e-mail sous verrou) — `civique-api.ts:188-247`.
8. **Tableau de bord (écran le plus consulté) optimisé** : `Promise.all` de 12 requêtes, `count()` pour les KPI, `take:5` pour les listes, résolution des noms par lot — `dashboard/page.tsx:101-199`.
9. **Idempotence anti-double-envoi** : `claimInsc` compare-and-set atomique + circuits `@@unique([stepId, inscriptionId])` — `automation-engine.ts:47-53`.
10. **Génération d'émargements en `createMany` unique** (pas de N+1 en écriture) — `emargement-signature-actions.ts:91-112`.
11. **Crons de purge/statut ensemblistes** (`updateMany`, pas de boucle applicative) — `suspend-trials`, `purge-pdf-cache`.
12. **Collecte FEC/comptable sans N+1** (`Promise.all` + `select` imbriqué, bornée à l'année) — `collect.ts:21-42`.
13. **Singleton Prisma correct** + endpoint Neon **pooled** + `directUrl` (`pgbouncer`) — `prisma.ts:35-37`, `schema:11-15`.
14. **Redis/Upstash réservé au rate-limit**, repli mémoire non auto-DoS, fail-closed ciblé — `rate-limit.ts:62-116`.
15. **Sentry correctement câblé et fail-safe** : inerte sans DSN, capture auto App Router (`instrumentation.ts:18`), 6/7 crons enveloppés par `runCron` qui reporte, error boundaries + digest affiché — `cron-runner.ts:19-28`, `error.tsx:18`.
16. **Tables principales paginées côté client** (DOM borné, `PAGE_SIZE 20`) — `crm/dossiers/sessions/data-table` (exception = candidats, cf. A07-002) ; API tarifs en ISR 300 s, API vitrine keyée par tenant via la query string.

---

### 5. CONTRÔLES NON RÉALISÉS

| Contrôle | Raison | Ce qu'il faudrait pour le faire |
|---|---|---|
| Test de charge live (p95 API, LCP/TTFB, point de rupture) | Interdit sur prod (base Neon partagée), pas d'env dédié au moment de l'audit | **EN COURS** : kit `loadtest/` livré (§8) ; base de test isolée à fournir → mesures chiffrées à annexer |
| `EXPLAIN ANALYZE` réels + sélectivité des index proposés | Nécessite des volumes réalistes ; prod interdite | Rejouer sur la base de test remplie (`loadtest/bench-db.mjs` fait déjà l'`EXPLAIN` comptabilité) |
| Paramètres réels de `DATABASE_URL` prod (`connection_limit`, `pgbouncer`) → épuisement de connexions serverless | Secret d'env Vercel non lisible | Lire la valeur prod (hors dépôt) ; test de concurrence en staging |
| `maxDuration`/mémoire **par défaut** des fonctions non listées (crons/exports) | Réglage du compte/plan Vercel (Fluid Compute), absent du dépôt | Consulter les réglages du projet Vercel |
| Taille des bundles client (First Load JS) par route | Nécessite `next build` (non exécuté ; piège `.next` pendant le dev) | Lancer `next build` dev arrêté + analyse |
| Consommation Neon réelle (CU-heures, Go transfert) par tenant + palier Launch/Scale | Données du dashboard Neon, non attribuables depuis le code | Dashboards Neon/Vercel + instrumentation par tenant |
| Sentry/Plausible réellement actifs en prod (DSN, `TRACES_SAMPLE_RATE`) | Variables d'env Vercel (toutes `[OPT]`) | Vérifier les env du déploiement |
| Volumes réels par tenant confirmant la bascule orange→rouge | Données de production (lecture interdite) | Statistiques prod anonymisées, ou base de test au profil cible |

---

### 6. QUICK WINS (fort risque, faible charge — à traiter en premier)

1. **A07-001 (mitigation immédiate)** — ajouter `memory:1769`+`maxDuration:60` à `/api/cron/parcours` (et aux routes d'export / `rgpd-purge`) dans `vercel.json`, **et** mémoïser `orgConfigFor` (Map `organismeId→identité`) → supprime le N+1. *(S)*
2. **A07-007** — ajouter les index manquants (`Inscription.sessionId`, `(organismeId, createdAt)` sur les journaux, FK entreprise/apprenant) via `prisma db push` **hors pic**. *(S)*
3. **A07-002 (partiel)** — retirer `photoUrl`/colonnes base64 du `select` de la liste candidats. *(S)*
4. **A07-010** — scoper `runAutomationsNow` au tenant courant. *(S)*
5. **A07-012** — remplacer les histogrammes JS par `groupBy` SQL (leads-multicanal, rapports). *(S)*
6. **A07-022** — activer le prompt caching Anthropic. *(S)*
7. **A07-027 / A07-026** — `withSentryConfig` (source maps) + `@vercel/speed-insights` (RUM) + supprimer le mock Web Vitals. *(S)*

---

### 7. PLAN DE REMÉDIATION

- **Vague 1 — avant montée en charge / P0 (charge cumulée ~L) :**
  1. A07-001 — cron `parcours` : quick wins immédiats (provisionner + mémoïser) puis borner par fenêtre de dates + sortir les PDF de la boucle + inverser claim/send.
  2. A07-002 — Candidats : retrait base64 du `select` (quick win) puis pagination serveur + miniature Blob.

- **Vague 2 — avant les premiers clients à fort volume / P1 :**
  - A07-007 (index — quick win), A07-010 (scoper le bouton — quick win), A07-003 (pagination serveur systémique des listes), A07-004 (exports bornés/provisionnés), A07-005 (ZIP session), A07-006 (purge RGPD budget global), A07-021 (API publique : organisme explicite).

- **Vague 3 — J+90 / P2-P3 :**
  - A07-008 (base64/PDF → Blob), A07-009 (instrumentation coût par tenant), et le socle **observabilité** (A07-024/025 : logs avec `organismeId` + durées ; A07-026/027/028/029/030) + optimisations (A07-011 over-fetch/`select`, A07-012 groupBy, A07-013 images, A07-014 Suspense, A07-015 curseur, A07-016 écritures de masse, A07-018 Chromium signature, A07-019 throttle e-mail, A07-020 import CSV, A07-022/023).

---

### 8. ANNEXES

**Méthode :** 5 sous-agents spécialistes en parallèle (Workflow journalisé) → contre-vérification adversariale de chaque constat 🔴/🟠 (28 CONFIRMÉ, 0 RÉFUTÉ, 4 RECLASSÉS à la baisse) → dédoublonnage + arbitrage de gravité par le chef de projet. Preuve `fichier:ligne` obligatoire ; aucune mesure inventée.

**Outils/versions :** Next.js 16.3.1, React 19.2.4, Prisma 6.19.3, Neon PostgreSQL (pooled), Vercel `fra1`, Chromium serverless `@sparticuz/chromium` + `puppeteer-core`, Upstash Redis (rate-limit), Vercel Blob, Sentry `@sentry/nextjs` 10.70.0, `autocannon` 8 (présent en devDeps).

**Fichiers clés analysés :** `automation-engine.ts`, `automation/circuits-engine.ts`, `pdf.ts`, `documents/build-pdf.ts`/`build-session-zip.ts`/`build-zip.ts`, `prisma.ts`, `tenant.ts`, `rgpd-retention.ts`, `rgpd/anonymise.ts`, `export.ts`/`export-pdf.ts`, `couts.ts`, `org-identity.ts`, `email.ts`, `cron-runner.ts`, `observability/report-error.ts`, `prisma/schema.prisma`, `vercel.json`, `next.config.ts`, et les pages `(app)/{candidats,comptabilite,signatures,crm,sessions,dashboard,leads-multicanal,rapports}`.

**Kit de mesure livré (`loadtest/`, hors code produit) :**
- `seed-loadtest.mjs` — remplit une **base de test isolée** avec un volume réaliste (échelle `petit`/`moyen`/`grand` : candidats, sessions, inscriptions, émargements, factures, paiements). Garde-fous anti-prod : n'utilise que `LOADTEST_DATABASE_URL`, refuse une base qui contient déjà d'autres organismes, exige `LOADTEST_CONFIRM=1`.
- `bench-db.mjs` — chronomètre p50/p95/max des **requêtes réelles** des écrans lourds (comptabilité, candidats, signatures, émargements, contrôle de places) + `EXPLAIN ANALYZE` sur la requête comptabilité (détection Seq Scan).
- `README.md` — mode d'emploi (création d'une base Neon de test en 2 clics + commandes).
> Les chiffres mesurés seront **annexés à ce rapport** une fois la base de test isolée fournie (décision utilisateur : mesures locales sur base isolée).

---

### 9. BLOC DE CONSOLIDATION (ne pas modifier le format)

```json
{
  "audit_id": 7,
  "audit_nom": "Audit performance / charge",
  "date": "2026-08-28",
  "commit": "0a4916b",
  "verdict": "GO_CONDITIONNEL",
  "compteurs": {"rouge": 2, "orange": 8, "jaune": 20, "vert": 16, "non_verifie": 8},
  "anomalies": [
    {"id": "A07-001", "gravite": "rouge", "titre": "Cron parcours : scan non borné tous tenants + PDF en boucle + N+1, sans maxDuration", "composant": "automation-engine.ts / cron/parcours / vercel.json", "preuve": "automation-engine.ts:166,173 ; cron/parcours/route.ts (pas de maxDuration) ; vercel.json:3-25", "impact": "Rupture du cron Qualiopi sous charge cible + perte fonctionnelle silencieuse (jalons posés sans envoi)", "recommandation": "Borner par fenêtre de dates + pagination ; sortir les PDF en file ; mémoïser orgConfigFor ; provisionner la route", "charge": "L", "priorite": "P0", "type": "chantier", "depend_de": []},
    {"id": "A07-002", "gravite": "rouge", "titre": "Liste Candidats non paginée + photos base64 + DOM intégral", "composant": "candidats/page.tsx + candidats-table.tsx", "preuve": "candidats/page.tsx:23,50 ; candidats-table.tsx:164,170 ; schema:676", "impact": "Écran principal en rupture au volume cible (payload dizaines de Mo)", "recommandation": "Pagination serveur + select sans base64 + miniature Blob + virtualisation", "charge": "L", "priorite": "P0", "type": "chantier", "depend_de": []},
    {"id": "A07-003", "gravite": "orange", "titre": "Écrans de liste chargent toute la table du tenant (systémique)", "composant": "comptabilite/signatures/crm/sessions/detail", "preuve": "comptabilite/page.tsx:55 ; signatures/page.tsx:26 ; crm/page.tsx:19 ; sessions/page.tsx:20 ; sessions/detail.ts:62", "impact": "TTFB/LCP hors seuils au volume cible", "recommandation": "Pagination serveur + groupBy/aggregate + select ciblé", "charge": "L", "priorite": "P1", "type": "chantier", "depend_de": []},
    {"id": "A07-004", "gravite": "orange", "titre": "Exports non bornés + non provisionnés ; PDF plein-tableau Chromium", "composant": "routes */export", "preuve": "candidats/export/route.ts:19 ; export-pdf.ts:29-45 ; administration/export/route.ts:29-40 ; vercel.json (absent)", "impact": "Export inutilisable au-delà d'un volume réaliste (OOM/timeout)", "recommandation": "Borner/streamer, plafonner le PDF, provisionner memory/maxDuration", "charge": "M", "priorite": "P1", "type": "standard", "depend_de": []},
    {"id": "A07-005", "gravite": "orange", "titre": "ZIP dossier session : boucle série jusqu'à 80 participants dans un GET 60s", "composant": "build-session-zip.ts / build-zip.ts", "preuve": "build-session-zip.ts:8,79 ; build-zip.ts:63,78,116,135", "impact": "Timeout pour les grandes sessions", "recommandation": "Sortir logo/orgConfig de la boucle, paralléliser (concurrence limitée), déporter en tâche de fond", "charge": "M", "priorite": "P1", "type": "standard", "depend_de": ["A07-001"]},
    {"id": "A07-006", "gravite": "orange", "titre": "Cron RGPD : budget 500 PAR organisme (pas global) + ~9 req/candidat en série, sans maxDuration", "composant": "rgpd-retention.ts / rgpd/anonymise.ts", "preuve": "rgpd-retention.ts:12,33,38,50 ; anonymise.ts:124-179", "impact": "Débit nocturne insuffisant + famine des OF en fin de liste à 200 OF", "recommandation": "Budget global par run + maxDuration + pagination keyset équitable", "charge": "M", "priorite": "P1", "type": "standard", "depend_de": []},
    {"id": "A07-007", "gravite": "orange", "titre": "Index manquants (Inscription.sessionId ; (organismeId, createdAt) journaux ; FK B2B)", "composant": "prisma/schema.prisma", "preuve": "schema:1163-1166 ; inscription-actions.ts:506 ; console-audit.ts:34 ; dashboard/page.tsx:128", "impact": "Lecture de toute la partition du tenant avant filtre/tri ; coût croissant", "recommandation": "@@index([sessionId,statut]), @@index([organismeId,createdAt]), FK ; prisma db push hors pic", "charge": "S", "priorite": "P1", "type": "quick_win", "depend_de": []},
    {"id": "A07-008", "gravite": "orange", "titre": "Octets PDF (8Mo) + images base64 (signatures) stockés dans Postgres/Neon", "composant": "modèle de données / stockage", "preuve": "schema:1159,1099,1277 ; prisma.ts:18-20 ; couts.ts:48-51", "impact": "Stockage/transfert/sauvegardes Neon croissent avec le cumul (poste n°1 de coût)", "recommandation": "Migrer vers Vercel Blob (URL) ; étendre l'omit aux signatures", "charge": "L", "priorite": "P2", "type": "chantier", "depend_de": []},
    {"id": "A07-009", "gravite": "orange", "titre": "Coût 10/50/200 OF : modèle linéaire vs transfert Neon super-linéaire", "composant": "couts.ts (modèle)", "preuve": "couts.ts:10,29,63-66 vs automation-engine.ts:166", "impact": "Coût d'infra croissant plus vite que le CA ; OF lourd sur petit palier", "recommandation": "Corriger A07-001/003/008 ; instrumenter le coût par tenant ; plafond d'usage", "charge": "L", "priorite": "P2", "type": "chantier", "depend_de": ["A07-001", "A07-003", "A07-008"]},
    {"id": "A07-010", "gravite": "orange", "titre": "runAutomationsNow : bouton d'un tenant déclenche le balayage global (tous OF)", "composant": "automation-actions.ts", "preuve": "automation-actions.ts:31-33 vs circuit-actions.ts:112", "impact": "Un clic consomme du compute proportionnel à toute la plateforme ; timeout probable", "recommandation": "Scoper au tenant (organismeId) comme runCircuitsNow, ou asynchrone", "charge": "S", "priorite": "P1", "type": "quick_win", "depend_de": []},
    {"id": "A07-011", "gravite": "jaune", "titre": "Sur-lecture : PRISMA_OMIT ne couvre que dossierPdf (base64/JSON tirés sans select)", "composant": "lib/prisma + loaders", "preuve": "prisma.ts:18-20 ; sessions/detail.ts ; candidats/detail.ts:43", "impact": "Sur-transfert quota Neon", "recommandation": "Étendre l'omit + select explicite", "charge": "S", "priorite": "P2", "type": "standard", "depend_de": []},
    {"id": "A07-012", "gravite": "jaune", "titre": "Histogrammes calculés en JS au lieu de groupBy SQL", "composant": "leads-multicanal/page.tsx, rapports/page.tsx", "preuve": "leads-multicanal/page.tsx:34 ; rapports/page.tsx:55", "impact": "Transfert proportionnel au nb de candidats pour un comptage", "recommandation": "groupBy({ by, _count })", "charge": "S", "priorite": "P2", "type": "quick_win", "depend_de": []},
    {"id": "A07-013", "gravite": "jaune", "titre": "next/image quasi absent ; <img> bruts non lazy/non optimisés", "composant": "rendu images back-office", "preuve": "75 <img> ; next/image sur 4 pages publiques ; pas de config images", "impact": "Pas de redimensionnement/lazy sur logos & photos", "recommandation": "Blob + next/image ; à défaut loading=lazy", "charge": "L", "priorite": "P2", "type": "standard", "depend_de": ["A07-008"]},
    {"id": "A07-014", "gravite": "jaune", "titre": "Aucune frontière Suspense (un seul loading.tsx)", "composant": "segment (app)", "preuve": "grep Suspense (app) = 0 ; app/(app)/loading.tsx", "impact": "Pas de streaming progressif sur écrans lourds", "recommandation": "Suspense autour des blocs coûteux", "charge": "M", "priorite": "P3", "type": "standard", "depend_de": []},
    {"id": "A07-015", "gravite": "jaune", "titre": "Pagination par offset uniquement (aucun curseur Prisma)", "composant": "stratégie pagination", "preuve": "grep cursor: Prisma = 0 ; take: = 52", "impact": "Pages lointaines coûteuses", "recommandation": "Curseur sur clé indexée", "charge": "M", "priorite": "P3", "type": "standard", "depend_de": []},
    {"id": "A07-016", "gravite": "jaune", "titre": "Écritures cloisonnées findFirst-puis-écriture (2 req/écriture)", "composant": "scopedPrisma", "preuve": "tenant.ts:93-104,65-77", "impact": "Amplification en écriture de masse ; pool serverless", "recommandation": "updateMany/deleteMany pour la masse", "charge": "M", "priorite": "P3", "type": "standard", "depend_de": []},
    {"id": "A07-017", "gravite": "jaune", "titre": "Console Prospects : lead.findMany non borné + Text + orderBy non indexé", "composant": "console/prospects/page.tsx", "preuve": "console/prospects/page.tsx:13 ; schema:2103-2149", "impact": "Non borné (console éditeur, impact limité)", "recommandation": "Paginer/select sans Text ; @@index([lu,createdAt])", "charge": "S", "priorite": "P3", "type": "standard", "depend_de": []},
    {"id": "A07-018", "gravite": "jaune", "titre": "Signature candidat : 3 Chromium en série sur le chemin critique", "composant": "parcours-actions.ts", "preuve": "parcours-actions.ts:589,659,660", "impact": "Le candidat attend ~3 démarrages Chromium à froid", "recommandation": "Regrouper en un htmlToPdfMany, ou tâche de fond", "charge": "S", "priorite": "P2", "type": "quick_win", "depend_de": []},
    {"id": "A07-019", "gravite": "jaune", "titre": "E-mails en masse sans throttle/backoff 429/file", "composant": "email.ts + moteurs", "preuve": "email.ts:99,175 ; automation-engine.ts:141 ; circuits-engine.ts:92", "impact": "Débit fournisseur non géré ; latence série alimente le timeout", "recommandation": "File avec concurrence limitée + backoff 429", "charge": "M", "priorite": "P2", "type": "standard", "depend_de": []},
    {"id": "A07-020", "gravite": "jaune", "titre": "importLeadsCsv : findFirst+create+logEvent par ligne (N+1)", "composant": "growth-actions.ts", "preuve": "growth-actions.ts:151-173 (borné 500, SUPERADMIN)", "impact": "~1500 allers-retours/import (occasionnel)", "recommandation": "Précharger emails (IN) + createMany", "charge": "S", "priorite": "P3", "type": "standard", "depend_de": []},
    {"id": "A07-021", "gravite": "jaune", "titre": "API publique : sans organisme explicite, réponse tous-tenants en cache public", "composant": "public/formations, public/sessions", "preuve": "public-scope.ts:17-21 ; formations/route.ts:29,77", "impact": "Agrégation/cache cross-tenant en cas de misconfig (cf. audit 05)", "recommandation": "Exiger un organisme (400 sinon) ou ne pas cacher en public", "charge": "S", "priorite": "P1", "type": "quick_win", "depend_de": []},
    {"id": "A07-022", "gravite": "jaune", "titre": "Assistant IA : prompt caching Anthropic non activé", "composant": "lib/ai.ts", "preuve": "ai.ts:49-54", "impact": "Coût IA par appel plus élevé (Haiku par défaut = limité)", "recommandation": "cache_control ephemeral sur le system", "charge": "S", "priorite": "P3", "type": "quick_win", "depend_de": []},
    {"id": "A07-023", "gravite": "jaune", "titre": "Taux réussite vitrine : scan non borné des certifiés au cache-miss", "composant": "vitrine-stats.ts", "preuve": "vitrine-stats.ts:24 (amorti CDN 5 min)", "impact": "Recalcul lourd au cache-miss pour un gros OF", "recommandation": "Précalculer/groupBy", "charge": "S", "priorite": "P3", "type": "standard", "depend_de": []},
    {"id": "A07-024", "gravite": "jaune", "titre": "Logs sans organismeId → diagnostic multi-tenant aveugle (reclassé d'orange)", "composant": "journalisation", "preuve": "action-result.ts:25 ; middleware.ts ; grep organismeId/requestId = 0 ; EXPLOITATION.md:49", "impact": "Impossible de filtrer une lenteur/erreur par OF", "recommandation": "Logger JSON (organismeId, route, durée) + Sentry.setTag", "charge": "M", "priorite": "P2", "type": "standard", "depend_de": []},
    {"id": "A07-025", "gravite": "jaune", "titre": "Aucune mesure de durée des opérations lourdes (reclassé d'orange)", "composant": "métriques durée", "preuve": "pdf.ts (aucune durée) ; cron-runner.ts:20 ; pdf-test/route.ts:22", "impact": "Impossible de détecter une dérive vers le mur 60s", "recommandation": "Journaliser {tag,organismeId,ms,taille} en sortie de htmlToPdfMany/runCron", "charge": "M", "priorite": "P2", "type": "standard", "depend_de": []},
    {"id": "A07-026", "gravite": "jaune", "titre": "Web Vitals : module mock jamais appelé, aucun RUM", "composant": "web-vitals front", "preuve": "performance/web-vitals.ts:73 ; pas de web-vitals/speed-insights", "impact": "LCP/TTFB non mesurés en conditions réelles", "recommandation": "@vercel/speed-insights ; supprimer le mock", "charge": "S", "priorite": "P2", "type": "quick_win", "depend_de": []},
    {"id": "A07-027", "gravite": "jaune", "titre": "Sentry : withSentryConfig absent → source maps non téléversées", "composant": "Sentry build", "preuve": "next.config.ts:138 ; grep withSentryConfig = 0", "impact": "Stacks prod minifiées → diagnostic ralenti", "recommandation": "Enrober next.config + SENTRY_AUTH_TOKEN", "charge": "S", "priorite": "P2", "type": "quick_win", "depend_de": []},
    {"id": "A07-028", "gravite": "jaune", "titre": "reportError peu adopté : échecs PDF avalés non remontés à Sentry", "composant": "couverture erreurs", "preuve": "reportError = 3 sites ; automation-engine.ts:72 ; parcours-actions.ts:92", "impact": "Panne Chromium récurrente invisible dans Sentry", "recommandation": "Router les catch PDF via reportError", "charge": "S", "priorite": "P2", "type": "quick_win", "depend_de": []},
    {"id": "A07-029", "gravite": "jaune", "titre": "Retries DB non journalisés → latence Neon invisible", "composant": "résilience DB", "preuve": "db-retry.ts:45-57,68", "impact": "Vague de retries passe inaperçue jusqu'à l'échec franc", "recommandation": "Loguer (warn échantillonné) tentatives + temps cumulé", "charge": "S", "priorite": "P3", "type": "standard", "depend_de": []},
    {"id": "A07-030", "gravite": "jaune", "titre": "Prisma ne loggue pas les requêtes lentes + aucune route /health", "composant": "observabilité DB", "preuve": "prisma.ts:30 ; glob api/health = 0", "impact": "Requête lente non identifiable ; pas de sonde DB", "recommandation": "$on('query') à seuil derrière un flag + /api/health", "charge": "S", "priorite": "P3", "type": "standard", "depend_de": []}
  ],
  "conditions_go": [
    "Corriger A07-001 (borner le cron + le provisionner + supprimer le N+1) avant d'onboarder au-delà d'une dizaine d'OF",
    "Corriger A07-002 (paginer Candidats + sortir les photos base64 de la liste) avant les premiers OF à fort volume",
    "Traiter les P1 (A07-003 pagination serveur, A07-004 exports, A07-006 purge RGPD, A07-007 index, A07-010 bouton global, A07-021 API publique) avant la montée en charge commerciale"
  ],
  "risques_residuels": [
    "Mesures live (p95, LCP/TTFB, points de rupture) non produites : à confirmer sur base de test isolée (kit loadtest/ livré)",
    "Paramètres de connexion Neon prod (pool) et maxDuration par défaut Vercel non vérifiables depuis le dépôt",
    "Bascule orange→rouge des scans non bornés dépend des volumes réels par tenant (non mesurés)"
  ]
}
```
