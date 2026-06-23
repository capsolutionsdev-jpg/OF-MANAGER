# 04 — DBA / Data engineer

> Fiche d'audit (Livrable 2). Constats sourcés. **Aucune correction appliquée.**

## DBA / Data engineer

### 1. Périmètre analysé
- Schéma complet : [prisma/schema.prisma](../prisma/schema.prisma) (~40 modèles, ~40 enums).
- Cloisonnement : [src/lib/tenant.ts](../src/lib/tenant.ts).
- Migrations : `prisma/migrations/` (dernière : `20260605..elearning_v2`).
- Purge/anonymisation : [src/lib/rgpd-retention.ts](../src/lib/rgpd-retention.ts).

### 2. Constats — modèle, intégrité, isolation

| ID | Description | Fichier:ligne | Sévérité | Impact |
|----|-------------|---------------|----------|--------|
| DB-01 | **Unicité GLOBALE de références générées PAR TENANT → collisions inter-OF.** `Facture.reference`, `Session.reference`, `Convention.reference`, `Contrat.reference`, `Formation.reference`, `Cours.slug` sont `@unique` (global), mais générés par organisme. Deux OF ne peuvent pas avoir `FAC-2026-0001`, et la génération par `count()` (BCK-01) entre tenants entrera en collision. Incohérent avec `Devis` qui utilise bien `@@unique([organismeId, reference])`. | [schema.prisma:555,611,1003,1023,1209,1462](../prisma/schema.prisma) | **Critique** | Échec d'écriture/blocage cross-tenant ; fuite d'information (existence d'une référence chez un autre OF). |
| DB-02 | **`QualiopiIndicateur.numero` en `@@unique([numero])` global** : un seul jeu d'indicateurs 1→32 pour TOUTE la base. Le 2ᵉ organisme ne peut pas créer ses propres indicateurs Qualiopi. | [schema.prisma:1052](../prisma/schema.prisma) | **Critique** | Module Qualiopi inutilisable au-delà du 1ᵉʳ OF (renvoi `09`). |
| DB-03 | **`organismeId` nullable sur tous les modèles tenant**, sans FK contraignante ni RLS. L'intégrité d'isolation n'existe **qu'en applicatif** (`scopedPrisma`). | [schema.prisma:421,…](../prisma/schema.prisma) | Majeure | Toute requête hors `scopedPrisma` lit/écrit sans frontière (renvoi ARC-01, `07`). |
| DB-04 | **Dérive migrations / schéma.** Le schéma a évolué via `prisma db push` (Stripe, RGPD, `activeSessionId`, `PlanTarif`, sièges…) sans nouvelles migrations depuis le 2026-06-05. La base ne peut pas être reconstruite depuis `prisma/migrations/`. | `prisma/migrations/` (dernière `elearning_v2`) | Majeure | Pas d'historique reproductible ; risque en restauration/clonage d'environnement (renvoi `06`). |
| DB-05 | **Stratégie `onDelete` hétérogène.** Certaines relations cascade (`Seance→Presence`, `Conversation→Message`), d'autres non (`Candidat→Inscription`, `Inscription→Facture` en `Restrict` implicite). Cycle de vie de suppression peu lisible ; suppression d'un candidat avec inscriptions bloquée sans message clair. | [schema.prisma](../prisma/schema.prisma) (relations) | Mineure | Comportements de suppression incohérents ; erreurs opaques. |
| DB-06 | **Tokens à unicité incohérente.** Certains tokens publics sont `@unique` (`accessToken`, `acceptToken`), d'autres volontairement non-uniques (`portalToken`, `suivi6moisToken`) « pour éviter une migration destructive », avec lecture par `findFirst`. Choix documenté mais hétérogène et fragile. | [schema.prisma:802,1107](../prisma/schema.prisma) | Mineure | Risque théorique de collision ; dette liée au mode `db push`. |

### 3. Corrections proposées
- **DB-01** : passer toutes ces références en `@@unique([organismeId, reference])` (et `@@unique([organismeId, slug])` pour `Cours`). Migration + recalcul des compteurs par OF.
- **DB-02** : `@@unique([organismeId, numero])` pour `QualiopiIndicateur` ; idem partout où un « numéro métier » est censé être par OF.
- **DB-03** : `organismeId` **NOT NULL** (backfill) + **RLS PostgreSQL** en complément (cf. ARC-01).
- **DB-04** : reprendre un historique de migrations propre (baseline `prisma migrate diff` depuis l'état réel) et **abandonner `db push`** en prod au profit de migrations versionnées.
- **DB-05** : définir explicitement `onDelete` pour chaque relation selon la règle métier (souvent `Restrict` pour les données comptables/Qualiopi, `Cascade` pour les enfants techniques).

### 4. AVIS DU SPÉCIALISTE
**Modèle riche et bien pensé fonctionnellement, mais deux défauts d'unicité cassent le multi-tenant et doivent être traités d'urgence.** Le schéma couvre finement le métier (Decimal pour les montants, index `organismeId` quasi partout, versionnage des formations, traçabilité `AuditLog`, anonymisation RGPD propre). En revanche **DB-01 et DB-02 sont des bugs multi-tenant critiques** : des contraintes d'unicité globales sur des valeurs générées par organisme. Tant qu'un seul OF est réellement actif, ils restent latents — d'où le fait qu'ils n'aient pas explosé — mais ils **bloquent l'arrivée du 2ᵉ client**. Couplés à l'isolation purement applicative (DB-03) et à la dérive des migrations (DB-04), ils justifient une **reprise des fondations data** avant la commercialisation multi-clients. Ce ne sont pas des réécritures lourdes, mais des migrations à faire avec soin.

### 5. AMÉLIORATIONS À AJOUTER
1. **RLS PostgreSQL** (sécurité par conception) + `organismeId` NOT NULL.
2. **Vues/agrégats de reporting** (BPF, CA, taux de réussite) matérialisés ou requêtes dédiées indexées.
3. **Contrainte d'unicité comptable** par OF/année sur les numéros de facture (séquence dédiée).
4. **Politique de rétention** déclinée par type de donnée (au-delà du global `dureeConservationMois`).
