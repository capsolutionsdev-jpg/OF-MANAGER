# SECURITY ARCHITECTURE — OF Manager (fork commercial)

> **Périmètre audité** : `~/Desktop/ofmanager-commercial` — SaaS multi-tenant OF Manager (édition CAP SOLUTIONS), en production sur `ofmanager.info`.
> **Date** : 2026-08-26 · **Méthode** : audit statique de code + `npm audit` + revue de configuration. **Aucun test dynamique** contre la base (voir *Contraintes*).
> **Type de cible** : STEP 1 de la méthode d'audit (cartographie). Sert de base falsifiable aux 90 contrôles.

## 1. Stack technique (vérifiée)

| Couche | Technologie | Preuve |
|---|---|---|
| Framework | **Next.js 16.3.1** (App Router, React 19.2.4, RSC + Server Actions) | `package.json:44,51` |
| Langage | TypeScript 5 (strict) | `tsconfig.json` |
| Auth | **NextAuth v5** (`5.0.0-beta.32`) + `@auth/prisma-adapter`, provider **Credentials** (email/mdp) | `package.json:45`, `src/auth.ts` |
| Hash mot de passe | **bcryptjs** | `package.json:37`, `src/auth.ts:3,66` |
| 2FA | TOTP maison (`src/lib/totp.ts`), secret chiffré | `src/auth.ts:10,70` |
| ORM / DB | **Prisma 6** / **PostgreSQL (Neon, eu-central-1)** | `package.json:30,75`, `.env` (DATABASE_URL) |
| Isolation base | **RLS Postgres** (policies `app.org`) **derrière flag `RLS_ENABLED`** (OFF par défaut) | `src/lib/prisma.ts:39-131` |
| Paiement | **Stripe 22** (abonnement self-serve OF + e-learning civique) | `package.json:55` |
| Stockage fichiers | **Vercel Blob** (`@vercel/blob`) | `package.json:36`, `src/lib/blob.ts` |
| Rate-limit | **Upstash Redis** si configuré, sinon compteur mémoire par-instance | `src/lib/rate-limit.ts` |
| E-mail | **Resend** (transactionnel) + **Brevo** (marketing/automations) | `.env` RESEND_*, `src/lib/email.ts` |
| Monitoring | **Sentry** (`@sentry/nextjs` 10) | `package.json:31` |
| Captcha | **Cloudflare Turnstile** (page publique `/verification`) | `next.config.ts:9-10` |
| IA | Anthropic SDK + OpenAI (génération texte/image) | `package.json:21`, `src/lib/ai.ts`, `src/lib/image-gen.ts` |
| Signature | YouSign (clé par organisme) — sinon signature interne | `schema.prisma:108` |
| Push mobile | Firebase Admin (FCM/APNs), app Capacitor | `package.json:41`, `src/app/api/push/register` |
| PDF | Puppeteer-core + `@sparticuz/chromium` + `pdf-lib` + `html-to-docx` | `package.json:32,47,49` |
| CPF / financement | Wedof / CertiPlace (webhook entrant par organisme) | `schema.prisma:110-111` |
| Hébergement | **Vercel** (région `fra1`), crons Vercel | `vercel.json:2,12-41` |
| CI/CD | GitHub Actions (`.github/`) | dossier `.github/` |

## 2. Modèle multi-tenant

