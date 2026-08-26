# COMPTE RENDU D'AUDIT 05 — Audit multi-tenant
## OFMANAGER — Programme d'audit de pré-commercialisation

**Date :** 2026-08-26
**Version auditée :** branche `security/audit-90-controls-2026-08` — commit `a23ae3a` (⚠️ la branche a avancé pendant l'audit, `399de42` → `a23ae3a` ; constats re-vérifiés sur `a23ae3a`)
**Chef de projet audit :** Claude Code (chef de projet senior)
**Équipe mobilisée :** Expert BDD multi-tenant, 2× Développeur backend senior (Server Actions), Pentester isolation (routes API), Pentester isolation (flux publics/RSC), Architecte SaaS (console/documents/libs), Spécialiste onboarding/provisioning + 5 vérificateurs adversariaux (contre-vérification des constats cross-tenant).
**Périmètre couvert :** Étanchéité **entre** organismes clients (frontière inter-tenant) : modèle de données, portée de toutes les requêtes, résolution du tenant, flux publics, console éditeur, cycle de vie d'un tenant. Les droits **intra**-tenant (rôles/permissions) relèvent de l'audit 18 et sont seulement signalés ici.
**Durée / profondeur :** Revue statique **exhaustive** (aucun échantillonnage) : schéma 86/86 modèles ; 89/89 Server Actions ; 44/44 routes API ; ~48 pages/routes publiques ; 201/201 pages RSC `(app)` ; 19 fichiers console ; 33 libs transverses ; 35/40 fichiers de cycle de vie. Tests d'isolation **à l'exécution** non réalisés (base de données = Neon partagée/prod, cf. §5).

---

### 1. SYNTHÈSE EXÉCUTIVE

Le cloisonnement d'OFMANAGER repose sur un moteur applicatif solide — `scopedPrisma()` — qui injecte automatiquement l'identifiant d'organisme (`organismeId`) dans chaque requête, doublé d'un test de CI qui interdit d'utiliser le client de base « brut » hors d'une liste blanche revue. **Là où ce dispositif s'applique (l'espace connecté, 201 pages sur 201), aucune fuite n'a été trouvée.** Le problème est ailleurs : ce garde-fou **ne couvre pas** les routes d'API, les pages publiques hors de l'espace connecté, ni les librairies transverses. Or c'est précisément dans ces angles morts que se logent **4 défauts d'étanchéité confirmés** : une page publique `/inscription` qui liste les sessions de **tous** les OF, une API `civique/lead` qui écrit une fiche candidat dans **n'importe quel** organisme, la création d'inscription qui ne revérifie pas l'appartenance du candidat, et surtout un **déclencheur d'automatismes qui traite les données de tous les tenants** — actionnable par un simple administrateur d'un seul OF. Aucun de ces défauts n'est architectural : le bon patron existe déjà à côté (le moteur de « circuits » jumeau, lui, est correctement cloisonné). La correction est courte et ciblée, mais **elle doit précéder toute mise en production commerciale**. S'y ajoute une lacune de cycle de vie : pas de suppression réelle d'un tenant (RGPD), et l'essai expiré ne bloque pas l'accès (le cron de suspension n'est pas planifié).

| 🔴 Rouge | 🟠 Orange | 🟡 Jaune | 🟢 Vert |
|---|---|---|---|
| 2 | 5 | 12 | 10 |

**VERDICT : GO CONDITIONNEL**
Le socle est sain et les défauts sont circonscrits et corrigeables en quelques jours, mais deux d'entre eux touchent la frontière inter-tenant (écritures/effets cross-tenant) — 🔴 par l'échelle de l'audit. **Conditions de GO (toutes P0, avant le premier client payant) :** (1) cloisonner `runAutomationsNow` à l'organisme appelant (A05-001) ; (2) confirmer que `CIVIC_ORGANISME_ID` est épinglé en prod et ajouter une liste blanche (A05-002) ; (3) cloisonner ou retirer `/inscription` (A05-003) ; (4) étendre le garde-fou d'import aux `app/api/**`, pages hors `(app)` et `lib/**` (A05-007) pour empêcher toute régression.

---

### 2. TABLEAU DES ANOMALIES

