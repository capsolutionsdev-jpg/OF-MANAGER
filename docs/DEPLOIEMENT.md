# Déploiement OFManager sur Vercel (multi-tenant, sous-domaines)

Objectif : déployer **une seule** application OFManager qui sert **tous les organismes**,
chacun sur son **sous-domaine** (`aspr.ofmanager.fr`, `cap.ofmanager.fr`, …). Les données
sont déjà cloisonnées par `organismeId` dans la base Neon partagée.

> Le repo est prêt : `postinstall: prisma generate`, headers de sécurité, `serverActions`
> 5 Mo, Chromium serverless (`@sparticuz/chromium`) pour les PDF, crons dans `vercel.json`,
> `trustHost: true` (gère plusieurs domaines/sous-domaines).

---

## 1. Pré-requis
- Repo GitHub `infocapcomp-dotcom/cap-competence-manager` (✅), branche **`main`** à jour
  (fusionner `feat/finitions-essai` → `main`).
- Base **Neon** de production (celle déjà utilisée, qui contient CAP + ASPR + …).
- Compte **Vercel** — **plan Pro requis** pour les **domaines wildcard** (`*.ofmanager.fr`).
- Un **nom de domaine** (ex. `ofmanager.fr`).

## 2. Créer le projet Vercel
1. Vercel → **Add New… → Project** → importer le repo.
2. Framework : **Next.js** (auto). Build : `next build` (auto). Install : `npm install`
   (le `postinstall` lance `prisma generate`). Rien à modifier.
3. Production Branch : **`main`**.

## 3. Variables d'environnement (Project → Settings → Environment Variables)
Obligatoires :
| Variable | Valeur |
|---|---|
| `DATABASE_URL` | URL Neon **pooler** (`...-pooler...?sslmode=require`) |
| `DIRECT_URL` | URL Neon **directe** (migrations) |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | `true` *(indispensable en multi-sous-domaine)* |
| `APP_URL` | `https://app.ofmanager.fr` *(domaine principal — liens e-mail)* |

> **Ne PAS** figer `AUTH_URL`/`NEXTAUTH_URL` sur un seul sous-domaine : avec
> `AUTH_TRUST_HOST=true`, Auth.js utilise l'hôte de la requête → la connexion marche sur
> **chaque** sous-domaine. Laisse-les vides (ou = `APP_URL`).

Optionnelles (sinon mode démo) :
`BREVO_API_KEY`, `BREVO_SENDER`, `BREVO_SMS_SENDER`, `ANTHROPIC_API_KEY`,
`YOUSIGN_API_KEY`, `LEAD_API_SECRET`, `LEAD_NOTIF_EMAIL`, `CRON_SECRET`.

> Les clés d'intégration peuvent aussi être définies **par organisme** dans la console
> (`brevoApiKey`, `anthropicApiKey`, `yousignApiKey`) ; la variable d'environnement globale
> sert alors de **repli**. Idem quota `maxSmsMois` et matrice d'automatisations
> (`automationsConfig`) : pilotés par OF, en direct, sans redéploiement.

## 4. Domaine principal + wildcard (le cœur du multi-tenant)
Dans **Project → Settings → Domains**, ajouter :
1. `app.ofmanager.fr` (ou l'apex `ofmanager.fr`) → domaine principal (console éditeur + accueil).
2. **`*.ofmanager.fr`** → wildcard (tous les sous-domaines tenants). *(Pro)*

**DNS** (chez ton registrar / Cloudflare) — suivre ce que Vercel affiche, en général :
| Type | Nom | Valeur |
|---|---|---|
| CNAME | `app` | `cname.vercel-dns.com` |
| CNAME | `*` | `cname.vercel-dns.com` |
| (apex) A/ALIAS | `@` | IP/cible indiquée par Vercel |

Comment ça marche : `lib/tenant-host.ts` lit le **1er label** de l'hôte (`aspr` dans
`aspr.ofmanager.fr`) et résout l'organisme via `Organisme.sousDomaine`. Labels réservés
ignorés : `www`, `app`, `localhost`.

## 5. Après le 1er déploiement
1. **Créer le compte éditeur (SUPERADMIN)** s'il n'existe pas en prod : via la console ou un
   script (`scripts/create-superadmin.cjs`). Idem comptes gérants.
2. Vérifier : `https://app.ofmanager.fr` (accueil) → `/login` → `/console`.
3. Vérifier un tenant : régler `sousDomaine` d'un organisme dans la console, puis ouvrir
   `https://<sousDomaine>.ofmanager.fr/login` → la marque de l'OF doit s'afficher.
4. **Crons** : Vercel lit `vercel.json` (parcours 7h/13h). Si `CRON_SECRET` est défini,
   vérifier que `/api/cron/parcours` exige l'en-tête `Authorization: Bearer $CRON_SECRET`.

## 6. Bascule d'ASPR vers OFManager
ASPR est déjà un **locataire** (`sousDomaine = aspr`, données migrées).
1. Communiquer aux utilisateurs ASPR la nouvelle URL **`https://aspr.ofmanager.fr`**
   (connexion `admin@aspr.fr`).
2. Si ASPR a un **domaine propre** (ex. `manager.aspr-formation.fr`) : ajouter ce domaine au
   projet OFManager (Settings → Domains) et **repointer son DNS** (CNAME → Vercel). Il faut
   aussi que `Organisme.sousDomaine` ou le mapping de domaine corresponde (option : gérer le
   domaine custom comme alias → afficher la marque ASPR).
3. **Décommissionner l'ancien déploiement** `aspr-formation-manager` (Vercel) **une fois la
   bascule confirmée** — sinon les nouvelles saisies iraient sur l'ancienne base.

   ⚠️ L'URL `aspr-formation-manager.vercel.app` (sous-domaine de l'ancien projet) ne peut pas
   être réattribuée à OFManager : utiliser un domaine custom ou `aspr.ofmanager.fr`.

## 7. Mises à jour ultérieures
`git push` sur `main` → Vercel redéploie. Les changements de schéma : `npx prisma db push`
(sur la base Neon) **avant** que le code dépendant ne soit en prod (jamais `migrate dev` — cf.
règle projet). Les options/design d'un OF se pilotent **en direct** depuis la console.
