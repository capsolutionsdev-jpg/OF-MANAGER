# 01 — Architecte logiciel / Tech Lead

> Fiche d'audit (Livrable 2). Constats sourcés. **Aucune correction appliquée.**
> Cross-références : les risques sécurité/données ne sont qu'esquissés ici et
> approfondis dans `04_donnees.md` et `07_securite_rgpd.md`.

## Architecte logiciel / Tech Lead

### 1. Périmètre analysé (fichiers/zones examinés)
- Découpage runtime / edge : [src/middleware.ts](../src/middleware.ts), [src/auth.config.ts](../src/auth.config.ts), [src/auth.ts](../src/auth.ts).
- Cœur multi-tenant : [src/lib/tenant.ts](../src/lib/tenant.ts), [src/lib/prisma.ts](../src/lib/prisma.ts).
- Autorisations & gardes : [src/lib/permissions.ts](../src/lib/permissions.ts), [src/lib/section-guard.ts](../src/lib/section-guard.ts), `src/lib/superadmin-guard.ts`.
- Organisation applicative : arbre `src/app/(app)/`, `src/app/console/`, ~40 fichiers `src/lib/actions/*`, validators `src/lib/validators/*`.
- Modèle de données (vue couplage) : [prisma/schema.prisma](../prisma/schema.prisma).
- Stack & versions : [package.json](../package.json).

### 2. Constats — dette, couplage & risques d'architecture