| ID | Gravité | Titre | Composant | Preuve | Impact | Recommandation | Charge | Priorité |
|---|---|---|---|---|---|---|---|---|
| A05-001 | 🔴 | Déclencheur d'automatismes non cloisonné → effets/écritures cross-tenant | `lib/automation-engine.ts`, `lib/actions/automation-actions.ts` | `automation-engine.ts:92,166` + `automation-actions.ts:28-36` | Un ADMIN d'un OF déclenche l'envoi d'e-mails + écritures (emailLog/jalons) sur les inscriptions de **tous** les tenants | Scoper comme `runCircuitsNow` : `runAutomations(organismeId)` filtrant chaque balayage par l'org de session | M | P0 |
| A05-002 | 🔴 | `civique/lead` : `organismeId` fourni par le client → écriture PII cross-tenant | `app/api/civique/lead/route.ts` | `route.ts:48` `CIVIC_ORGANISME_ID ?? body.organismeId` | Création/MAJ d'un `Candidat` (nom, e-mail, tél.) dans un organisme arbitraire si l'env n'est pas épinglée en prod | Épingler `CIVIC_ORGANISME_ID` côté serveur + liste blanche d'organismes vitrine | S | P0 |
| A05-003 | 🟠 | `/inscription` : `findMany` sessions sans filtre org (page publique) | `app/inscription/page.tsx` | `page.tsx:22` | Toute personne voit les sessions ouvertes (titre, date, lieu) de **tous** les OF | Scoper par `?organisme=`/sous-domaine (motif `organismeScope`) ou retirer la page | S | P0 |
| A05-004 | 🟠 | `createInscription` : FK candidat/session non revérifiées → lecture PII cross-tenant | `lib/actions/inscription-actions.ts` | `inscription-actions.ts:377-404` | Staff de A crée `Inscription{org:A, candidatId:B}` puis lit la PII du candidat B via `include` | Revérifier l'appartenance (`db.candidat.findFirst({where:{id}})`) avant le `create`, comme `inviterInscriptionDistance` | S | P1 |
| A05-005 | 🟠 | Aucune FK/cascade vers `Organisme` (76 modèles en scalaire nu) | `prisma/schema.prisma` | 5 FK seulement (`184,234,275,586,2043`) sur 86 modèles | Purge/suppression d'un tenant impossible au niveau base ; `organismeId` peut pointer un org inexistant | Ajouter FK `organismeId → Organisme onDelete:Cascade`, ou routine de purge applicative exhaustive prouvée | L | P1 |
| A05-006 | 🟠 | Cron `suspend-trials` non planifié + pas de contrôle abonnement en écriture | `vercel.json`, `app/api/cron/suspend-trials` | `vercel.json` (clé `crons` sans `suspend-trials`) | Un tenant dont l'essai a expiré **conserve l'accès en écriture** indéfiniment | Planifier le cron + vérifier `org.statut`/échéance dans `requireStaffTenant`/`assertLiveSession` | S/M | P1 |
| A05-007 | 🟠 | Garde-fou d'import à couverture incomplète (cause racine des fuites) | `lib/__tests__/prisma-direct-guard.test.ts` | `APP_DIR = app/(app)` + `ACTIONS_DIR = lib/actions` seuls | `app/api/**`, pages hors `(app)`, `lib/*.ts`, `console/**` non surveillés → régressions cross-tenant silencieuses | Étendre le walk à `app/**` + `lib/**` ; à terme activer la **RLS** (barrière runtime) | M | P1 |
| A05-008 | 🟡 | `civique/checkout` : même `body.organismeId` (frère de A05-002, sous paiement) | `app/api/civique/checkout/route.ts` | `route.ts:71` | Provisionnement candidat/paiement attribué à un org arbitraire (gated par un paiement réel) | Idem A05-002 | S | P2 |
| A05-009 | 🟡 | `organismeId` nullable de façon quasi-généralisée | `prisma/schema.prisma` | ~80 modèles `organismeId String?` | Une ligne à `organismeId=NULL` échappe au filtre `where organismeId=X` | Rendre NOT NULL sur les modèles purement tenant (après backfill) | L | P2 |
| A05-010 | 🟡 | `User.email` unique **global** (cross-tenant) | `prisma/schema.prisma:573` | `email String @unique` | Un e-mail ne peut exister que dans un OF ; énumération d'existence cross-tenant | Trancher : identité globale assumée (SSO) vs `@@unique([organismeId,email])` pour comptes end-user | L | P3 |
| A05-011 | 🟡 | Références inter-entités en `String` nu (ni FK, ni garde same-org) | `prisma/schema.prisma` | `Diplome:2521`, `TitreDelivre:2576`, `Tache:1563`, `SmsLog:1579`… | Aucune garantie base que l'entité pointée soit du même org (cohérence 100% applicative) | Ajouter FK ou valider l'appartenance avant écriture | M | P2 |
| A05-012 | 🟡 | Blob d'upload non préfixé par organisme | `app/api/upload/route.ts` | `route.ts:36-37` (`folder` client, non préfixé) | Absence de cloisonnement logique (mitigé : URL non devinable `addRandomSuffix`) | Préfixer le dossier par `session.user.organismeId` | S | P2 |
| A05-013 | 🟡 | Suspension appliquée seulement au login/layout | `auth.config.ts`, `lib/tenant.ts` | `auth.config.ts:30` (JWT-only), `assertLiveSession` (pas de `org.statut`) | Server Actions et flux publics restent ouverts pour un org suspendu | Vérifier `org.statut` dans `assertLiveSession` | M | P1 |
| A05-014 | 🟡 | Aucun chemin de suppression complète d'un tenant réel (offboarding RGPD) | `lib/demo/purge.ts`, `lib/rgpd-retention.ts` | `purge.ts:55` (réservé `isDemo`), seul `organisme.delete` = démo | Impossible d'effacer un client sortant (réversibilité contractuelle / RGPD art. 17) | Implémenter une purge tenant vérifiable (couplé A05-005) | L | P2 |
| A05-015 | 🟡 | La purge (démo) laisse des fichiers Blob orphelins | `lib/demo/purge.ts` | ne supprime que des lignes DB, jamais `del()` de `@vercel/blob` | Résidu RGPD hors base | Ajouter `bestEffortDeleteBlobs` (déjà présent dans `rgpd/anonymise.ts:99`) | S | P2 |
| A05-016 | 🟡 | Quotas (e-mails/inscriptions) purement déclaratifs — dépassement silencieux | `lib/usage.ts`, `lib/seats.ts` | `getOrgUsage` appelé pour l'affichage/facturation seulement | Un tenant dépasse ses limites sans blocage | Appliquer les quotas dans les chemins d'écriture concernés | M | P2 |
| A05-017 | 🟡 | Garde SUPERADMIN ré-implémentée en ligne sans contrôle de révocation | `lib/actions/formations-config-actions.ts:27-35` | contrôle manuel au lieu de `requireSuperAdmin()` | Un token SUPERADMIN révoqué (SEC-014) reste accepté sur cette action | Appeler `requireSuperAdmin()` | S | P2 |
| A05-018 | 🟡 | FK smuggling intra-tenant (`t3p`, `validation`) | `lib/actions/t3p-actions.ts:64`, `validation-actions.ts:43` | `candidatId` argument non revalidé avant `create` | Rattachement à un candidat d'un autre org possible (intra/cross à confirmer) | Revalider `candidatId` par `db.candidat.findFirst` | S | P2 |
| A05-019 | 🟡 | `User` sans `@@index([organismeId])` | `prisma/schema.prisma` | bloc `User` n'a que `@@index([role])` | Perf du filtrage des utilisateurs par tenant | Ajouter l'index | S | P3 |

