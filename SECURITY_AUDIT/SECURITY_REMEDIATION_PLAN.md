# SECURITY REMEDIATION PLAN — OF Manager

> Plan de correction priorisé. **P0** = immédiat (bloquant production) · **P1** = très urgent · **P2** = important · **P3** = amélioration.
> Difficulté : ⚙️ faible (quelques lignes) · ⚙️⚙️ moyenne · ⚙️⚙️⚙️ élevée (infra/refactor).

## TOP 10 des corrections

| Priorité | Vulnérabilité | Gravité | Action | Difficulté | Impact |
|---|---|---|---|---|---|
| **P0** | F-01 (SEC-79) Impersonation non gardée | 🔴 CRITIQUE | Ajouter `if (tok.role !== "SUPERADMIN") return token;` avant `applyImpersonationStart` dans le callback jwt (`auth.config.ts`) | ⚙️ | **Ferme la prise de contrôle inter-tenant.** Bloquant. |
| **P1** | F-02 (SEC-26) Stored XSS leçons (BFLA) | 🟠 ÉLEVÉE | (a) Gater `createCours/addModule/addLecon/updateLecon/updateModule` par `requireStaffTenant` ; (b) assainir `Lecon.contenu` (allowlist) à l'écriture et au rendu | ⚙️⚙️ | Empêche l'injection par comptes faibles + neutralise le XSS |
| **P1** | F-04 (SEC-50/9/10) Rate-limit sans Upstash | 🟠 ÉLEVÉE | Provisionner `UPSTASH_REDIS_REST_URL/TOKEN` en prod ; faire échouer le boot si absent en prod ; + CAPTCHA login progressif | ⚙️⚙️ | Rend le rate-limiting réellement effectif (brute-force, flood, coût IA) |
| **P1** | F-03 (SEC-14) Révocation de session | 🟠 ÉLEVÉE | Contrôle `sid == activeSessionId` (+ `isActive`) dans `requireTenant/requireStaffTenant/requireAdmin` ; rotation sur `changePassword` ; purge au logout | ⚙️⚙️ | Rétablit session unique, invalidation sur reset/logout, réponse à incident |
| **P2** | F-06 (SEC-23/24) RLS inerte + rôle owner | 🟡 MOYENNE | Créer le rôle `app_rls` (NOBYPASSRLS), basculer `DATABASE_URL` dessus, `RLS_ENABLED=true`, `FORCE ROW LEVEL SECURITY`, policies en migrations, tester en staging | ⚙️⚙️⚙️ | Ajoute le filet base absent (défense en profondeur sous F-01) |
| **P2** | F-07 (SEC-45/47) Documents en Blob public | 🟡 MOYENNE | `storeUpload` : `access:"private"` pour `DocumentGenere`/pièces sensibles ; servir via proxy authentifié (motif B2B existant) ; remplacer les `<a href={fileUrl}>` apprenant | ⚙️⚙️ | Supprime l'accès public permanent aux documents personnels |
| **P2** | F-12 (SEC-50b) `civique/*` sans rate-limit | 🟡 MOYENNE | `checkLimit` par IP/email + captcha sur `civique/lead` et `civique/checkout` | ⚙️ | Stoppe le flood CRM + le spam de sessions Stripe |
| **P2** | F-08 (SEC-38) Lacunes audit log | 🟡 MOYENNE | `auditLog.create(action:"DELETE")` dans `supprimerCompte` (3 branches) ; tracer LOGIN/LOGOUT via events NextAuth | ⚙️ | Imputabilité + preuve Qualiopi/RGPD |
| **P2** | F-15 (SEC-53) Deps runtime vulnérables | 🟡 MOYENNE | Montées transitives non-breaking : `axios`, `form-data`, `undici`, `image-size` ; re-`npm audit` | ⚙️⚙️ | Réduit la surface CVE embarquée en prod |
| **P2** | F-10/F-11 (SEC-11/54) 2FA + Math.random | 🟡 MOYENNE | `ENFORCE_ADMIN_2FA=true` en prod (+ codes de secours) ; remplacer `Math.random()` par `crypto` pour les mdp | ⚙️/⚙️⚙️ | Durcit l'accès admin + credentials imprévisibles |

## Feuille de route par vague

### Vague 0 — BLOQUANT (avant toute nouvelle mise en service multi-tenant payante)
- **F-01** — Fermer l'impersonation (P0). ✅ *corrigé et re-testé dans cet audit — voir section RETEST du rapport principal.*

### Vague 1 — Très urgent (jours)
- **F-02** BFLA + assainissement e-learning. *(BFLA corrigé dans cet audit ; assainissement HTML = suivi.)*
- **F-04** Upstash obligatoire en prod (config Vercel) + CAPTCHA.
- **F-03** Révocation de session (guards + rotation + purge).
- **F-16** `SECRETS_ENCRYPTION_KEY` en prod · **F-31** `SENTRY_DSN` + alerting.

### Vague 2 — Important (semaines)
- **F-06** Activer la RLS avec un rôle non-owner (défense en profondeur base).
- **F-07** Documents sensibles en Blob privé + proxy.
- **F-08** Compléter l'audit log · **F-09** mots de passe seed/ops · **F-12** rate-limit civique.
- **F-15** Montées de dépendances runtime · **F-13** durcir webhook Brevo · **F-14** plafonds anti-abus.
- **F-10/F-11** 2FA admins + `crypto` pour les mdp · **F-18** provisionner un staging isolé.

### Vague 3 — Amélioration (backlog)
- **F-05/F-17** Sortie de `next-auth` beta + veille dépendances/Chromium.
- **F-19→F-28** durcissements (politique mdp, reset self-service, `/api/upload` staff-only, CSP nonce, chiffrement PII régalienne, e-mail sans mdp clair, allowlist SSRF, CSRF route handlers, échappement JSON-LD, anti-rejeu Wedof).
- **F-29** allowlist STAFF sur T3P · **F-30** runbook de révocation de secret · **F-32** `.strict()` Zod.

## Note méthodologique
- Les corrections **infra/config** (Upstash, RLS, Sentry, staging, dépendances majeures) relèvent de l'exploitant (Vercel/Neon) et ne sont pas appliquées automatiquement par cet audit.
- Les corrections **code** appliquées et re-testées dans cet audit sont listées dans la section **RETEST** de `SECURITY_AUDIT_REPORT.md`.
- Les tests **dynamiques** (DAST, isolation A→B live, brute-force réel, race conditions) exigent un **staging isolé à deux tenants de test** : **REQUIRES EXTERNAL PENTEST**.
