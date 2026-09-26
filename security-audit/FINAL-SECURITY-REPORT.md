# OFManager — Rapport d'audit de sécurité (pré-commercialisation)

- **Cible** : OFManager COMMERCIAL, prod `ofmanager.info` — code `origin/main @ 7a198cd` (PR #53, 2026-09-18)
- **Type** : white-box (revue de code), statique-first, non destructif — aucune attaque contre la prod
- **Méthode** : cartographie inline + fouille multi-agents (15 dimensions, 67 agents) + **vérification adversariale** de chaque finding
- **Date** : 2026-09-25
- **Résultat** : 52 findings bruts → **44 retenus** (1 blocker, 15 high/medium, 28 hardening) après élimination de **8 faux positifs**

## Executive Summary

OFManager est un SaaS multi-tenant **mûr et délibérément durci** : plusieurs vagues d'audit antérieures (SEC-\*, P1–P3, A05, A08, A12, ARC-02) ont laissé des traces solides — cloisonnement `scopedPrisma`, gardes `requireStaffTenant`/`assertLiveSession`, 2FA TOTP, révocation de session, en-têtes de sécurité complets, chiffrement des secrets tenant, anti-énumération.

**La priorité absolue — l'isolation entre organismes de formation — est SAINE.** Aucune fuite cross-tenant, aucune SQLi, aucun secret de production exposé, aucune escalade vers SUPERADMIN, la console éditeur est re-gardée au niveau handler. Le socle tient.

Le risque résiduel tient en **deux points saillants + un motif racine** :

1. **BLOCKER — XSS stockée via `photoUrl`** (OFM-03). La photo candidat, injectée dans un `<img>` de gabarit **sans échappement** (variable « de confiance ») et validée seulement par `startsWith("data:image/")`, permet une charge `onerror`. Chemin : formulaire de parcours **public** → rendu dans la **session d'un ADMIN** (vol de session) et dans le **Chromium de génération PDF sans CSP** (SSRF côté serveur). Le validateur strict adéquat (`isValidSignatureDataUrl`) **existe déjà** mais n'est pas branché ici.

2. **HIGH — BFLA côté client B2B `ENTREPRISE`** (OFM-01…10). C'est le **motif racine** : le rôle `ENTREPRISE`, ajouté récemment lors du portage du portail B2B, n'a pas été propagé dans toutes les gardes de Server Actions. 7 fichiers d'actions utilisent une garde faible (`if(!session?.user)` + `getTenantDb()`, ou un `requireUser()` qui ne rejette qu'`APPRENANT`/`FORMATEUR`) au lieu de `requireStaffTenant()`. Un client B2B externe authentifié peut alors déclencher des mutations de gestion **dans le tenant de l'OF hôte** : gérer les clients pro, altérer des fiches formateur (PII), modifier les indicateurs Qualiopi, publier du contenu vitrine, reconfigurer les tests de positionnement. **Aucune fuite inter-tenant** (le scope reste l'OF de l'attaquant), mais écriture non autorisée par un tiers externe.

3. **Composants** : `next@16.3.1` porte un advisory **critique** (RCE AVIF/Windows, GHSA-2xp9-vwfh-vxw4 / GHSA-p293-qw3h-jr36), **corrigé par le simple bump patch `16.3.3`**. Fortement atténué en prod (optimiseur d'images managé par Vercel, pas de `remotePatterns`, upload qui refuse l'AVIF), mais à traiter promptement par hygiène.

**Recommandation go-live** : corriger OFM-03 (blocker) et le motif racine BFLA + le bump `next` **avant** commercialisation grand public ; le reste (medium/hardening) en fast-follow. Ce sont des correctifs **ciblés et sûrs**, pas une refonte.

## Scope

- **In-scope** : dépôt `capsolutionsdev-jpg/OF-MANAGER` @ `7a198cd`, toute la surface applicative (Server Actions, route handlers, auth, tenant, PDF, webhooks, crons, exports), dépendances de production.
- **Out-of-scope** : test dynamique destructif sur la prod, infra Vercel/Neon managée, confiance envers l'éditeur SUPERADMIN, application mobile Capacitor (wrapper), pentest réseau.