> **BFLA intra-tenant signalés (hors périmètre 05 → audit 18)** : `client-pro-actions.ts:8-17` (ENTREPRISE non rejetée), `article-actions.ts:46+` (publication blog par non-staff, exposée sur la vitrine), `positionnement-actions.ts:11-16` (ENTREPRISE), `qualiopi/registre/photo-vitrine/t3p/compte-rendu/contrat-formateur/vitrine/crm` (mutations sans garde de rôle staff). **Pas de traversée de tenant** — droits *à l'intérieur* d'un OF → à traiter dans l'audit 18.

---

### 3. FICHES DÉTAILLÉES (toutes les 🔴 et 🟠)

#### A05-001 — Déclencheur manuel d'automatismes non cloisonné (effets cross-tenant) — 🔴
- **Constat :** `runAutomations()` ne prend aucun `organismeId` et interroge le client **brut** `prisma` ; son balayage principal `prisma.inscription.findMany({ where: { statut: { not: "ANNULEE" } } })` (aucun filtre org) parcourt les inscriptions de **tous** les tenants, puis envoie e-mails et pose des jalons par organisme. Il est appelé (a) par le cron `api/cron/parcours` — légitime — et (b) par la Server Action `runAutomationsNow()`, exposée à l'UI (`components/automatisations/run-automations-button.tsx`).
- **Preuve :** `lib/automation-engine.ts:92` `export async function runAutomations(): Promise<Counts>` ; `:166` `const inscriptions = await prisma.inscription.findMany({ where: { statut: { not: "ANNULEE" } }, include: { candidat: …, session: … } })` ; `lib/actions/automation-actions.ts:28-36` : garde `if (!session?.user || !["ADMIN","RESPONSABLE_FORMATION"].includes(role)) return …` puis `const counts = await runAutomations();` — **sans organisme**. À comparer au jumeau correct : `lib/actions/circuit-actions.ts:110-116` `runCircuitsNow` → `const { organismeId } = await requireStaffTenant(); await runCircuits(organismeId);`.
- **Scénario d'impact :** L'administrateur (ou responsable formation) de l'OF A clique « Lancer les automatismes ». Le moteur traite les inscriptions de B, C, D… : des e-mails (convocations, rappels, satisfaction, attestations) partent aux candidats/formateurs des **autres** OF, et des `emailLog`/jalons sont écrits sur leurs inscriptions. Aucune donnée n'est renvoyée à A (seuls des compteurs agrégés), mais A a déclenché des effets sur les données de tous les tenants.
- **Cause racine :** `runAutomations()` a été conçu pour le cron (cross-tenant) ; son réemploi tel quel par le déclencheur manuel a omis le cloisonnement que le moteur de circuits, lui, applique.
- **Recommandation :** Ajouter un paramètre `organismeId` à `runAutomations` et filtrer **tous** ses balayages (`inscription.findMany`, `automationSettings.findMany`…) par cet org ; dans `runAutomationsNow`, obtenir l'org via `requireStaffTenant()` et le passer. (Le cron continue de l'appeler sans argument pour le balayage global.)
- **Charge :** M — **Priorité :** P0 — **Type :** Quick win
- **Vérification de la correction :** Test : un ADMIN de A déclenche → aucun `emailLog`/jalon créé pour une inscription de B ; le cron continue de traiter tous les org.

