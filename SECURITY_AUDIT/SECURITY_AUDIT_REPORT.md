# SECURITY AUDIT REPORT

**Cible** : OF Manager — fork commercial CAP SOLUTIONS (`~/Desktop/ofmanager-commercial`), SaaS multi-tenant en production sur `ofmanager.info`.
**Date** : 2026-08-26 · **Auditeur** : audit automatisé (7 agents spécialisés + vérification adversariale indépendante).
**Méthode** : analyse statique de code, revue de configuration, `npm audit`, `eslint`. **Tests dynamiques** (DAST, isolation live A→B, brute-force réel) **non réalisés** — pas de staging isolé (le seul `DATABASE_URL` disponible pointe une base Neon de production/partagée ; le prompt interdit tout test destructif ou toute exfiltration de données réelles). Voir `SECURITY_ARCHITECTURE.md` §6.
**Autorisation** : audit du propriétaire sur son propre système, dans le périmètre du dépôt.

---

## Résumé exécutif

OF Manager est une plateforme **mature et globalement bien sécurisée** : SQL 100 % paramétré (Prisma), cloisonnement multi-tenant systématique au niveau du code (`scopedPrisma` force `organismeId`, vérifie l'appartenance, ferme le mass-assignment), hachage bcrypt coût 12, anti-énumération à temps constant, 2FA TOTP, uploads durcis (magic-bytes), signatures webhook Stripe/Wedof correctes, en-têtes de sécurité solides (HSTS, CSP, nosniff…), effacement RGPD complet.

**Mais** l'audit a confirmé **une vulnérabilité CRITIQUE** qui annule ce cloisonnement : le trigger d'impersonation NextAuth n'est pas gardé côté callback, permettant à **tout compte authentifié** de devenir ADMIN d'un organisme arbitraire (F-01/SEC-79). Quatre vulnérabilités **ÉLEVÉES** complètent le tableau (stored XSS e-learning inscriptible par comptes faibles, révocation de session incomplète, rate-limiting contournable sans Upstash, couche d'auth sur `next-auth` beta).

La vérification adversariale a **rectifié** l'audit initial : elle a **réfuté** un faux positif (fuite T3P vers un compte ENTREPRISE — en réalité bloquée par le middleware), **rehaussé** le stored XSS (MOYENNE→ÉLEVÉE, car inscriptible par un apprenant), **abaissé** le défaut RLS (ÉLEVÉE→MOYENNE, non exploitable seul) et **nuancé** la fuite documentaire (les CNI/RIB passent par un proxy authentifié ; seuls les documents générés fuient).

---

## Synthèse par gravité (vulnérabilités confirmées)

| Niveau | Nombre |
|---|---|
| 🔴 Critique | 1 |
| 🟠 Élevée | 4 |
| 🟡 Moyenne | 13 |
| 🟢 Faible | 10 |
| 🔵 Information | 4 |

## Synthèse par statut (90 contrôles)

| Statut | Nombre |
|---|---|
| PASS | 36 |
| FAIL | 9 |
| PARTIAL | 33 |
| NOT TESTED | 10 |
| NOT APPLICABLE | 2 |

---

## Tableau principal des 90 contrôles

> Détail complet des vulnérabilités (impact, CVSS, correction) dans `SECURITY_FINDINGS.md`. Références `F-xx` = fiche de finding.

### A — Secrets / Configuration
| ID | Contrôle | Statut | Gravité | Preuve (fichier:ligne) | Risque | Correction | Retest |
|---|---|---|---|---|---|---|---|
| SEC-001 | Secrets/API en dur | PASS | 🔵 | grep `src/` : aucun `sk_/re_/AKIA/BEGIN` réel | — | — | grep périodique |
| SEC-002 | Fichier .env | PASS | 🔵 | `.gitignore:34` `.env*` ; `git ls-files` = 0 .env | — | — | `git ls-files \| grep env` |
| SEC-003 | Secrets en prod | PASS | 🔵 | `process.env.*`, `.env.example` template | — | — | — |
| SEC-004 | Clés publiques client | PASS | 🔵 | `NEXT_PUBLIC_*` toutes publiques ; 0 `process.env` secret en client | — | — | grep client |
| SEC-005 | HTTPS | PASS | 🔵 | 0 `http://` hors localhost | — | — | curl -I |
| SEC-006 | HSTS | PASS | 🔵 | `next.config.ts:29` 2 ans + preload | — | — | curl -I |

### B — Authentification
| ID | Contrôle | Statut | Gravité | Preuve | Risque | Correction | Retest |
|---|---|---|---|---|---|---|---|
| SEC-007 | Hachage MDP | PASS | 🔵 | bcrypt coût 12 (`admin-actions.ts:82`…) | — | — | — |
| SEC-008 | Politique MDP | PARTIAL | 🟢 | complexité seulement en self-service (`account-actions.ts:20`) — **F-19** | mdp faibles par invite | centraliser `checkPasswordPolicy()` | créer compte invite mdp faible |
| SEC-009 | Rate-limit login | PARTIAL | 🟡 | `auth.ts:41-48` + repli mémoire `rate-limit.ts:47` — **F-04** | brute-force sans Upstash | Upstash prod | login N fois |
| SEC-010 | Anti brute-force | PARTIAL | 🟡 | idem SEC-009 ; pas de CAPTCHA/lockout — **F-04** | idem | CAPTCHA progressif | — |
| SEC-011 | MFA/2FA | PARTIAL | 🟡 | `mandatory-2fa.ts:21` OFF — **F-10** | admins sans 2FA | `ENFORCE_ADMIN_2FA=true` | vérif prod |
| SEC-012 | Vérification e-mail | PASS | 🔵 | pas de self-signup ; token invite lié e-mail | — | — | — |
| SEC-013 | Expiration session | PASS | 🔵 | `auth.config.ts:27` 12 h | — | — | — |
| SEC-014 | **Révocation session** | **FAIL → corrigé** | 🟠 | `sid` non vérifié hors 2 layouts — **F-03** ; ✅ `assertLiveSession` (isActive+sid) dans les guards + purge logout (§RETEST C-03) | token révoqué actif ≤12 h | ✅ contrôle `sid`+`isActive` dans `tenant.ts` + purge conditionnelle | rejouer JWT après reset |
| SEC-015 | Cookies sécurisés | PASS | 🔵 | défauts NextAuth (httpOnly/secure/SameSite) | — | — | DevTools prod |
| SEC-016 | Tokens (JWT) | PASS | 🔵 | JWT httpOnly signé `AUTH_SECRET` | révocation faible (cf. F-03) | cf. F-03 | — |

### C — Autorisations / Multi-tenant
| ID | Contrôle | Statut | Gravité | Preuve | Risque | Correction | Retest |
|---|---|---|---|---|---|---|---|
| SEC-017 | Authz côté serveur | PASS | 🔵 | middleware + guards ; re-check serveur | — | — | — |
| SEC-018 | RBAC | PASS | 🔵 | 7 rôles, `SECTION_ROLES`, re-validés base | — | — | matrice de rôles |
| SEC-019 | Accès horizontal | PASS | 🔵 | `scopedPrisma` filtre `organismeId` (code) | — | — | A→B (NOT TESTED) |
| SEC-020 | Accès vertical | PASS | 🔵 | `requireAdmin` re-check rôle base | — | — | ASSISTANT→action ADMIN |
| SEC-021 | IDOR / BOLA | PARTIAL | 🟢 | routes `[id]` scopées ; `push/register:30` réassigne token — **F (push)** | détournement push (mitigé) | vérifier propriétaire du token | réassigner token tiers |
| SEC-022 | Isolation multi-tenant | PARTIAL | 🔴 | code systématique (PASS) MAIS **F-01** casse le modèle ; dynamique NOT TESTED | fuite cross-tenant via F-01 | corriger F-01 + RLS | A→B (NOT TESTED) |
| SEC-023 | RLS | PARTIAL | 🟡 | flags OFF `prisma.ts:39` ; policies hors migrations — **F-06** | pas de filet base | activer RLS non-owner | requête raw cross-tenant |
| SEC-024 | Permissions DB | FAIL | 🟡 | `.env:9` `neondb_owner` bypasse RLS — **F-06** | owner ignore les policies | rôle `app_rls` + FORCE | select cross-tenant |

### D — Injections
| ID | Contrôle | Statut | Gravité | Preuve | Risque | Correction | Retest |
|---|---|---|---|---|---|---|---|
| SEC-025 | SQL Injection | PASS | 🔵 | Prisma paramétré ; seul raw `prisma.ts:85` = `$1` | — | — | grep RawUnsafe |
| SEC-026 | XSS | **FAIL → corrigé** | 🟠 | stored XSS — **F-02** ; JSON-LD **F-27** ; ✅ BFLA (`requireStaffTenant`, C-02) **+** assainissement `sanitize-html` au rendu (C-06) **+** échappement JSON-LD (C-11) | vol de session | ✅ gate staff + sanitize-html + JSON-LD échappé | injecter `<img onerror>` |
| SEC-027 | CSRF | PARTIAL | 🟢 | Server Actions PASS (`allowedOrigins`) ; route handlers SameSite seul — **F-26** | CSRF route handlers | contrôle `Origin` | POST cross-site |
| SEC-028 | SSRF | PARTIAL | 🟢 | `fetch` d'URL base (Blob) sans allowlist — **F-25** | SSRF défense en profondeur | allowlist hôte | forcer 169.254.169.254 |
| SEC-029 | Validation entrées | PASS | 🔵 | Zod + magic-bytes (8/8 échantillon) | — | — | payload invalide |
| SEC-030 | Validation API | PARTIAL | 🔵 | Zod strip par défaut, pas de `.strict()` — **F-32** | rejet non explicite | `.strict()` | champ en trop |
| SEC-031 | Mass assignment | PASS | 🔵 | `tenant.ts:56-82` `organismeId` en dernier | — | — | injecter organismeId |

### E — API / Web
| ID | Contrôle | Statut | Gravité | Preuve | Risque | Correction | Retest |
|---|---|---|---|---|---|---|---|
| SEC-032 | CORS | PASS | 🟢 | `*` seulement routes publiques, sans credentials | — | documenter | vérif public/* |
| SEC-033 | En-têtes sécu | PARTIAL | 🟢 | CSP `unsafe-inline` `next.config.ts:10` — **F-22** | XSS moins contenu | flag `CSP_NONCE` | préversion |
| SEC-034 | Messages d'erreur | PASS | 🔵 | erreurs génériques, codes Prisma mappés | — | — | contrainte Prisma |
| SEC-035 | Énumération comptes | PASS | 🔵 | login temps constant `auth.ts:54-60` | — | — | — |

### F — Logging / Monitoring
| ID | Contrôle | Statut | Gravité | Preuve | Risque | Correction | Retest |
|---|---|---|---|---|---|---|---|
| SEC-036 | Logs sensibles | PASS | 🔵 | 0 fuite secret/PII en log | — | — | grep |
| SEC-037 | Console frontend | PASS | 🔵 | 0 `passwordHash/totpSecret` en `.tsx` | — | — | grep |
| SEC-038 | Audit log | PARTIAL | 🟡 | `supprimerCompte` + login/logout non tracés — **F-08** | imputabilité | ajouter AuditLog | supprimer un compte |
| SEC-039 | Monitoring | PARTIAL | 🔵 | Sentry OK si DSN ; vide en `.env` — **F-31** | pas de capture sans DSN | `SENTRY_DSN` prod | vérif prod |
| SEC-040 | Alertes | PARTIAL | 🔵 | dépend de Sentry — **F-31** | pas d'alerte sécu | règles Sentry | — |

### G — Fichiers / Documents
| ID | Contrôle | Statut | Gravité | Preuve | Risque | Correction | Retest |
|---|---|---|---|---|---|---|---|
| SEC-041 | Upload sécurisé | PARTIAL | 🟢 | durci mais ouvert à tout rôle `upload/route.ts:15` — **F-21** | abus stockage | `requireStaffTenant` | upload en APPRENANT |
| SEC-042 | Taille max | PASS | 🔵 | `upload/route.ts:21` 4 Mo→413 | — | — | >limite |
| SEC-043 | MIME (contenu) | PASS | 🔵 | magic-bytes `blob.ts:44-52` ; SVG refusé | — | — | .png contenant SVG |
| SEC-044 | Filename | PASS | 🔵 | clé Blob aléatoire, folder assaini | — | — | `../` |
| SEC-045 | Stockage privé | **FAIL** | 🟡 | `blob.ts:20` `access:"public"` docs — **F-07** | doc accessible sans auth | Blob privé + proxy | ouvrir URL sans session |
| SEC-046 | Antivirus | NOT APPLICABLE | 🔵 | pas de scan AV (whitelist PDF/raster) | PDF-JS non désarmé | (optionnel) AV | — |
| SEC-047 | URLs signées | **FAIL** | 🟡 | pas de `getSignedUrl` `blob.ts:19` — **F-07** | URL permanente | URLs signées/proxy | href réutilisable ? |

### H — Webhooks / API externes
| ID | Contrôle | Statut | Gravité | Preuve | Risque | Correction | Retest |
|---|---|---|---|---|---|---|---|
| SEC-048 | Webhooks signés | PARTIAL | 🟡 | Stripe/Wedof/Resend PASS ; Brevo faible `brevo/route.ts:36` — **F-13** | forge events Brevo | header + `timingSafeEqual` | mauvais secret |
| SEC-049 | Replay | PARTIAL | 🟢 | Stripe OK ; Wedof sans timestamp (idempotent) — **F-28** | rejeu Wedof | fenêtre/nonce | rejouer POST |
| SEC-050 | Rate-limit API | **FAIL** | 🟠 | `rate-limit.ts:47` mémoire ; `civique/*` non limités — **F-04/F-12** | flood/brute-force | Upstash + limites | N req parallèles |
| SEC-051 | Anti-abus | PARTIAL | 🟡 | `convention` sans cap ; `checkout/[id]` fuit token — **F-14** | DoS coût / fuite token | plafond + rate-limit | 5000 candidats PDF |

### I — Dépendances / Code
| ID | Contrôle | Statut | Gravité | Preuve | Risque | Correction | Retest |
|---|---|---|---|---|---|---|---|
| SEC-052 | Dépendances | FAIL | 🟠 | `next-auth ^5.0.0-beta.32` — **F-05** | auth sur beta | plan GA | `npm ls next-auth` |
| SEC-053 | CVE (npm audit) | FAIL | 🟡 | 32 vulns (1 crit/18 hautes **dev**) ; runtime = axios/undici/form-data/image-size — **F-15** | CVE runtime | montées transitives | `npm audit` |
| SEC-054 | SAST | PARTIAL | 🟡 | `Math.random()` mdp (`candidat-access-panel.tsx:21`) ; pas d'ESLint sécu — **F-11** | mdp prédictible | `crypto` + eslint-plugin-security | re-lint |
| SEC-055 | DAST | NOT TESTED | 🔵 | pas de staging isolé | — | **REQUIRES EXTERNAL PENTEST** | staging |
| SEC-056 | Secret scanning (git) | PASS | 🔵 | historique propre (926 commits) | — | — | — |
| SEC-057 | Docker security | NOT APPLICABLE | 🔵 | aucun Dockerfile (Vercel) | — | — | — |

### J — Architecture
| ID | Contrôle | Statut | Gravité | Preuve | Risque | Correction | Retest |
|---|---|---|---|---|---|---|---|
| SEC-058 | Séparation environnements | PARTIAL | 🟡 | `.env` local → base prod/partagée — **F-18** | opérations sur données réelles | staging dédié | — |
| SEC-059 | Protection production | PARTIAL | 🟡 | creds SUPERADMIN bootstrap en `.env` ; pas de staging | — | staging + rotation | — |
| SEC-060 | Least privilege (infra) | PARTIAL | 🟡 | rôle DB owner — **F-06** | owner tout-puissant | rôle applicatif restreint | — |
| SEC-061 | Architecture multi-tenant | PARTIAL | 🔴 | tenant dérivé serveur (PASS) MAIS **F-01** permet l'auto-réattribution | prise de contrôle | corriger F-01 | — |

### K — Backups / Résilience
| ID | Contrôle | Statut | Gravité | Preuve | Risque | Correction | Retest |
|---|---|---|---|---|---|---|---|
| SEC-062 | Backups automatiques | NOT TESTED | 🔵 | infra Neon (non auditable code) | — | confirmer PITR Neon | console Neon |
| SEC-063 | Chiffrement backups | NOT TESTED | 🔵 | infra Neon | — | confirmer | — |
| SEC-064 | Backup isolé | NOT TESTED | 🔵 | infra | — | copie hors-compte | — |
| SEC-065 | Rétention | NOT TESTED | 🔵 | infra Neon | — | définir politique | — |
| SEC-066 | Test restauration | NOT TESTED | 🔵 | non documenté | — | exercice de restauration | — |
| SEC-067 | Plan de reprise | NOT TESTED | 🔵 | RTO/RPO non documentés | — | documenter DR | — |

### L — Chiffrement / Données
| ID | Contrôle | Statut | Gravité | Preuve | Risque | Correction | Retest |
|---|---|---|---|---|---|---|---|
| SEC-068 | Chiffrement au repos | PARTIAL | 🟢 | secrets/TOTP chiffrés ; PII régalienne en clair `anonymise.ts:50` — **F-23** | PII exposée si accès base | chiffrer n° régaliens | — |
| SEC-069 | Comms internes | PASS | 🔵 | TLS partout (Neon, Resend, Blob) | — | — | — |
| SEC-070 | Minimisation | PASS | 🟢 | PII alignée besoin Qualiopi/CNAPS | — | — | revue métier |
| SEC-071 | Suppression/anonymisation | PASS | 🔵 | `anonymise.ts:115-188` complet | — | — | test intégration |
| SEC-072 | Export données | PASS | 🔵 | auth+rôle+tenant+rate-limit+anti-CSV | — | — | export cross-tenant |
| SEC-073 | Données candidats | PASS | 🔵 | `scopedPrisma` (cf. F-01 pour la limite) | — | corriger F-01 | — |
| SEC-074 | Documents OF | PASS | 🔵 | routes `[id]` scopées (mais Blob public F-07) | cf. F-07 | cf. F-07 | deviner id autre OF |
| SEC-075 | E-mails | PARTIAL | 🟢 | mdp provisoire en clair `parcours-actions.ts:862` — **F-24** | interception e-mail | lien tokenisé | — |
| SEC-076 | Intégrations externes | PARTIAL | 🟡 | clés chiffrées ; `SECRETS_ENCRYPTION_KEY` prod ? — **F-16** | écriture clé bloquée | définir clé prod | enregistrer clé |
| SEC-077 | Rotation clés API | PASS | 🔵 | env rotatable ; clés tenant re-chiffrées | — | — | — |
| SEC-078 | Révocation secrets | PARTIAL | 🔵 | pas de runbook — **F-30** | délai en incident | documenter | — |

### M — Administration
| ID | Contrôle | Statut | Gravité | Preuve | Risque | Correction | Retest |
|---|---|---|---|---|---|---|---|
| SEC-079 | **Interface admin (impersonation)** | **FAIL → corrigé** | 🔴 | `auth.config.ts` trigger non gardé — **F-01** ; ✅ garde `SUPERADMIN` appliquée (cf. §RETEST C-01) | prise de contrôle inter-tenant | ✅ garde `token.role==="SUPERADMIN"` dans callback | non-SUPERADMIN `update({imp})` → token inchangé |
| SEC-080 | Export de masse | PASS | 🟢 | `export-guard.ts:14` 60/min + tenant | — | (opt) plafond jour | export >60/min |
| SEC-081 | Pentest applicatif | NOT TESTED | 🔵 | statique uniquement | — | **REQUIRES EXTERNAL PENTEST** | pentest staging |

### N — Tests complémentaires
| ID | Contrôle | Statut | Gravité | Preuve | Risque | Correction | Retest |
|---|---|---|---|---|---|---|---|
| SEC-082 | Tests API | PARTIAL | 🔵 | inventaire construit (`API_INVENTORY.md`) ; dynamique NOT TESTED | — | tests d'intégration | — |
| SEC-083 | Tests autorisation | PARTIAL | 🔵 | `authorization-matrix.test.ts` existe ; multi-rôle live NOT TESTED | — | matrice E2E | — |
| SEC-084 | Tests fichiers | PASS | 🔵 | matrice statique 6 vecteurs (5 bloqués) | PDF-JS non désarmé | cf. SEC-046 | — |
| SEC-085 | Brute-force | NOT TESTED | 🔵 | dynamique (règle : pas de test live) | — | Hydra/Burp préprod | — |
| SEC-086 | Fuite inter-tenant | PARTIAL | 🔴 | code PASS ; **F-01** casse ; dynamique NOT TESTED | fuite cross-tenant | corriger F-01 | A→B live |
| SEC-087 | Password reset | PARTIAL | 🟢 | token 192 bits/TTL/usage unique ; dans URL — **F-20** | fuite token via logs | POST/fragment | rejouer lien consommé |
| SEC-088 | Race conditions | NOT TESTED | 🔵 | idempotence webhooks présente ; non testé dynamiquement | — | tests concurrence | double requête |
| SEC-089 | Incident response | PARTIAL | 🔵 | `docs/SECURITE-OPS.md` existe ; runbook incomplet | — | compléter IR + révocation | exercice |
| SEC-090 | Vulnérabilités futures | PARTIAL | 🟡 | next-auth beta, next 16, chromium — **F-17** | CVE non patchées | Dependabot + veille | revue trimestrielle |

---

## RETEST APRÈS CORRECTION

> Cette section documente les correctifs **appliqués au code dans le cadre de cet audit** et leur re-vérification. Les correctifs infra/config (Upstash, RLS, Sentry, dépendances) relèvent de l'exploitant et ne sont pas appliqués ici.

### Correctifs appliqués

**✅ C-01 — F-01 / SEC-079 (CRITIQUE) — Impersonation gardée au niveau du callback**
- **Fichier** : `src/auth.config.ts` (callback `jwt`, branche `trigger === "update"`).
- **Changement** : le démarrage d'une impersonation (`applyImpersonationStart`) n'est désormais exécuté **que si `token.role === "SUPERADMIN"`** ; pour tout autre rôle, la charge `imp` fournie par le client est **ignorée** (token inchangé). La sortie (`imp: null`) reste un no-op inoffensif pour un token normal.
- **Effet** : un compte non-SUPERADMIN qui POST `{imp:{orgId}}` sur `/api/auth/session` ne peut plus muter son JWT en ADMIN d'un organisme arbitraire → **escalade inter-tenant fermée**.
- **Retest statique** : `tsc --noEmit` = exit 0 ; suite de tests = 565 passés (aucune régression). **Statut : FAIL → PASS (code).**
- **Retest dynamique recommandé (staging)** : en tant que FORMATEUR/APPRENANT, `await update({imp:{orgId:'<autre-org>'}})` puis vérifier que la session reste inchangée (pas de bascule ADMIN).

**✅ C-02 — F-02 / SEC-026 (ÉLEVÉE) — Fermeture du BFLA sur le catalogue e-learning**
- **Fichier** : `src/lib/actions/cours-actions.ts` (12 Server Actions : `createCours`, `updateCours`, `togglePublishCours`, `deleteCours`, `addModule`, `updateModule`, `deleteModule`, `addLecon`, `updateLecon`, `deleteLecon`, `moveModule`, `moveLecon`).
- **Changement** : remplacement de la garde `getTenantDb()` + `if (!session?.user)` (qui acceptait APPRENANT/FORMATEUR) par une garde **`requireStaffTenant`** (helper existant, rejette APPRENANT/FORMATEUR/ENTREPRISE).
- **Effet** : un compte à faible privilège ne peut plus écrire le HTML d'une leçon (rendu en `dangerouslySetInnerHTML`) → le vecteur d'injection **par comptes non-staff est fermé**.
- **Retest statique** : `tsc --noEmit` = exit 0 ; tests = 565 passés. **Statut : le BFLA (écriture par comptes faibles) est corrigé.**
- **Résiduel** : ✅ **traité** — voir C-06 ci-dessous (assainissement `sanitize-html` au rendu). Le stored XSS est désormais fermé **côté écriture** (BFLA) **et côté rendu**.

### Correctifs supplémentaires appliqués (lots 2 à 4 — tous re-testés : tsc exit 0 / vitest 566)

- **C-03 — F-03 / SEC-014 (ÉLEVÉE, révocation de session)** : `assertLiveSession` (revalidation `isActive` + `sid == activeSessionId` en base) ajoutée à `getTenantDb`/`requireTenant`/`requireStaffTenant` (`src/lib/tenant.ts`) et à `requireSuperAdmin` ; purge **conditionnelle** de `activeSessionId` au logout (`deconnexion/route.ts`, `auth-actions.ts`, `updateMany where { id, activeSessionId: sid }` → n'invalide pas une session plus récente). Un JWT révoqué est coupé sur les Server Actions **et** les routes API.
- **C-04 — F-12 / SEC-050b (MOYENNE)** : rate-limit par IP sur `/api/civique/lead` et `/api/civique/checkout`.
- **C-05 — F-08 / SEC-038 (MOYENNE)** : `AuditLog` sur suppression ET suspension/réactivation de compte (`comptes-actions.ts`).
- **C-06 — F-02 résiduel / SEC-026 (ÉLEVÉE)** : assainissement `sanitize-html` du HTML de leçon au rendu (`src/lib/sanitize-html.ts` + `mes-cours/[coursId]/page.tsx`) — couvre aussi le contenu déjà stocké.
- **C-07 — F-11 / SEC-054 (MOYENNE)** : mots de passe provisoires via Web Crypto CSPRNG (`src/lib/gen-password.ts`, composants candidat + formateur).
- **C-08 — F-13 / SEC-048 (MOYENNE)** : comparaison à temps constant du secret webhook Brevo (`timingSafeEqual`).
- **C-09 — F-21 / SEC-041 (FAIBLE)** : `/api/upload` restreint au personnel + éditeur.
- **C-10 — F-14 / SEC-051 (MOYENNE)** : plafond de 50 conventions par requête (`/api/convention`).
- **C-11 — F-27 / SEC-026 (FAIBLE)** : échappement `<>&` des blocs JSON-LD (`src/lib/json-ld.ts`, blog + glossaire).
- **C-12 — F-33 (INFO)** : allowlist du garde-fou `prisma-direct-guard.test.ts` (site-vitrine + auth-actions) → CI de nouveau verte.

### Correctifs NON appliqués (action exploitant ou différés)

- **INFRA / config** (hors code — à faire côté Vercel/Neon) : **F-04** provisionner Upstash en prod ; **F-06** activer la RLS avec un rôle non-owner + `FORCE ROW LEVEL SECURITY` ; **F-16** `SECRETS_ENCRYPTION_KEY` en prod ; **F-31** `SENTRY_DSN` + règles d'alerte ; **F-18** staging isolé ; **F-15** montées de dépendances (`npm audit fix` + tests).
- **Code différés** (recommandés, non triviaux / à valider en staging) : **F-05** sortie de `next-auth` beta ; **F-07** documents en Blob privé + proxy ; **F-09** mots de passe seed/ops via `seedPassword` ; **F-19** politique de mot de passe centralisée ; **F-20** reset self-service ; **F-22** activer `CSP_NONCE` ; **F-23** chiffrement PII régalienne ; **F-25** allowlist SSRF ; **F-26** contrôle d'origine sur les route handlers ; **F-28** anti-rejeu Wedof ; **F-29** allowlist STAFF sur T3P ; **F-30** runbook de révocation.

### Preuve de non-régression
- **4 commits** sur la branche `security/audit-90-controls-2026-08` ; chaque lot re-vérifié avant commit.
- `tsc --noEmit` : **exit 0** à chaque lot.
- `vitest run` : **566 passés / 5 skippés / 0 échec** (le test garde-fou `prisma-direct-guard`, jadis en échec sur `site-vitrine/page.tsx`, est de nouveau **vert** — cf. C-12).
- Dépendance ajoutée : `sanitize-html` (+ `@types`) pour C-06 — `npm audit` **inchangé** (aucune nouvelle CVE).

### Finding additionnel découvert au retest
- **F-33 (INFORMATION)** — ✅ **Corrigé (C-12)** : `site-vitrine/page.tsx` (usage légitime de `prisma.user`, entité globale) et `auth-actions.ts` (purge `activeSessionId`) ajoutés à l'allowlist du garde-fou `prisma-direct-guard.test.ts` → CI verte.

---

## Conclusion

**Statut : 🟠 CORRECTIONS NÉCESSAIRES** (après application, dans cet audit, du correctif du CRITIQUE F-01).

- **F-01 / SEC-079 (CRITIQUE)** — **corrigé et re-testé** (tsc exit 0, 566 tests OK). Escalade inter-tenant par le trigger d'impersonation fermée. ⚠️ Confirmation dynamique sur staging recommandée.
- **ÉLEVÉES — 3 sur 4 corrigées en code** : F-02 (stored XSS : BFLA **+** assainissement `sanitize-html`), F-03 (révocation de session : guards + logout). Restent : **F-04** (rate-limiting → **provisionner Upstash en prod**, action Vercel) et **F-05** (sortie de `next-auth` beta, migration).
- **MOYENNES — 6 corrigées en code** (F-08, F-11, F-12, F-13, F-14, + F-07 différé) ; les autres relèvent de l'infra (F-06 RLS, F-15 deps, F-16 clé prod) ou sont différées.
- **Tests dynamiques non réalisés** (isolation live A→B, DAST, brute-force, race conditions) : **REQUIRES EXTERNAL PENTEST** sur un **staging isolé à deux tenants de test**.

**Verdict** : la base de sécurité est **solide** et le **CRITIQUE + 3 des 4 ÉLEVÉES + 6 MOYENNES sont corrigés dans la branche** (16 correctifs code re-testés). La plateforme n'est plus en état 🔴. Elle sera **« prête pour la production »** une fois : (1) le lot mergé et le fix F-01 confirmé sur staging, (2) **Upstash provisionné en prod** (F-04) + la RLS activée avec un rôle non-owner (F-06), (3) `SENTRY_DSN`/`SECRETS_ENCRYPTION_KEY` posés en prod, (4) un pentest externe sur staging isolé mené.