## Attack Surface (rappel)

~90 route handlers, ~93 fichiers de Server Actions, flux publics tokenisés (parcours, signature, satisfaction…), API publiques (`api/public/*`, `api/civique/*`, `api/lead`, `api/demo`), webhooks (Stripe/Brevo/Resend/Wedof), 7 crons, upload/download (Vercel Blob), génération PDF (Chromium). Détail : `00-architecture.md`.

## Findings par sévérité

Voir `FINDINGS.md` (tableau + 3 catégories) et `findings-raw.json` (détail complet : description, exploit, repro, raisonnement de vérification). Synthèse :

### BLOCKER (1)
- **OFM-03 — XSS stockée `photoUrl`** — `src/lib/documents/resolve.ts:84` (+ écritures `parcours-actions.ts:262`, `candidat-actions.ts:57`, `prospect-actions.ts:270`). Vol de session staff + SSRF PDF.

### HIGH / MEDIUM à corriger rapidement (15)
- **Motif racine BFLA `ENTREPRISE`/non-staff** — `client-pro-actions.ts` (OFM-01, HIGH), `formateur-actions.ts`, `article-actions.ts`/`photo-vitrine-actions.ts`, `qualiopi/t3p/registre`, `validation-actions.ts` (via `permissions.ts:63`), `positionnement-actions.ts`, `contrat-formateur`/`compte-rendu`. Correctif : `requireStaffTenant()` (+ check section quand ASSISTANT doit être exclu).
- **OFM-02 — `next@16.3.1`** advisory critique → bump `16.3.3`.
- **OFM-11 — Contournement `assertLiveSession()`** sur actions à garde inline (`document-actions.ts`, `manual-send-actions.ts`…) : session révoquée/tenant suspendu encore actif.
- **OFM-12 — Fuite de stack trace** en prod — `parcours/[token]/documents/route.ts:49`.
- **OFM-13 — XSS signatures data-URL** dans les PDF (même cause que OFM-03, impact PDF).
- **OFM-14 — Injection de formule CSV** export comptable — `src/lib/compta/exports-compta.ts:138` (+ FEC).
- **OFM-15 — Exports de masse PII non tracés** (AuditLog) — `candidats/export`, `administration/export`.
- **OFM-16 — Effacement RGPD incomplet** — `EmailLog`/`SmsLog` conservent e-mail + corps après anonymisation.
- **OFM-18 — `entrepriseId` de devis non vérifié** (défense en profondeur).
- **OFM-20 — SSRF PDF latent** (Chromium egress non filtré).

### HARDENING (28)
Voir `FINDINGS.md`. Points notables : token invitation entreprise en clair (OFM-19), Blob PII public (OFM-21), CORS `*` civique, anti-rejeu webhook Wedof, idempotence paiement/provisioning, Cache-Control PDF privés, quota sièges TOCTOU, sur-lecture `include:{user:true}` sur AuditLog.

## Multi-Tenant Isolation
**PASS.** `scopedPrisma` injecte/filtre/vérifie `organismeId` sur toutes les opérations ; `organismeId` client non écrasable (placé après le payload) ; route handlers à risque vérifiés (dossier PDF, factures éditeur, exports). Aucun IDOR/BOLA inter-organismes confirmé. Réserve mineure : relations imbriquées (`connect`/`set`) non re-scopées (ids cuid non devinables → risque faible).

## Authentication
**PASS (avec réserve).** Rate-limit e-mail+IP, 2FA TOTP (secret chiffré), anti-énumération (bcrypt à vide), révocation de session (`activeSessionId`/`sid`), JWT 12 h. Réserve : token d'invitation entreprise stocké en clair (incohérent avec le reset haché).

## Authorization
**FAIL (motif racine).** Confinement URL correct ; matrice `SECTION_ROLES` centralisée. Mais l'autorisation **par action-ID** (Server Actions) laisse passer `ENTREPRISE`/non-staff sur ~10 actions de gestion (BFLA). C'est le chantier principal.

