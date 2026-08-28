# OFManager

SaaS de gestion d'organismes de formation (OF) : CRM, suivi pédagogique, gestion
administrative, facturation. Multi-tenant, conforme Qualiopi / RGPD. Édité par
**CAP SOLUTIONS**. Production : **https://ofmanager.info**.

**Stack** : Next.js 16 (App Router) · React 19 · TypeScript · Prisma / PostgreSQL
(Neon) · NextAuth v5 · Tailwind · déploiement Vercel (région `fra1`).

## Prérequis
- **Node 20** (voir `.nvmrc` / `engines`). Avec nvm : `nvm use`.
- Une base **PostgreSQL de développement** — idéalement une **branche Neon dédiée**.
  ⚠️ **Ne jamais pointer la base de production** (voir « Étanchéité dev/prod »).

## Démarrage (développeur)
1. Installer les dépendances (`postinstall` lance `prisma generate`) :
   ```bash
   npm ci
   ```
2. Créer le fichier d'environnement :
   ```bash
   cp .env.example .env
   ```
   Minimum requis : `DATABASE_URL` + `DIRECT_URL` (ta base de **dev**),
   `AUTH_SECRET` (`openssl rand -base64 32`), `SECRETS_ENCRYPTION_KEY`
   (`openssl rand -base64 32`). Le reste est optionnel en dev (l'app dégrade
   proprement : e-mail en mode démo, IA/paiement inactifs sans clé…).
   `.env.example` documente chaque variable (`[OBLIG]` / `[OPT]` / `[FLAG]`).
3. Appliquer le schéma sur ta base de dev :
   ```bash
   npx prisma db push
   ```
4. (Optionnel) injecter des données de démo :
   ```bash
   SEED_DEMO=1 npm run db:seed
   ```
5. Lancer le serveur de dev (**port 3100**) :
   ```bash
   npm run dev        # http://localhost:3100
   ```

## Étanchéité dev / prod (IMPORTANT)
La base Neon de production est **partagée** entre tous les organismes (multi-tenant).
Le poste de dev doit pointer une base **distincte** :
- `DATABASE_URL` local ≠ prod ; secrets locaux (`AUTH_SECRET`,
  `SECRETS_ENCRYPTION_KEY`) **distincts** de ceux de Vercel.
- `DATABASE_URL_TEST` active les tests d'intégration / d'isolation (auto-ignorés
  s'il est absent).
- Les scripts destructeurs (`scripts/reset-data.ts`, `scripts/seed-*`) écrivent dans
  la base pointée par `DATABASE_URL` : à ne lancer que sur une base de dev.

## Tests & qualité
```bash
npm test           # vitest (unitaires + isolation multi-tenant si DATABASE_URL_TEST)
npm run lint       # ESLint
npx tsc --noEmit   # types
npm run build      # build de prod (⚠️ jamais pendant que `npm run dev` tourne)
npm run test:e2e   # Playwright (garde anti-prod : refuse une base non locale)
```

## Structure
- `src/app/` — routes App Router : `(app)/` = espace connecté, `api/` = endpoints
  (`api/health` = sonde de disponibilité, `api/version` = révision déployée),
  pages publiques.
- `src/lib/` — logique métier : `tenant.ts` (`getTenantDb()`, accès cloisonné),
  `prisma.ts`, `documents/` (moteur PDF), `observability/` (report d'erreur)…
- `prisma/schema.prisma` — modèle de données (flux de migration : `docs/MIGRATIONS.md`).
- `docs/` — exploitation : `DEPLOIEMENT.md`, `EXPLOITATION.md`, `ROTATION-SECRETS.md`,
  `PROD-ENV-CHECKLIST.md`, `ETUDE-COUTS-INFRA.md`, `MIGRATIONS.md`…

## Déploiement
Voir **`docs/DEPLOIEMENT.md`** (Vercel + Neon + domaine `ofmanager.info`, crons,
rollback) et **`docs/PROD-ENV-CHECKLIST.md`** (variables bloquantes).