- **Tenant = modèle `Organisme`** (`schema.prisma:60`). ~80 modèles métier portent une colonne `organismeId` (**`String?` — nullable**).
- **Résolution du tenant : côté serveur uniquement.** `organismeId` est lu **depuis la base au login** et injecté dans le **JWT** (`src/auth.ts:87`), puis exposé via `session.user.organismeId` (`src/auth.config.ts:126,145`). ✅ Jamais fourni par le client → conforme SEC-61.
- **Rôles** (`enum Role`, `schema.prisma:21-29`) :
  `SUPERADMIN` (éditeur plateforme, hors organisme) · `ADMIN` (gérant de l'OF) · `RESPONSABLE_FORMATION` · `ASSISTANT` · `FORMATEUR` · `APPRENANT` · `ENTREPRISE` (client B2B).
- **Deux couches d'isolation** :
  1. **Applicative (active)** — chaque requête Prisma doit inclure `where: { organismeId }`. C'est **la défense réelle** aujourd'hui.
  2. **Base / RLS (inactive par défaut)** — `src/lib/prisma.ts` : si `RLS_ENABLED=true`, chaque opération pose `app.org` (transaction-local) ; sinon le client tourne en **BYPASS** (aucune policy appliquée). Le mode `RLS_STRICT` cloisonne le client brut sur l'org de session. **Non activé dans le `.env` local** → l'isolation base n'est pas en vigueur (à confirmer côté Vercel).

## 3. Modèle d'authentification / autorisation

- **Session : JWT** (pas de session base), `maxAge` **12 h absolu**, `updateAge` 1 h (approx. inactivité) — `src/auth.config.ts:27`.
- **Anti-brute-force login** : plafond **8 tentatives / e-mail** + **20 / IP** par 5 min (`src/auth.ts:21-23,41-48`) ; anti-énumération à **temps constant** (bcrypt factice sur compte inexistant, `src/auth.ts:54-60`).
- **Session unique** : `activeSessionId` (`sid`) écrit au login (`src/auth.ts:78-79`) — *l'application effective de la révocation reste à prouver (voir contrôle SEC-14)*.
- **Autorisation des PAGES : middleware edge** (`src/middleware.ts` + callback `authorized` de `src/auth.config.ts:30-120`) — confinement par rôle (SUPERADMIN→`/console`, APPRENANT→`/mon-espace`, FORMATEUR→`/mes-*`, ENTREPRISE→`/espace-entreprise`, ADMIN→`/administration`) + matrice `SECTION_ROLES` + permissions cochées + feature flags par organisme.
- **⚠️ Le middleware NE couvre PAS `/api/*`** : le matcher exclut `api/auth|cron|pdf-test|lead|demo|stripe|webhooks|public|verification|civique` (`src/middleware.ts:57-59`). **Chaque route API et chaque Server Action doit porter sa propre auth + son propre scope tenant.** C'est la principale zone de risque IDOR/BOLA/fuite inter-tenant.
- **Impersonation « mode support »** (SUPERADMIN → ADMIN d'un OF) via le trigger `update` de NextAuth (`src/lib/impersonation.ts`, `src/auth.config.ts:129-137`). Les fonctions de transition sont pures et **ne vérifient pas le rôle** → le *garde SUPERADMIN* doit exister dans la server action appelante (contrôle SEC-79).

## 4. En-têtes & transport

- CSP, **HSTS** (`max-age=63072000; includeSubDomains; preload`), `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restrictive, `poweredByHeader:false` — `next.config.ts:26-35,92`.
- **Faiblesse CSP** : `script-src 'unsafe-inline'` reste actif en prod ; la variante à **nonce** existe mais est derrière le flag `CSP_NONCE` (OFF) — `src/middleware.ts:16,35-50`.

## 5. Gestion des secrets

- `.env*` **gitignoré** (`.gitignore:34`) et **aucun `.env` tracké** (vérifié `git ls-files`). ✅
- Secrets d'app en variables d'environnement : `AUTH_SECRET`, `SECRETS_ENCRYPTION_KEY`, `CRON_SECRET`, `LEAD_API_SECRET`.
- **Secrets tenant stockés en base** (`Organisme`) : `brevoApiKey`, `anthropicApiKey`, `imageApiKey`, `yousignApiKey`, `wedofApiKey`, `wedofWebhookSecret` — chiffrés **AES-256-GCM** au niveau applicatif (`src/lib/crypto.ts`) si `SECRETS_ENCRYPTION_KEY` défini (fail-safe : `encryptSecret` lève en prod si clé absente).
- Auth cron : `CRON_SECRET` Bearer, **échec fermé**, jamais en query string (`src/lib/cron-auth.ts`). ✅

## 6. Contraintes de l'audit (honnêteté méthodologique)

- **Pas de staging isolé** : le seul `DATABASE_URL` disponible pointe une **base Neon de production / partagée**. Le prompt d'audit **interdit** tout test dynamique destructif ou toute exfiltration de données réelles.
- **Conséquence** : les tests **dynamiques** d'isolation A→B / B→A (SEC-22, SEC-86), le DAST (SEC-55) et le pentest applicatif live (SEC-81) sont marqués **NOT TESTED / REQUIRES EXTERNAL PENTEST**. L'isolation est établie par **audit de code** (concluant si le scoping est systématique) + la suite de tests d'autorisation du dépôt (`src/lib/__tests__/authorization-matrix.test.ts`).
- Les contrôles d'**infrastructure** (backups Neon/Vercel, DR, chiffrement au repos géré par l'hébergeur) ne sont pas vérifiables depuis le code → **NOT TESTED** avec recommandations.
- La configuration **de production** (variables Vercel : UPSTASH, SENTRY_DSN, STRIPE_*, TURNSTILE, `RLS_ENABLED`) **n'est pas auditable depuis ce dépôt** ; les constats fondés sur le `.env` local le signalent explicitement.
