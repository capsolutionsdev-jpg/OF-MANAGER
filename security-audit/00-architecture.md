# OFManager — Cartographie d'architecture (Phase 0)

> **Cible auditée** : code **déployé en production** — `origin/main` @ `7a198cd`
> (PR #53, 2026-09-18), domaine `ofmanager.info`.
> **Type d'audit** : white-box (revue de code), statique-first, non destructif.
> **Date** : 2026-09-25.
>
> ⚠️ La branche de travail `claude/upbeat-roentgen-eca8ee` (`7f05b0c`) contient un
> commit de durcissement **non encore mergé en prod** (refonte `validations/page.tsx`
> vers `getTenantDb()`). À l'inverse, la prod contient déjà des correctifs A12
> absents de cette branche (comparaison temps-constant `CRON_SECRET`, timeout Redis).

## 1. Stack technique (versions réelles installées)

| Couche | Technologie | Version |
|---|---|---|
| Framework | Next.js (App Router, RSC, Turbopack) | **16.3.1** |
| UI | React / React-DOM | **19.2.4** |
| Styles | Tailwind CSS 4, shadcn, next-themes | 4.x |
| Mobile | Capacitor (wrapper Android/iOS) | 8.x |
| Runtime | Node.js | `>=20 <21` |
| Auth | NextAuth (Auth.js) v5 | **5.0.0-beta.32** (`@auth/core` épinglé `0.41.3`) |
| Hash mdp | bcryptjs | 3.0.3 |
| ORM | Prisma Client | **6.19.3** |
| Base | PostgreSQL (Neon — pooled + direct) | — |
| Validation | Zod | 4.4.3 |
| Stockage fichiers | Vercel Blob | 2.4.0 |
| Rate-limit / cache | Upstash Redis (optionnel) | 1.38.0 |
| E-mail | Resend (primaire) + Brevo (repli UE) | — |
| Paiement | Stripe (abonnement SaaS) | 22.2.2 |
| PDF | puppeteer-core + @sparticuz/chromium, pdf-lib, html-to-docx | — |
| Push | firebase-admin | 14.2.0 |
| IA | @anthropic-ai/sdk (+ OpenAI optionnel) | 0.104.2 |
| Observabilité | Sentry (@sentry/nextjs) | 10.70.0 |
| Sanitisation | sanitize-html | 2.17.7 |
| Hébergement | Vercel (+ self-host Docker `standalone` optionnel) | — |

## 2. Modèle multi-tenant (isolation entre organismes de formation)

Chaque OF = un `Organisme` (colonne `organismeId` sur les modèles tenant).
**Double garantie** (`src/lib/tenant.ts`, `src/lib/prisma.ts`) :

1. **Couche applicative (toujours active)** — `scopedPrisma(organismeId)` : extension
   Prisma qui, pour tout modèle non-global, (a) **injecte** `organismeId` en création
   (placé *après* le payload → non écrasable par le client), (b) l'**ajoute en filtre**
   sur les lectures/updates/deletes de masse (`softWhere`), (c) **vérifie
   l'appartenance** sur les opérations « par id unique » (`findUnique`→`findFirst`
   scoping, `update`/`delete` précédés d'un `findFirst {id, organismeId}`).
2. **Couche base (RLS PostgreSQL)** — optionnelle, derrière `RLS_ENABLED` /
   `RLS_STRICT` (OFF par défaut) : chaque op tourne dans une transaction posant
   `set_config('app.org', $1)` (paramétré).

- **Modèles GLOBAUX** (non cloisonnés) : `Organisme`, `SupportMessage`, `PlanTarif`,
  `Release`, `ReleaseEntry`. Entités d'auth cross-tenant en BYPASS strict : `User`, `Apprenant`.
- **Soft-delete (corbeille)** : `Candidat`, `Session`, `Inscription`, `Entreprise`,
  `Facture` — `delete`→`update{deletedAt}`, lectures excluent la corbeille.
- **Accès brut légitime** : `bypassPrisma()` (console SUPERADMIN cross-tenant, flux
  publics par token, crons). Surveillé par `prisma-direct-guard.test.ts` (3 allowlists
  gelées : pages `(app)`, server actions, routes/pages hors-`(app)`).

## 3. Authentification & session

- **Provider** : Credentials (email + mot de passe), `bcrypt.compare`.
- **Anti-brute-force** : `checkLimit` par e-mail (8/5 min) ET par IP (20/5 min) ;
  Upstash si configuré, sinon compteur mémoire par-instance (alerte prod).
- **Anti-énumération** : bcrypt « à vide » sur compte inexistant (timing constant),
  refus muet.
- **2FA** : TOTP optionnel (`totpEnabled`), secret chiffré AES-256-GCM (`crypto.ts`).
- **Session** : JWT, `maxAge` 12 h absolu, `updateAge` 1 h.
- **Révocation** : `activeSessionId`/`sid` (session unique par compte) + `assertLiveSession()`
  (compte actif, tenant non SUSPENDU, `sid` courant) sur les Server Actions/routes.
- **Impersonation « mode support »** : `SUPERADMIN` uniquement, via trigger `jwt update`
  gardé (SEC-79) — un rôle quelconque ne peut pas se poser `imp:{orgId}`.

## 4. Autorisation (RBAC)

- **Confinement par URL** (edge, `auth.config.ts` `authorized()`) :
  `SUPERADMIN`→`/console` exclusif ; `APPRENANT`→`/mon-*`,`/mes-*` ; `FORMATEUR`→`/mes-*`,`/ma-*` ;
  `ENTREPRISE`→`/espace-entreprise/*` ; `ADMIN`→`/administration` + sections ;
  staff (`RESPONSABLE_FORMATION`,`ASSISTANT`) filtrés par `permissions` cochées +
  `fonctionnalites` de l'organisme.
- **Matrice section↔rôle** : source unique `src/lib/section-roles.ts` (`SECTION_ROLES`).
- **Confinement par action-ID** (les Server Actions se dispatchent hors matcher URL) :
  `requireStaffTenant()` rejette `APPRENANT`/`FORMATEUR`/`ENTREPRISE` (`NON_STAFF_ROLES`).
- **Rôles** : `SUPERADMIN` (éditeur), `ADMIN` (gérant OF), `RESPONSABLE_FORMATION`,
  `ASSISTANT`, `FORMATEUR`, `APPRENANT`, `ENTREPRISE`.

## 5. Frontières de confiance

```
Navigateur / app mobile (Capacitor)
   │  cookies HttpOnly (JWT next-auth)
   ▼
Vercel Edge — middleware `authorized()` (confinement URL par rôle) + CSP/nonce
   │
   ▼
Runtime Node — RSC / Route Handlers (~90) / Server Actions (~93 fichiers)
   │  gardes : requireStaffTenant / requireTenant / getTenantDb / requireSuperAdmin
   ▼
Prisma `scopedPrisma(organismeId)`  ──(optionnel)──▶  RLS Postgres (app.org)
   ▼
Neon PostgreSQL
   │
   └──▶ Externes : Stripe · Resend/Brevo · Vercel Blob · Upstash · Anthropic ·
                    Firebase (push) · Wedof (CPF) · Cloudflare Turnstile
```

## 6. Points d'entrée (surface d'attaque)

- **App authentifiée** : `(app)/*` (staff), `mon-espace`/`mes-*` (apprenant),
  `mes-sessions`/`mes-*` (formateur), `espace-entreprise/*` (entreprise), `console/*` (superadmin).
- **Flux publics par token** : `parcours`, `compte-rendu`, `contrat-formateur`,
  `satisfaction`, `satisfaction-entreprise`, `suivi`, `signer`, `emarger`,
  `positionnement`, `francais`, `reclamer`, `prospect`, `portail`, `devis-accept`,
  `definir-mot-de-passe`, `reinitialisation`.
- **API publiques** : `api/public/*`, `api/lead`, `api/demo`, `api/civique/*`,
  `api/verification`, `api/health`, `api/version`.
- **Webhooks** : `api/stripe/webhook`, `api/webhooks/{brevo,resend,wedof/[orgId]}`.
- **Crons (Vercel)** : `api/cron/{documents-b2b,mrr-snapshot,parcours,purge-demos,
  purge-pdf-cache,rgpd-purge,suspend-trials}` — gardés `Authorization: Bearer CRON_SECRET`
  (temps constant).
- **Upload** : `api/upload`. **Push** : `api/push/register`.
- **Exports / téléchargements** (route handlers, souvent `[id]`) : candidats, sessions,
  comptabilité, trésorerie (FEC), diplômes/titres/attestations, factures, reçus,
  dossier Qualiopi, examen civique, défraiement jurys, clients-pro.

## 7. Données sensibles (assets)

Identités & PII candidats/stagiaires, pièces justificatives, documents administratifs
(attestations, diplômes officiels, contrats, conventions), signatures & émargements,
évaluations/résultats, factures/paiements & comptabilité (trésorerie, FEC), secrets
tenant **chiffrés** (clés API par OF), mots de passe **bcrypt**, secrets **TOTP chiffrés**,
sessions/JWT, journaux d'audit (`AuditLog`).

## 8. En-têtes de sécurité (next.config.ts, toutes routes)

CSP (`default-src 'self'`, `object-src 'none'`, `base-uri`/`form-action`/`frame-ancestors 'self'`,
`script-src` avec `'unsafe-inline'` — nonce optionnel derrière `CSP_NONCE`),
HSTS `max-age=63072000; includeSubDomains; preload`, `X-Frame-Options: SAMEORIGIN`,
`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
`Permissions-Policy` (camera/micro/geo/topics désactivés), `poweredByHeader: false`.
Server Actions `allowedOrigins` restreint (`ofmanager.info`, `www`, `of-manager-*.vercel.app`).

## 9. CI/CD & sauvegarde

`.github/workflows/` : `ci.yml`, `backup-offsite.yml` (dump chiffré age → S3, inerte
tant que `BACKUP_ENABLED != true`), `cron-external.yml`. Secrets de sauvegarde posés
dans GitHub (pas dans le repo/Vercel).
