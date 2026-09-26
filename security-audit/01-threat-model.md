# OFManager — Modèle de menaces (Phase 1)

> Méthodologie : STRIDE par composant + OWASP. Cible : prod `7a198cd`.

## 1. Acteurs de menace

| Acteur | Position | Motivation |
|---|---|---|
| Anonyme (Internet) | Non authentifié | Vol de données, énumération, abus d'endpoints publics, DoS |
| Client B2B (`ENTREPRISE`) | Authentifié, tiers de l'OF | Accès au back-office, données d'autres clients/OF |
| Apprenant / Formateur | Authentifié, non-staff | Escalade vers gestion, accès données d'autres apprenants |
| Staff malveillant (`ASSISTANT`/`RESPONSABLE_FORMATION`) | Authentifié, périmètre limité | Escalade vers ADMIN, sections non autorisées |
| Admin OF malveillant (`ADMIN`) | Gérant d'un tenant | **Accès cross-tenant** (autre OF), escalade SUPERADMIN |
| Attaquant ayant volé une session | Token JWT valide | Toutes actions de la victime dans la fenêtre 12 h |
| Éditeur compromis (`SUPERADMIN`) | Accès console cross-tenant | Compromission totale (hors périmètre : confiance éditeur) |

## 2. Assets critiques & impact

| Asset | Confidentialité | Intégrité | Disponibilité |
|---|---|---|---|
| PII candidats/stagiaires | **Élevé** (RGPD) | Élevé | Moyen |
| Documents (attestations, diplômes, contrats, conventions) | Élevé | **Élevé** (fraude au diplôme) | Moyen |
| Signatures & émargements | Élevé | **Élevé** (valeur probante) | Moyen |
| Factures / paiements / comptabilité (FEC) | Élevé | **Élevé** (fraude fiscale) | Moyen |
| Mots de passe (bcrypt), secrets TOTP (chiffrés) | **Critique** | Critique | — |
| Secrets tenant (clés API chiffrées) | **Critique** | Critique | — |
| Sessions / JWT | **Critique** | Critique | — |
| Cloisonnement inter-tenant (organismeId) | **Critique** | Critique | — |
| Journaux d'audit (`AuditLog`) | Moyen | **Élevé** (non-répudiation) | Moyen |

## 3. Frontières de confiance & contrôles

| Frontière | Contrôle attendu | Fichier |
|---|---|---|
| Internet → Edge | Confinement URL par rôle | `auth.config.ts` `authorized()` |
| Edge → Server Action | Auth + rôle par action-ID (pas seulement URL) | `requireStaffTenant`/`requireSuperAdmin` |
| Server Action → DB | Cloisonnement organismeId | `scopedPrisma` / `getTenantDb` |
| Flux public → DB | Résolution par token unique (pas d'ID devinable) | routes `[token]` + `bypassPrisma` |
| Webhook → action métier | Signature + anti-replay + idempotence | `api/webhooks/*`, `api/stripe/webhook` |
| Cron → traitement | `Authorization: Bearer CRON_SECRET` (temps constant) | `cron-auth.ts` |
| Secret au repos | AES-256-GCM | `crypto.ts` |

## 4. STRIDE par composant

### Authentification (`auth.ts`)
- **S**poofing : credential stuffing → *atténué* (rate-limit e-mail+IP, 2FA TOTP, anti-énumération). Résidu : rate-limit mémoire si Upstash absent.
- **T**ampering : forge de token → *atténué* (JWT signé AUTH_SECRET).
- **R**epudiation : *à vérifier* (AuditLog des connexions ?).
- **I**nfo disclosure : énumération de comptes → *à vérifier* (reset/inscription).
- **E**oP : impersonation → *atténué* (SUPERADMIN-only, SEC-79).

### Isolation multi-tenant (`tenant.ts`, route handlers)
- **T/I/E** : accès cross-tenant via IDOR sur route handler brut, mass-assignment de `organismeId`, oubli de `getTenantDb`. **→ Cible #1 de l'audit.**

### Server Actions (~93)
- **E/T** : BFLA — action de gestion invocable par un rôle non-staff ou sans garde. **→ Cible.**

### Documents / PDF / Upload
- **I** : BOLA sur fichier (URL/ID devinable), SSRF via rendu Chromium, SVG XSS. **→ Cible.**
- **T** : génération d'un document au nom d'un autre OF.

### Webhooks / API publiques / Crons
- **S/T** : webhook forgé/rejoué (signature/idempotence), cron non authentifié, énumération d'ID cross-tenant sur `api/public/*`. **→ Cible.**

### Exports (CSV/XLSX/FEC)
- **T** : injection de formule CSV (CWE-1236) exécutée à l'ouverture Excel. **→ Cible.**

## 5. Scénarios d'attaque prioritaires (à valider par l'audit)

1. **Cross-tenant read** : `ADMIN` de l'OF A appelle un route handler `.../[id]/route.ts` avec l'ID d'un objet de l'OF B, chargé sur le client brut sans filtre `organismeId`.
2. **BFLA console** : un `ADMIN` (non-SUPERADMIN) atteint `/api/console/*` (passe le middleware, `seg="api"`) et le handler ne re-vérifie pas `requireSuperAdmin`.
3. **Mass-assignment de rôle** : une action de création/maj de compte accepte `role` du client → auto-promotion `ADMIN`/`SUPERADMIN`.
4. **BOLA fichier** : téléchargement d'un document candidat d'un autre OF via une URL Blob/route de download connue.
5. **CSV formula injection** : un nom de candidat `=cmd|...` exporté dans un CSV comptable.
6. **Webhook replay/forge** : Stripe/Wedof rejoué → double provisioning ou activation d'abonnement.
7. **SSRF PDF** : contenu tenant injectant `<img src=http://169.254.169.254/...>` dans un document rendu par Chromium.

*Le résultat de la fouille multi-agents (run `wmo6guz00`) confirmera ou écartera chacun de ces scénarios avec preuve de code.*