| ID | Description | Fichier:ligne | Sévérité | Impact |
|----|-------------|---------------|----------|--------|
| ARC-01 | **Isolation multi-tenant 100 % applicative, sans filet base.** `organismeId` est **nullable** sur tous les modèles métier et il n'y a **aucun RLS PostgreSQL** ni FK contraignante : la séparation entre OF repose entièrement sur le passage systématique par `scopedPrisma`. Tout accès via le client `prisma` brut sur un modèle tenant = fuite/écriture croisée silencieuse. | [tenant.ts:43](../src/lib/tenant.ts), [schema.prisma:421](../prisma/schema.prisma) | **Critique** | Un seul oubli de `getTenantDb()` dans une action expose les données d'autres organismes. À vérifier exhaustivement (renvoi `04`/`07`). |
| ARC-02 | **Duplication de la matrice rôles↔sections**, maintenue à la main dans deux fichiers, avec commentaires « garder les deux strictement alignés ». Source de dérive (un ajout de section dans l'un et pas l'autre = trou d'autorisation). | [auth.config.ts:7-34](../src/auth.config.ts) vs [permissions.ts:40-67](../src/lib/permissions.ts) | Majeure | Risque de régression d'autorisation invisible ; couplage par copier-coller. |
| ARC-03 | **`Inscription` est un « god model »** (~80 champs) : il agrège l'inscription, le paiement, la certification, et **tout le parcours automatisé** (tokens + dates pour positionnement, convocation, satisfaction, satisfaction entreprise, suivi 6 mois, contrats…). Forte charge cognitive, requêtes lourdes, migrations risquées. | [schema.prisma:742-828](../prisma/schema.prisma) | Majeure | Maintenabilité et perf (sur-lecture de colonnes) ; difficile à faire évoluer sans régression. |
| ARC-04 | **Authz dépendante du JWT figé.** `role`, `permissions`, `fonctionnalites` sont capturés à la connexion et portés par le token JWT. Un changement côté éditeur (désactiver une feature, retirer une permission, suspendre l'organisme) **ne prend effet qu'à la prochaine connexion**. | [auth.config.ts:110-131](../src/auth.config.ts), [auth.ts:62-71](../src/auth.ts) | Majeure | Accès maintenu à une section/feature retirée jusqu'à expiration/refresh du token ; cohérence d'abonnement contournable temporairement. |
| ARC-05 | **Protection des routes par liste de refus (denylist regex) dans le `matcher`.** Toute nouvelle route publique doit être ajoutée à une longue expression ; à l'inverse, une route sensible oubliée hors denylist est protégée par défaut (bien) mais une erreur de regex peut exposer une route. Modèle fragile et difficile à raisonner. | [middleware.ts:10-12](../src/middleware.ts) | Mineure | Risque d'exposition/blocage accidentel lors d'ajouts de routes ; revue difficile. |
| ARC-06 | **TOCTOU + double aller-retour** sur `update`/`delete`/`upsert` cloisonnés : un `findFirst` de contrôle précède la requête réelle (exécutée sur le `where` d'origine). Fenêtre théorique entre contrôle et exécution, et coût x2 en requêtes. | [tenant.ts:61-99](../src/lib/tenant.ts) | Mineure | Surcoût DB sur les écritures ; risque TOCTOU négligeable mais réel. |
| ARC-07 | **Dépendances de pointe / pré-version en production.** `next-auth@5.0.0-beta.31` (bêta) porte toute l'authentification ; Next **16.2.6** et React **19.2.4** sont très récents. | [package.json:35-36,42](../package.json) | Majeure | Risque de rupture sur montée de version d'une brique critique (auth) encore en bêta. |
| ARC-08 | **Couplage fort inter-modules via le graphe relationnel.** CRM↔pédago↔compta partagent `Candidat`/`Inscription`/`Session`/`Facture` sans frontière de service ni couche de cas d'usage : la logique métier vit directement dans les Server Actions au contact de Prisma. | `src/lib/actions/*` | Mineure | Difficulté à tester/réutiliser la logique hors HTTP ; évolutions transverses risquées. |
| ARC-09 | **Modèles « globaux » exemptés du cloisonnement** (`Organisme`, `SupportMessage`, `PlanTarif`) : `SupportMessage` n'a pas d'`organismeId` et n'est sécurisé que par la jointure au ticket parent. Toute requête directe sur `SupportMessage` via `scopedPrisma` n'est **pas** filtrée. | [tenant.ts:23](../src/lib/tenant.ts), [schema.prisma:1674](../prisma/schema.prisma) | Mineure | Exige une discipline d'accès (toujours via le ticket) non garantie par le type. |

### 3. Corrections proposées (esquisses, non appliquées)
- **ARC-01** : ajouter un **filet base** — au minimum rendre `organismeId` **NOT NULL** sur les modèles tenant (migration backfill) ; idéalement activer le **RLS PostgreSQL** (politique `organismeId = current_setting('app.org')`) en complément de `scopedPrisma`. À cadrer avec `04_donnees.md`.
- **ARC-02** : faire de `permissions.ts` la **source unique** et générer/dériver la table edge, ou extraire la matrice dans un module **sans dépendance Node** importable par les deux (supprime le copier-coller).
- **ARC-03** : extraire le **parcours automatisé** dans une table dédiée `ParcoursInscription` (1-1 avec `Inscription`) regroupant tokens/dates/JSON ; allège les lectures et isole l'évolution.
- **ARC-04** : revalider en base les attributs sensibles (rôle/permissions/fonctionnalités/statut) au moins sur les actions critiques (ex. via `getTenantDb`/garde serveur lisant l'organisme), ou raccourcir la durée du token + recharger depuis la base dans le callback `jwt` périodiquement.
- **ARC-05** : passer à une **allowlist** explicite de préfixes publics (tableau typé) plutôt qu'une regex de refus.
- **ARC-06** : utiliser `updateMany`/`deleteMany` avec `where: { id, organismeId }` (une seule requête atomique) au lieu du contrôle préalable, quand l'unicité d'`id` le permet.

### 4. AVIS DU SPÉCIALISTE (synthèse honnête)
**État de santé : bon socle, fondations à consolider sur un point.** L'architecture est **mature et cohérente** pour un SaaS de cette ampleur : séparation propre edge/runtime de l'auth (config sans Prisma pour le middleware, providers Node dans `auth.ts`), **défense en profondeur** réelle sur les autorisations (middleware HTTP → `requireSection` au rendu → `scopedPrisma` aux données), centralisation du cloisonnement dans un seul extension Prisma, validators Zod séparés, singleton Prisma correct.

Le **risque structurant n°1** est **ARC-01** : l'isolation entre organismes ne tient qu'à la rigueur du code (aucune barrière en base, `organismeId` nullable). C'est tenable, mais une seule ligne fautive ailleurs dans 40 fichiers d'actions suffit à percer le cloisonnement — c'est précisément ce que `04`/`07` devront vérifier exhaustivement. Les autres points (duplication des rôles ARC-02, god-model `Inscription` ARC-03, authz figée dans le JWT ARC-04, auth en bêta ARC-07) sont de la **dette maîtrisable** mais à traiter avant montée en charge multi-clients.

Le « bien avancé » est **sain dans sa structure** ; il n'y a pas de fondation à jeter, mais 2-3 renforcements (filet base + dé-duplication + extraction du parcours) à programmer.

### 5. AMÉLIORATIONS À AJOUTER (au-delà des corrections)
1. **Couche « cas d'usage »** fine entre actions et Prisma (services par domaine) pour tester la logique métier hors HTTP et découpler les 3 modules.
2. **RLS PostgreSQL** en complément applicatif (sécurité par conception, pas seulement par convention).
3. **ADR (Architecture Decision Records)** courts pour figer les choix structurants (multi-tenant, JWT, db push) — utile à l'audit Qualiopi/sécurité et à l'onboarding.
4. **Tests d'architecture** (garde-fous) : un test qui échoue si un modèle tenant est requêté via `prisma` brut hors allowlist ; un test qui vérifie l'alignement des deux matrices de rôles (tant qu'ARC-02 n'est pas résolu).
5. **Observabilité** : corrélation requête→tenant dans les logs (un `organismeId` par trace) pour diagnostiquer sans fuiter.