#### A05-002 — `civique/lead` accepte l'organisme depuis le corps de la requête (écriture PII cross-tenant) — 🔴
- **Constat :** L'`organismeId` cible d'une création/MAJ de `Candidat` est résolu par `process.env.CIVIC_ORGANISME_ID ?? body.organismeId ?? null`. La coalescence `??` ne court-circuite que sur `null`/`undefined` : si l'env n'est pas définie, l'organisme provient du **corps public** de la requête. Écriture sur le client **brut**.
- **Preuve :** `app/api/civique/lead/route.ts:2` `import { prisma } from "@/lib/prisma"` ; `:48` `const organismeId = process.env.CIVIC_ORGANISME_ID ?? body.organismeId ?? null;` ; `:55-67` `prisma.candidat.findFirst({ where:{ organismeId, email } })` / `prisma.candidat.update(...)` / `prisma.candidat.create({ data:{ organismeId, nom, prenom, email, telephone, … } })`. Le fichier `.env` du dépôt **ne définit pas** `CIVIC_ORGANISME_ID` (seuls `DATABASE_URL`, `CRON_SECRET`, `LEAD_API_SECRET` sont présents).
- **Scénario d'impact :** Un POST public (CORS ouvert `civicCors`) avec un `organismeId` arbitraire (les ids d'org circulent en clair dans les `?organisme=` des vitrines) crée ou met à jour une fiche `Candidat` (PII) dans le CRM d'un concurrent, ou écrase le téléphone d'un candidat existant. Rate-limité à 10/min/IP.
- **Cause racine :** Repli volontaire sur le corps « pour le multi-vitrine », sans liste blanche ; l'API sort du périmètre du garde-fou d'import (elle est sous `app/api/**`).
- **Recommandation :** Épingler `CIVIC_ORGANISME_ID` côté serveur (comme `api/lead` qui n'utilise que `VITRINE_ORGANISME_ID`), ou valider `body.organismeId` contre une liste blanche d'organismes vitrine autorisés. **Confirmer d'abord la valeur réelle de `CIVIC_ORGANISME_ID` en prod Vercel** : si elle est épinglée, la faille est neutralisée (rétrograder en 🟡) ; sinon elle est **active**.
- **Charge :** S — **Priorité :** P0 — **Type :** Quick win
- **Vérification de la correction :** Un POST avec `organismeId` non autorisé → 4xx ; aucune écriture hors de l'organisme configuré.

#### A05-003 — `/inscription` expose les sessions de tous les OF (fuite lecture publique) — 🟠
- **Constat :** La page publique `/inscription` liste les sessions ouvertes via le client **brut** sans filtre d'organisme.
- **Preuve :** `app/inscription/page.tsx:22` `const sessions = await prisma.session.findMany({ where: { statut: { in: ["PLANIFIEE","OUVERTE"] } }, include: { formation: true } });` (import `prisma` de `@/lib/prisma`). Page publique (exclue du middleware), `dynamic = "force-dynamic"`, marque générique « OFManager » (pas de scoping par tenant).
- **Scénario d'impact :** Un visiteur — ou un OF concurrent — voit le planning (titre de formation, date, lieu) de **tous** les organismes sur une seule URL. Données business (non-PII), mais confidentialité commerciale entre clients rompue.
- **Cause racine :** Page (peut-être héritée) hors de la zone surveillée par le garde-fou (`app/(app)`), donc `findMany` non cloisonné passé inaperçu.
- **Recommandation :** Scoper par `?organisme=`/sous-domaine (réutiliser `organismeScope`), ou retirer/mettre hors ligne cette page générique au profit des flux d'inscription par token déjà en place.
- **Charge :** S — **Priorité :** P0 — **Type :** Quick win
- **Vérification de la correction :** La page ne renvoie que les sessions de l'organisme résolu ; sans organisme → liste vide ou 404.

#### A05-004 — `createInscription` ne revérifie pas l'appartenance des FK (lecture PII cross-tenant) — 🟠
- **Constat :** La Server Action `createInscription` (gardée `requireStaffTenant`, donc client `db` scopé) insère une inscription avec `candidatId`/`sessionId` issus du formulaire sans revérifier leur appartenance à l'organisme. Le scoping n'injecte l'`organismeId` que sur la ligne `Inscription` ; il ne re-scope ni les FK scalaires, ni les entités jointes en `include`.
- **Preuve :** `lib/actions/inscription-actions.ts:377-404` `db.inscription.create({ data: { candidatId: v.candidatId, sessionId: v.sessionId, … } })` ; validateurs `validators/inscription.ts:12-13` = `z.string().min(1)` (aucune vérification d'appartenance). Frère correct dans le même fichier : `inviterInscriptionDistance:67-72` valide `db.formation.findFirst({where:{id}})` + `db.session.findFirst({where:{id}})` avant de créer.
- **Scénario d'impact :** Le staff de A soumet `sessionId` (de A) + `candidatId` **de B**. La ligne `Inscription{org:A, candidatId:B}` est acceptée (la FK exige seulement l'existence du candidat, pas son org). Puis, sur la page session de A, l'inscription est lue via `include: { candidat }` scopé sur A : l'inscription passe le filtre et le candidat B est renvoyé **sans re-scoping** → A lit la PII de B (nom, prénom, e-mail, date/lieu de naissance). Précondition : connaître le cuid (non énumérable) du candidat B ; le statut doit rester `EN_ATTENTE` (la branche `VALIDEE` échoue, `apprenant.upsert`/`candidat.update` scopés lèvent « Accès refusé »).
- **Cause racine :** Le motif « vérifier-puis-muter » (FK d'entrée revérifiées) n'est pas appliqué uniformément.
- **Recommandation :** Revérifier `candidatId`/`sessionId` par `db.*.findFirst({where:{id}})` (renvoie null si autre org) avant le `create`, et généraliser le principe à toute FK d'entrée d'un create scopé.
- **Charge :** S — **Priorité :** P1 — **Type :** Quick win
- **Vérification de la correction :** `createInscription` avec un `candidatId` d'un autre org → erreur « introuvable » ; aucune inscription créée.

#### A05-005 — Absence de FK/cascade vers `Organisme` (purge tenant impossible en base) — 🟠
- **Constat :** Sur 86 modèles, **seuls 5** déclarent une FK réelle vers `Organisme` (`ContratPrestation`, `FactureEditeur`, `DossierFinancement`, `User`, `SupportTicket`). Les ~76 autres portent `organismeId` en **scalaire nu**, sans intégrité référentielle ni cascade.
- **Preuve :** `prisma/schema.prisma` — FK `Organisme … @relation` uniquement en lignes `184, 234, 275, 586, 2043` ; les autres, ex. `Candidat:649`, `Inscription:1050`, `Facture:1590`, `TitreDelivre:2563`, `CivicFacture:2367` : `organismeId String?` sans bloc `organisme Organisme @relation`.
- **Scénario d'impact :** Supprimer un `Organisme` ne supprime pas ses candidats/inscriptions/factures/titres (PII incluse) : résidus indéfinis en base (RGPD art. 17), et un `organismeId` peut pointer un organisme déjà supprimé.
- **Cause racine :** Migration progressive mono-→multi-tenant ; l'`organismeId` a été ajouté comme colonne de filtrage, pas comme relation.
- **Recommandation :** Ajouter les FK `organismeId → Organisme.id onDelete: Cascade` sur les modèles cloisonnés, **ou** implémenter et documenter une routine de purge applicative exhaustive (couplée à A05-014).
- **Charge :** L — **Priorité :** P1 — **Type :** Chantier
- **Vérification de la correction :** Suppression d'un tenant de test → 0 ligne résiduelle portant son `organismeId` (toutes tables + blobs).

#### A05-006 — Essai expiré : accès non bloqué (cron de suspension non planifié) — 🟠
- **Constat :** La route `api/cron/suspend-trials` existe mais **n'est pas planifiée** dans `vercel.json`, et aucun contrôle d'abonnement/échéance n'est fait au niveau des Server Actions.
- **Preuve :** `vercel.json` (clé `crons`) liste `parcours, documents-b2b, rgpd-purge, purge-demos, purge-pdf-cache, mrr-snapshot` — **pas** `suspend-trials`, alors que `app/api/cron/suspend-trials/route.ts` existe. `auth.config.ts:30` `authorized()` est JWT-only (ne relit pas `org.statut`) ; `lib/tenant.ts` `assertLiveSession` ne vérifie que `isActive` + `activeSessionId`.
- **Scénario d'impact :** Un OF dont la période d'essai est échue continue d'utiliser le produit en écriture sans limite — perte de revenu directe et absence de levier de recouvrement.
- **Cause racine :** Cron non déclaré ; suspension pensée au login seulement.
- **Recommandation :** Planifier `suspend-trials` dans `vercel.json` ; vérifier `org.statut === "SUSPENDU"` (et échéance d'essai) dans `assertLiveSession`/`requireStaffTenant` — pas seulement au login.
- **Charge :** S/M — **Priorité :** P1 — **Type :** Quick win
- **Vérification de la correction :** Un org passé `SUSPENDU` → toute Server Action de gestion refusée ; données préservées.

#### A05-007 — Garde-fou d'import à couverture incomplète (cause racine systémique) — 🟠
- **Constat :** Le test `prisma-direct-guard.test.ts` interdit d'importer le client brut hors liste blanche, mais **ne parcourt que** `app/(app)/**` (pages) et `lib/actions/**` (actions). `app/api/**`, les pages publiques hors `(app)` (`app/inscription`, `app/parcours`…), les singletons `lib/*.ts` et `app/console/**` ne sont **pas** surveillés.
- **Preuve :** `lib/__tests__/prisma-direct-guard.test.ts` : `const APP_DIR = path.resolve(__dirname, "../../app/(app)")` et `const ACTIONS_DIR = path.resolve(__dirname, "../actions")` — aucune autre racine. Les fuites A05-002 (`app/api/**`) et A05-003 (`app/inscription`) sont exactement dans ces angles morts.
- **Scénario d'impact :** Une nouvelle route API ou page publique peut introduire un accès brut non cloisonné **sans que le CI ne le détecte** → régression cross-tenant silencieuse.
- **Cause racine :** Le garde-fou a été calibré sur la zone historique (espace connecté), pas étendu aux surfaces ajoutées depuis (API, pages publiques, libs).
- **Recommandation :** Étendre le walk du test à `app/**` (pages + `route.ts`) et `lib/**`, avec liste blanche annotée. À terme, activer la **RLS PostgreSQL** (`RLS_ENABLED`, déjà câblée dans `lib/prisma.ts` via `withOrgVar`/`txWithOrg`) pour une barrière au niveau base indépendante de la vigilance.
- **Charge :** M (étendre le garde-fou) / XL (activer et valider la RLS) — **Priorité :** P1 — **Type :** Standard / Chantier
- **Vérification de la correction :** Introduire volontairement un `prisma.session.findMany` non filtré dans une route API → le CI échoue.

---

### 4. POINTS CONFORMES (🟢)

1. **Moteur de cloisonnement `scopedPrisma()`** (`lib/tenant.ts:35-114`) : injecte `organismeId` en création (placé en dernier → non écrasable par le payload client), en filtre sur lecture/maj/suppression de masse, et convertit `findUnique`/`update`/`delete` en vérification d'appartenance. **Sûr par construction** partout où il est utilisé.
2. **Garde-fou d'import CI** (`prisma-direct-guard.test.ts`) : casse le build si une page `(app)` ou une action importe le client brut hors liste blanche annotée — barrière réelle contre l'oubli (dans son périmètre, cf. A05-007 pour les limites).
3. **Espace connecté propre** : **201/201** pages/loaders RSC de `app/(app)/**`, `(portail-entreprise)/**`, `documents/emargement/suivi/console` analysés — **aucun** accès cross-tenant. Cohérent avec (1) et (2).
4. **Routes API** : **44/44** revues ; résolution du tenant depuis la **session** (jamais l'appelant) sur les routes de gestion. Exemplaires : `webhooks/wedof/[orgId]` (HMAC-SHA512 **par organisme** → `orgId` dans l'URL mais non forgeable), `public/piece/[id]` (triple autorisation staff-org / apprenant / token avant de servir une pièce d'identité), `api/lead` (org épinglé sur env + `LEAD_API_SECRET` fail-closed), `stripe/webhook` (signature + `metadata`).
5. **7 crons** (`api/cron/*`) tous protégés par `assertCronAuthorized` (`Bearer CRON_SECRET`, fail-closed) ; itérations cross-tenant = maintenance plateforme légitime.
6. **Middleware** : vérifié par le chef de projet — aucune page authentifiée exposée par les exclusions du matcher (`portail/` conserve le `/` → pas de collision avec `portail-client` ; `satisfaction*` volontairement publics).
7. **Impersonation** réservée au SUPERADMIN (`impersonation-actions.ts` → `requireSuperAdmin()`), refus d'imbrication, tracée en `AuditLog` ; aucun ADMIN d'OF ne peut sortir de son organisme.
8. **Numérotation sensible correctement par-tenant** : `@@unique([organismeId, reference/numero/slug])` sur `Formation, Session, Convention, Contrat, Devis, Facture, QualiopiIndicateur, CivicFacture, NumeroSequence`. Les seules séquences globales (`FactureEditeur.numero`, `ContratPrestation.reference`) relèvent de l'éditeur (émetteur unique).
9. **Moteur de circuits** (`runCircuitsNow` → `requireStaffTenant()` → `runCircuits(organismeId)`) : cloisonnement du déclencheur manuel **correct** — c'est le patron de référence pour corriger A05-001.
10. **Tables globales légitimes** clairement délimitées : `Organisme`, `PlanTarif`, `SupportMessage` (child de ticket, cascade), et les données **éditeur** `Lead/LeadEvent/LeadTask/MrrSnapshot/DeviceToken` (accédées exclusivement via le client brut en contexte console/cron, jamais via `scopedPrisma`).

---

### 5. CONTRÔLES NON RÉALISÉS

| Contrôle | Raison | Ce qu'il faudrait pour le faire |
|---|---|---|
| Tests d'isolation croisée **à l'exécution** (2 tenants, accès croisés sur chaque endpoint) | La base pointée par `.env` est la base Neon **partagée/prod** ; la règle 5 interdit tout test actif sur des données réelles | Un environnement dédié (base Neon isolée + seed de 2 tenants factices) puis rejeu automatisé des endpoints |
| Comportement **RLS activée** (`RLS_ENABLED=true`) | Flag absent en prod ; l'audit porte sur la couche applicative (rempart actif tant que RLS off) | Base avec rôle `app_rls` + policies appliquées (cf. `docs/rls-setup.sql`) sur un env staging |
| Valeurs réelles des env de prod (`CIVIC_ORGANISME_ID`, `VITRINE_ORGANISME_ID`) | Non présentes dans le dépôt (secrets Vercel) — conditionne la gravité réelle d'A05-002/A05-008 | Lecture du panneau d'env Vercel de l'instance de prod |
| Scripts offline de provisioning (`seed-tenant.cjs`, `transform-tenant.cjs`, `provision-aspr-full.mts`) | Hors du chemin applicatif ; non lus intégralement par le lot cycle de vie | Revue dédiée de ces scripts (idempotence, collisions) |
| Connexions de relations M2M (`formateur.formations.connect/set`) re-scopées | `scopedPrisma` ne re-scope pas les `connect`/`set` ; impact = surfaçage, non prouvé comme fuite de lecture | Test ciblé : connecter un `formationId` d'un autre org et observer |

---

### 6. QUICK WINS

À traiter en premier (fort risque, charge S/M) :
- **A05-001** (🔴, M) — cloisonner `runAutomationsNow` (patron déjà présent : `runCircuitsNow`).
- **A05-002** (🔴, S) — épingler `CIVIC_ORGANISME_ID` / liste blanche.
- **A05-003** (🟠, S) — scoper ou retirer `/inscription`.
- **A05-004** (🟠, S) — revérifier les FK dans `createInscription`.
- **A05-006** (🟠, S/M) — planifier `suspend-trials` + contrôle `org.statut`.

---

### 7. PLAN DE REMÉDIATION

- **Vague 1 — avant Go-Live (P0) :** A05-001, A05-002, A05-003, A05-007 (extension du garde-fou pour figer l'acquis). Charge cumulée ≈ 3–5 j. **Condition de GO.**
- **Vague 2 — J+30 (P1) :** A05-004, A05-005 (chantier FK/purge, à démarrer), A05-006, A05-013. Traiter aussi les BFLA signalés dans l'audit 18.
- **Vague 3 — J+90 (P2/P3) :** A05-008 à A05-019 (schéma NOT NULL, unicité e-mail, quotas appliqués, offboarding/purge blobs, index perf, activation RLS comme barrière structurelle définitive).

---

### 8. ANNEXES

- **Méthode :** 7 sous-agents spécialistes (revue exhaustive par module) + 5 vérificateurs adversariaux sur les constats cross-tenant ; contre-vérification personnelle du chef de projet sur toutes les 🔴/🟠 (lecture directe `fichier:ligne`).
- **Commandes clés :** `grep -rl 'from "@/lib/prisma"' src` (167 fichiers) ; `awk '/^model /{n=$2}/organismeId/{print n}' prisma/schema.prisma` ; `grep 'Organisme.*@relation' prisma/schema.prisma` (5 FK) ; inspection `vercel.json`, `.env` (noms d'env seulement).
- **Fichiers socle lus :** `lib/tenant.ts`, `lib/prisma.ts`, `lib/rls-context.ts`, `lib/public-scope.ts`, `lib/superadmin-guard.ts`, `lib/tenant-host.ts`, `auth.ts`, `auth.config.ts`, `middleware.ts`, `lib/__tests__/prisma-direct-guard.test.ts`, `docs/SECURITE-multi-tenant.md`.
- **Couverture :** schéma 86/86 ; Server Actions 89/89 ; routes API 44/44 ; pages RSC `(app)` 201/201 ; pages/routes publiques ~48 ; libs transverses 33/33 ; cycle de vie 35/40. **Taux de couverture statique ≈ 100 %** des chemins d'accès aux données ; tests runtime non exécutés (cf. §5).
- **Outils/versions :** Next.js 16, next-auth v5-beta, Prisma 6.19, PostgreSQL (Neon). Audit en lecture seule — aucun fichier produit modifié.
- **Note d'intégrité :** la branche a avancé (`399de42` → `a23ae3a`) pendant l'audit ; tous les constats ont été re-vérifiés sur `a23ae3a`.

---

### 9. BLOC DE CONSOLIDATION (ne pas modifier le format)

```json
{
  "audit_id": 5,
  "audit_nom": "Audit multi-tenant",
  "date": "2026-08-26",
  "commit": "a23ae3a5e93952684864e1d3f7638c4220593c57",
  "verdict": "GO_CONDITIONNEL",
  "compteurs": {"rouge": 2, "orange": 5, "jaune": 12, "vert": 10, "non_verifie": 5},
  "anomalies": [
    {"id": "A05-001", "gravite": "rouge", "titre": "Déclencheur d'automatismes non cloisonné (effets cross-tenant)", "composant": "lib/automation-engine.ts + lib/actions/automation-actions.ts", "preuve": "automation-engine.ts:92,166 ; automation-actions.ts:28-36 (runAutomations sans organismeId)", "impact": "Un ADMIN d'un OF déclenche envois d'e-mails + écritures sur les inscriptions de tous les tenants", "recommandation": "Scoper comme runCircuitsNow : runAutomations(organismeId)", "charge": "M", "priorite": "P0", "type": "quick_win", "depend_de": []},
    {"id": "A05-002", "gravite": "rouge", "titre": "civique/lead accepte organismeId du client (écriture PII cross-tenant)", "composant": "app/api/civique/lead/route.ts", "preuve": "route.ts:48 CIVIC_ORGANISME_ID ?? body.organismeId ; .env sans CIVIC_ORGANISME_ID", "impact": "Création/MAJ de Candidat (PII) dans un organisme arbitraire si env non épinglée en prod", "recommandation": "Épingler l'env serveur + liste blanche d'organismes vitrine", "charge": "S", "priorite": "P0", "type": "quick_win", "depend_de": ["A05-007"]},
    {"id": "A05-003", "gravite": "orange", "titre": "/inscription liste les sessions de tous les OF (fuite lecture publique)", "composant": "app/inscription/page.tsx", "preuve": "page.tsx:22 prisma.session.findMany sans where organismeId", "impact": "Sessions (titre/date/lieu) de tous les OF exposées publiquement", "recommandation": "Scoper par organisme (organismeScope) ou retirer la page", "charge": "S", "priorite": "P0", "type": "quick_win", "depend_de": ["A05-007"]},
    {"id": "A05-004", "gravite": "orange", "titre": "createInscription : FK non revérifiées (lecture PII cross-tenant)", "composant": "lib/actions/inscription-actions.ts", "preuve": "inscription-actions.ts:377-404 db.inscription.create avec candidatId/sessionId non validés", "impact": "Lecture PII d'un candidat d'un autre org via include (précond. connaître le cuid, statut EN_ATTENTE)", "recommandation": "Revérifier candidatId/sessionId par db.findFirst avant create", "charge": "S", "priorite": "P1", "type": "quick_win", "depend_de": []},
    {"id": "A05-005", "gravite": "orange", "titre": "Aucune FK/cascade vers Organisme (purge tenant impossible en base)", "composant": "prisma/schema.prisma", "preuve": "5 FK Organisme (184,234,275,586,2043) sur 86 modèles ; les autres organismeId scalaire nu", "impact": "Suppression d'un tenant laisse tous ses enregistrements (PII) en base (RGPD art. 17)", "recommandation": "FK onDelete:Cascade ou routine de purge applicative exhaustive prouvée", "charge": "L", "priorite": "P1", "type": "chantier", "depend_de": []},
    {"id": "A05-006", "gravite": "orange", "titre": "Essai expiré : accès non bloqué (cron suspend-trials non planifié)", "composant": "vercel.json + app/api/cron/suspend-trials", "preuve": "vercel.json crons sans suspend-trials ; assertLiveSession ne lit pas org.statut", "impact": "Un tenant en essai échu conserve l'accès en écriture (perte de revenu)", "recommandation": "Planifier le cron + vérifier org.statut/échéance dans requireStaffTenant/assertLiveSession", "charge": "M", "priorite": "P1", "type": "quick_win", "depend_de": []},
    {"id": "A05-007", "gravite": "orange", "titre": "Garde-fou d'import à couverture incomplète (cause racine des fuites)", "composant": "lib/__tests__/prisma-direct-guard.test.ts", "preuve": "APP_DIR=app/(app) et ACTIONS_DIR=lib/actions seuls ; app/api, pages hors (app), lib/* non surveillés", "impact": "Régressions cross-tenant silencieuses (A05-002/003 sont dans les angles morts)", "recommandation": "Étendre le walk à app/** + lib/** ; à terme activer la RLS", "charge": "M", "priorite": "P1", "type": "standard", "depend_de": []},
    {"id": "A05-008", "gravite": "jaune", "titre": "civique/checkout : même body.organismeId (frère de A05-002, sous paiement)", "composant": "app/api/civique/checkout/route.ts", "preuve": "route.ts:71 CIVIC_ORGANISME_ID ?? body.organismeId", "impact": "Provisionnement candidat/paiement attribué à un org arbitraire (gated paiement réel)", "recommandation": "Idem A05-002", "charge": "S", "priorite": "P2", "type": "quick_win", "depend_de": ["A05-002"]},
    {"id": "A05-009", "gravite": "jaune", "titre": "organismeId nullable quasi-généralisé", "composant": "prisma/schema.prisma", "preuve": "~80 modèles organismeId String?", "impact": "Ligne à organismeId NULL échappe au filtre where organismeId", "recommandation": "NOT NULL sur les modèles purement tenant après backfill", "charge": "L", "priorite": "P2", "type": "chantier", "depend_de": []},
    {"id": "A05-010", "gravite": "jaune", "titre": "User.email unique global (cross-tenant)", "composant": "prisma/schema.prisma:573", "preuve": "email String @unique", "impact": "E-mail limité à un OF ; énumération d'existence cross-tenant", "recommandation": "Assumer identité globale (SSO) ou @@unique([organismeId,email]) pour end-users", "charge": "L", "priorite": "P3", "type": "standard", "depend_de": []},
    {"id": "A05-011", "gravite": "jaune", "titre": "Références inter-entités en String nu (ni FK ni garde same-org)", "composant": "prisma/schema.prisma", "preuve": "Diplome:2521, TitreDelivre:2576, Tache:1563, SmsLog:1579", "impact": "Aucune garantie base d'appartenance au même org", "recommandation": "Ajouter FK ou valider l'appartenance avant écriture", "charge": "M", "priorite": "P2", "type": "standard", "depend_de": []},
    {"id": "A05-012", "gravite": "jaune", "titre": "Blob d'upload non préfixé par organisme", "composant": "app/api/upload/route.ts", "preuve": "route.ts:36-37 folder client non préfixé", "impact": "Pas de cloisonnement logique (mitigé URL non devinable)", "recommandation": "Préfixer le dossier par session.user.organismeId", "charge": "S", "priorite": "P2", "type": "quick_win", "depend_de": []},
    {"id": "A05-013", "gravite": "jaune", "titre": "Suspension appliquée seulement au login/layout", "composant": "auth.config.ts + lib/tenant.ts", "preuve": "authorized() JWT-only ; assertLiveSession ne lit pas org.statut", "impact": "Server Actions/flux publics ouverts pour un org suspendu", "recommandation": "Vérifier org.statut dans assertLiveSession", "charge": "M", "priorite": "P1", "type": "standard", "depend_de": []},
    {"id": "A05-014", "gravite": "jaune", "titre": "Aucun chemin de suppression complète d'un tenant réel (offboarding RGPD)", "composant": "lib/demo/purge.ts + lib/rgpd-retention.ts", "preuve": "purge.ts:55 réservé isDemo ; seul organisme.delete = démo", "impact": "Impossible d'effacer un client sortant (réversibilité/RGPD)", "recommandation": "Purge tenant vérifiable (couplé A05-005)", "charge": "L", "priorite": "P2", "type": "chantier", "depend_de": ["A05-005"]},
    {"id": "A05-015", "gravite": "jaune", "titre": "Purge (démo) laisse des blobs orphelins", "composant": "lib/demo/purge.ts", "preuve": "supprime des lignes DB, jamais del() @vercel/blob", "impact": "Résidu RGPD hors base", "recommandation": "Ajouter bestEffortDeleteBlobs (déjà dans rgpd/anonymise.ts:99)", "charge": "S", "priorite": "P2", "type": "quick_win", "depend_de": []},
    {"id": "A05-016", "gravite": "jaune", "titre": "Quotas (e-mails/inscriptions) déclaratifs — dépassement silencieux", "composant": "lib/usage.ts + lib/seats.ts", "preuve": "getOrgUsage appelé pour affichage/facturation seulement", "impact": "Un tenant dépasse ses limites sans blocage", "recommandation": "Appliquer les quotas dans les chemins d'écriture", "charge": "M", "priorite": "P2", "type": "standard", "depend_de": []},
    {"id": "A05-017", "gravite": "jaune", "titre": "Garde SUPERADMIN ré-implémentée en ligne sans contrôle de révocation", "composant": "lib/actions/formations-config-actions.ts:27-35", "preuve": "contrôle manuel au lieu de requireSuperAdmin()", "impact": "Token SUPERADMIN révoqué (SEC-014) reste accepté sur cette action", "recommandation": "Appeler requireSuperAdmin()", "charge": "S", "priorite": "P2", "type": "quick_win", "depend_de": []},
    {"id": "A05-018", "gravite": "jaune", "titre": "FK smuggling intra-tenant (t3p, validation)", "composant": "lib/actions/t3p-actions.ts:64 + validation-actions.ts:43", "preuve": "candidatId argument non revalidé avant create", "impact": "Rattachement à un candidat d'un autre org possible (intra/cross à confirmer)", "recommandation": "Revalider candidatId par db.candidat.findFirst", "charge": "S", "priorite": "P2", "type": "quick_win", "depend_de": []},
    {"id": "A05-019", "gravite": "jaune", "titre": "User sans @@index([organismeId])", "composant": "prisma/schema.prisma", "preuve": "bloc User n'a que @@index([role])", "impact": "Perf du filtrage utilisateurs par tenant", "recommandation": "Ajouter l'index", "charge": "S", "priorite": "P3", "type": "quick_win", "depend_de": []}
  ],
  "conditions_go": [
    "A05-001 corrigé : runAutomationsNow cloisonné à l'organisme de session (prouvé par test cron vs manuel)",
    "A05-002 traité : CIVIC_ORGANISME_ID épinglé en prod Vercel + liste blanche d'organismes (sinon faille active)",
    "A05-003 corrigé : /inscription scopé par organisme ou retiré",
    "A05-007 : garde-fou d'import étendu à app/** et lib/** pour prévenir les régressions"
  ],
  "risques_residuels": [
    "Isolation portée par la seule couche applicative tant que RLS_ENABLED n'est pas activé (pas de barrière base)",
    "Tests d'isolation à l'exécution non réalisés (base prod partagée) : la preuve reste statique",
    "Gravité d'A05-002/A05-008 dépendante d'une valeur d'env de prod non vérifiable depuis le dépôt",
    "Suppression/offboarding d'un tenant non implémenté (résidus RGPD au départ d'un client)"
  ]
}
```
