# Migrations de base de données — reproductibilité (OPS-05 / DB-04)

## Constat (audit)
Le schéma a évolué via `prisma db push` (Stripe, RGPD, `activeSessionId`,
`PlanTarif`, sièges, unicité multi-tenant…) **sans nouvelles migrations** depuis
`20260605..elearning_v2`. Conséquence : `prisma/migrations/` ne permet plus de
**reconstruire la base à l'identique** (pas d'historique reproductible, pas de
rollback de schéma).

## Baseline fournie
[`docs/db-baseline.sql`](./db-baseline.sql) contient le **DDL complet du schéma
courant** (généré par `prisma migrate diff --from-empty --to-schema-datamodel`,
lecture seule, sans connexion à la base). Il sert de référence pour reconstruire
une base vierge à l'état actuel.

## Procédure de re-baseline (à exécuter une fois, hors heures de prod)
> ⚠️ À faire avec prudence sur la base Neon partagée (contient des données réelles).
> Idéalement sur une **branche Neon de test** d'abord.

1. Archiver l'historique partiel actuel :
   `prisma/migrations/` → `prisma/migrations_archive_2026-06/`.
2. Créer une migration baseline représentant l'état courant :
   ```bash
   mkdir -p prisma/migrations/00000000000000_baseline
   cp docs/db-baseline.sql prisma/migrations/00000000000000_baseline/migration.sql
   ```
3. Marquer cette baseline comme **déjà appliquée** sur la base existante (la base
   contient déjà ce schéma — ne RIEN ré-exécuter dessus) :
   ```bash
   npx prisma migrate resolve --applied 00000000000000_baseline
   ```
4. Désormais, **tout changement de schéma passe par une migration versionnée** :
   ```bash
   npx prisma migrate dev --name <description>   # en dev/branche de test
   npx prisma migrate deploy                      # en prod
   ```
   → abandonner `prisma db push` en production (réservé au prototypage local).

## Pourquoi pas tout de suite
Cette opération réécrit l'état des migrations et doit être validée sur une base
de test avant la prod (cf. règle projet : pas de `migrate dev` sur la base Neon
partagée sans précaution — risque de drift/reset). Elle est donc **documentée et
outillée** ici, à déclencher dans une fenêtre dédiée.