## API Security
**PARTIAL.** BOLA maîtrisé (scoping) ; BFLA = le trou ; CORS `*` sur l'API civique d'écriture ; endpoint `pdf-test` de debug à retirer ; ressources civiques non bornées.

## Application Security
**PARTIAL.** XSS `photoUrl`/signatures (validateur strict à généraliser), injection de formule CSV, stack trace en prod. Pas de SQLi ni d'exécution de commande.

## Dependency Security / Supply Chain
**PARTIAL.** `next@16.3.1` critique → `16.3.3`. Transitifs (axios, image-size, sharp, form-data) essentiellement hors chemin requête (firebase-admin, build-time) — sauf `html-to-docx` (chemin DOCX étroit). Aucun script d'installation malveillant. **Ne pas** suivre le downgrade `prisma@6.12.0` proposé par `npm audit` (régressif).

## Infrastructure
Vercel (edge middleware + serverless) + Neon Postgres. HSTS preload, `poweredByHeader` off, source maps prod off. Sauvegarde offsite chiffrée (age→S3) présente mais inerte tant que `BACKUP_ENABLED≠true`. RLS Postgres disponible mais OFF (couche appli active). Rate-limit partagé (Upstash) recommandé en prod.

## Privacy / Sensitive Data
**PARTIAL.** Chiffrement au repos des secrets tenant OK ; effacement RGPD incomplet (EmailLog/SmsLog) ; exports de masse de données de santé (« Handicap déclaré », art. 9) non tracés ; PII candidat sur Blob public (protection = secret de l'URL).

## OWASP Mapping
Voir `OWASP-MAPPING.md` (Top 10:2021, API Top 10:2023, ASVS 5.0).

## Remediation Plan (ordre recommandé)

1. **OFM-03** (blocker) : brancher `isValidSignatureDataUrl` (ou variante photo) sur les 3 écritures de `photoDataUrl` **et** échapper au rendu (`resolve.ts:84`). + OFM-13 (mêmes validateurs sur signatures).
2. **Motif racine BFLA** : remplacer les gardes faibles par `requireStaffTenant()` (+ check section) dans les ~10 fichiers ; corriger `permissions.ts:63`. Ajouter un **test de non-régression** qui échoue si une action de gestion n'emploie pas une garde staff.
3. **OFM-02** : `npm i next@^16.3.3`, régénérer le lockfile, redéployer.
4. **OFM-11** : router toutes les gardes inline vers `requireStaffTenant()` (qui appelle `assertLiveSession`).
5. **OFM-12** : masquer stack trace en prod (`NODE_ENV`), aligner sur `pdf-test`.
6. **OFM-14** : utiliser `esc` (préfixe apostrophe) dans `csvCell` (compta/FEC).
7. **OFM-15** : `auditLog.create(EXPORT_*)` sur les exports de masse.
8. **RGPD (OFM-16)** : effacer `EmailLog`/`SmsLog` (corps + destinataire) dans `anonymiseCandidatComplet`.
9. Hardening : token invitation haché, Blob privé + URL signée, CORS civique allow-list, anti-rejeu Wedof, idempotence paiement/provisioning.

## Residual Risks
- CSP `unsafe-inline` (nonce optionnel non activé) : atténuation défense-en-profondeur possible (`CSP_NONCE=true`) après vérif navigateur.
- Rate-limit mémoire par-instance si Upstash non configuré en prod.
- SSRF PDF latent : à durcir (interception de requêtes Chromium / allow-list) même sans exploit actuel.

## Production Go-Live Recommendation
**GO conditionnel.** Le produit est architecturalement sain et l'isolation multi-tenant — le risque existentiel d'un SaaS — est solide. **Bloquants avant ouverture grand public** : OFM-03 (XSS), le motif racine BFLA, et le bump `next@16.3.3`. Le reste (medium/hardening) en fast-follow sous 2–4 semaines. Effort estimé des bloquants : faible (correctifs ciblés, primitives déjà présentes dans le code).
