# Déploiement OFManager (Vercel + Neon)

Application **unique** servant tous les organismes (multi-tenant, données cloisonnées
par `organismeId` dans une base Neon partagée). Production : **`ofmanager.info`**
(domaine unique ; le tenant est résolu par la **session**, pas par sous-domaine).
Éditeur : CAP SOLUTIONS.

> Repo : `github.com/capsolutionsdev-jpg/OF-MANAGER` · Hébergeur : **Vercel** (région
> `fra1`) · Base : **Neon** PostgreSQL (région `eu-central-1`, Francfort).

## 1. Pré-requis
- Repo GitHub `capsolutionsdev-jpg/OF-MANAGER`, branche **`main`** à jour.
- Base **Neon** de production (région Francfort).
- Compte **Vercel** (voir §5 sur le plan).
- Domaine **`ofmanager.info`** (DNS chez OVH).

## 2. Projet Vercel
1. Vercel → **Add New… → Project** → importer `capsolutionsdev-jpg/OF-MANAGER`.
2. Framework : **Next.js** (auto). Build : `next build`. Install : `npm install`
   (le `postinstall` lance `prisma generate`). **Région : `fra1`** (colocalisée Neon).
3. Production Branch : **`main`**.

## 3. Variables d'environnement (Settings → Environment Variables, scope *Production*)
Bloquantes : `DATABASE_URL` (pooler Neon), `DIRECT_URL` (direct), `AUTH_SECRET`,
`SECRETS_ENCRYPTION_KEY`, `NEXT_PUBLIC_SITE_URL=https://ofmanager.info`,
`AUTH_TRUST_HOST=true`, `VITRINE_ORGANISME_ID`, `CRON_SECRET`, `BLOB_READ_WRITE_TOKEN`,
`RESEND_API_KEY` + `RESEND_SENDER`, `UPSTASH_REDIS_REST_URL` + `..._TOKEN`,
`STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`. Recommandé : `SENTRY_DSN` (suivi
d'erreurs). Inventaire complet + procédure : `docs/PROD-ENV-CHECKLIST.md` et
`.env.example`.
> ⚠️ `SECRETS_ENCRYPTION_KEY` et `AUTH_SECRET` doivent rester **stables** : les
> changer rend illisibles les secrets tenant chiffrés / déconnecte tout le monde.

## 4. Domaine & TLS
Dans **Settings → Domains**, ajouter **`ofmanager.info`** (apex) et
**`www.ofmanager.info`** (en **redirection** vers l'apex). DNS chez OVH :
- A apex → `76.76.21.21` (Vercel).
- `www` → CNAME `cname.vercel-dns.com`. ⚠️ **Retirer tout enregistrement AAAA OVH
  résiduel sur `www`** (sinon les clients IPv6 tombent sur le parking OVH — audit A08-010).
Le certificat TLS (Let's Encrypt) est émis et renouvelé **automatiquement** par Vercel.
> **Sous-domaine par tenant** (`<of>.ofmanager.info`) = wildcard `*.ofmanager.info`,
> qui **exige Vercel Pro**. Non activé aujourd'hui : le tenant est résolu par la
> session (`lib/tenant-host.ts` gère les deux modes). Évolution future.

## 5. Plan Vercel
⚠️ Le plan **Hobby interdit l'usage commercial** (CGU Vercel) et **plafonne les crons**
(fréquence quotidienne, nombre limité). Or `vercel.json` déclare **8 crons** (dont
`parcours` 2×/jour et `rgpd-purge`). → **Passer en Vercel Pro avant le 1er client
payant** (audit A08-004), puis vérifier que les 8 crons figurent dans l'onglet *Crons*.

## 6. Crons (`vercel.json`)
`parcours` (7 h + 13 h), `documents-b2b` (8 h), `rgpd-purge` (3 h), `purge-demos`
(3 h 30), `purge-pdf-cache` (dim. 4 h), `mrr-snapshot` (1er du mois, 5 h),
`suspend-trials` (6 h). Tous protégés par `CRON_SECRET` (Vercel envoie
`Authorization: Bearer <CRON_SECRET>`).

## 7. Schéma de base (migrations)
⚠️ Le schéma évolue aujourd'hui par `npx prisma db push` **manuel** sur la base Neon
partagée — **sans migration versionnée ni rollback de schéma** (audit A08-002).
À faire avant une exploitation durable : **re-baseline** puis `prisma migrate deploy`
(procédure outillée : `docs/MIGRATIONS.md` + `docs/db-baseline.sql`).
En attendant : tout `db push` en prod se fait **hors heures de pointe**, après un
`prisma migrate diff` de contrôle, **jamais** avec `--accept-data-loss`.

## 8. Mises à jour
`git push` / merge sur `main` → Vercel redéploie automatiquement.
⚠️ Le déploiement Vercel **n'est pas conditionné au vert du CI GitHub** aujourd'hui
(constat audit A08) : vérifier le CI (lint / tsc / tests / build) **avant** de merger,
ou configurer une *required status check* sur `main` (GitHub) + « wait for CI » (Vercel).

## 9. Rollback (procédure) — audit A08-005
Trois niveaux, à connaître **avant** l'incident :
1. **Code** — Vercel → *Deployments* → sélectionner le déploiement sain précédent →
   **Promote to Production** (« Instant Rollback »). Effet < 1 min. Corréler au commit
   via le SHA affiché (ou `GET /api/version`).
2. **Schéma** — ⚠️ **pas de rollback automatique** tant que le schéma est piloté par
   `db push` (cf. §7). Un rollback code après un changement de schéma peut laisser
   l'app incohérente → coordonner code + schéma, ou basculer d'abord sur
   `migrate deploy` (migrations réversibles).
3. **Données** — Neon → *Branches* → *Create branch from timestamp* (PITR) → vérifier
   les données → basculer `DATABASE_URL` vers la branche restaurée (jamais d'écrasement
   direct). Cf. `docs/EXPLOITATION.md`.
> **À éprouver une fois** (test à blanc) : promouvoir un ancien déploiement Vercel,
> chronométrer, re-promouvoir l'actuel. Consigner le délai réel ici : `____`.

## 10. Après le 1er déploiement
1. Créer le **SUPERADMIN** s'il n'existe pas : `scripts/create-superadmin.cjs`
   (`SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD`).
2. Vérifier `https://ofmanager.info` → `/login` → `/console`.
3. Sonde : `GET https://ofmanager.info/api/health` → `200 {status:"ok"}`.
4. Version : `GET https://ofmanager.info/api/version` → SHA du déploiement.
5. Crons : vérifier une exécution de `/api/cron/*` (Vercel → Cron logs).
