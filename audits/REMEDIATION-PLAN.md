# PLAN DE REMÉDIATION & MISE EN CONFORMITÉ — OFMANAGER
## Suite aux audits 05 (Multi-tenant) et 02 (Juridique/RGPD)

**Date :** 2026-08-26 · **Base :** `security/audit-90-controls-2026-08` @ `a23ae3a` · **Branche de travail :** `fix/remediation-audits-05-02`
**Principe :** correctifs **tenant-agnostiques** (toute la plateforme), un lot fini et vérifié (`tsc`) avant le suivant, **aucun merge/push sans feu vert**. Les changements de **schéma** (migration sur base Neon partagée) et les **décisions juridiques/business** sont isolés en fin de plan (« À toi »).

---

### Répartition

| # | Lot | Findings couverts | Type | Qui | Statut |
|---|---|---|---|---|---|
| **R1** | Isolation P0 (audit 05) | A05-001, A05-002, A05-009, A05-003, A05-004, A05-018 | Code | 🤖 Auto | ✅ Fait (`4fe9f6a`) |
| **R2** | Cloisonnement — durcissement (audit 05) | A05-006, A05-013, A05-012, A05-017, A05-007 | Code + config | 🤖 Auto | ✅ Fait (`25f0b44`) |
| **R3** | RGPD — implémentation (audit 02) | A02-014, A02-015, A02-007, A02-008, A02-019 | Code | 🤖 Auto | ✅ Fait (`285539b`) |
| **R4** | RGPD — documentaire (audit 02) | A02-003, A02-004, A02-022, A02-010 | Contenu | 🤖 Auto | ✅ Fait (`dc287ea`) |
| **U1** | Schéma & migrations | A05-005, A05-014, A05-019, A02-016 | Schéma+migration | 👤 Toi (db push) | 📋 Plan |
| **U2** | Transferts hors UE | A02-001 | Décision fournisseur/DPF | 👤 Toi | 📋 Plan |
| **U3** | Identité & corpus juridique | A02-002, A02-005, A02-006, A02-018, A02-021, align. CGV | Juridique/business | 👤 Toi | 📋 Plan |
| **U4** | Blob privé (accès signé) | A02-009, A05-012(compl.) | Code à risque | 🤝 À valider ensemble | 📋 Plan |

> **Vérification globale (2026-08-26) :** `tsc --noEmit` OK · suite de tests **567 passés / 0 échec** · ESLint 0 erreur · garde-fou d'isolation 3/3. Branche `fix/remediation-audits-05-02` (5 commits), **non poussée** — en attente de ton feu vert pour push + PR.

---

## LOTS AUTONOMES (🤖)

### R1 — Isolation P0
- **A05-001 🔴** `runAutomations()` → param `orgId` ; `runAutomationsNow` le passe (org de session). Cron inchangé (global). *Fichiers :* `lib/automation-engine.ts`, `lib/actions/automation-actions.ts`.
- **A05-002 🔴 / A05-009 🟡** `civique/lead` + `civique/checkout` → ne plus lire `body.organismeId` ; org = `CIVIC_ORGANISME_ID` (env) uniquement, sinon refus 400. *Fichiers :* `app/api/civique/{lead,checkout}/route.ts`.
- **A05-003 🟠** `/inscription` → scoper par `organismeScope(req)` (host/`?organisme=`) ; sans org → page vide. *Fichier :* `app/inscription/page.tsx`.
- **A05-004 🟠** `createInscription` → revérifier appartenance `candidatId`/`sessionId` avant `create`. *Fichier :* `lib/actions/inscription-actions.ts`.
- **A05-018 🟡** `t3p`/`validation` → revalider `candidatId` (client scopé). *Fichiers :* `lib/actions/{t3p,validation}-actions.ts`.

### R2 — Durcissement cloisonnement
- **A05-006 🟠 / A05-013 🟡** vérifier `org.statut === SUSPENDU` dans `assertLiveSession` (tenant.ts) + planifier `suspend-trials` (vercel.json).
- **A05-012 🟡** `upload` → préfixer le dossier blob par `organismeId`.
- **A05-017 🟡** `formations-config-actions` → `requireSuperAdmin()`.
- **A05-007 🟠** étendre `prisma-direct-guard.test.ts` à `app/**` + `lib/**` (liste blanche annotée).

### R3 — RGPD (code)
- **A02-014 🟡** retirer l'IP des logs (`api/verification`).
- **A02-015 🟡** anonymisation : remettre `situationHandicap=false`.
- **A02-007 🟠** effacement : étendre `anonymiseCandidatComplet` aux tables PII restantes + blobs.
- **A02-008 🟠** cron de purge des `EmailLog`/logs selon la matrice.
- **A02-019 🟡** mention RGPD + lien politique sous les formulaires publics.

### R4 — RGPD (documentaire)
- **A02-003 🟠** réécrire la politique de confidentialité (liste nominative des sous-traitants + transferts hors UE + garantie).
- **A02-004 🟠** compléter `sous-traitants-ulterieurs.md` + DPA §6 (Resend, OpenAI, YouSign, Vercel Blob, Sentry, Turnstile).
- **A02-022 🟡** corriger la sur-affirmation « RLS prête » (dossier de conformité).
- **A02-010 🟠** créer un canevas d'AIPD (`legal/AIPD-modele.md`).
- Aligner la page CGV sur la source (retirer « le cas échéant »).

---

## À TOI (👤) — nécessite une décision ou un accès que je n'ai pas

- **U1 · Schéma/migrations (base Neon partagée)** : FK `organismeId → Organisme onDelete:Cascade` (A05-005), routine de suppression tenant (A05-014), `@@index([organismeId])` sur `User` (A05-019), `DataRequest.dueDate/candidatId` (A02-016). → **Je peux préparer le diff `schema.prisma` + le script**, mais le `prisma db push` doit être fait par toi (pas d'auto-push, base partagée).
- **U2 · Transferts hors UE (A02-001)** : trancher — soit **imposer Brevo (UE)** en prod (retirer `RESEND_API_KEY`), soit **signer les CCT/DPF** de Resend/OpenAI/Anthropic. Décision business + accès prod.
- **U3 · Identité & juridique (A02-002/005/006/018/021)** : immatriculer **CAP SOLUTIONS** (SIREN/RCS/TVA), désigner un **contact RGPD/DPO**, faire valider le corpus par un avocat, trancher la **base légale art. 9** (handicap). Je fige les placeholders dès que tu me donnes les valeurs.
- **U4 · Blob privé (A02-009)** : passer les pièces sensibles (photos d'identité, signatures) en accès **privé + URL signée**. Changement d'accès à **valider ensemble** (impacte l'affichage des documents) — je le prépare sur demande.

---

## Vérification & confirmations attendues
- Chaque lot : `tsc --noEmit` + `eslint` OK avant commit (jamais `next build` avec le dev lancé).
- **3 valeurs de prod à me confirmer** (figent des gravités) : `RLS_ENABLED` (attendu `false`), `CIVIC_ORGANISME_ID` (doit être défini), `RESEND_API_KEY` actif + statut DPF des sous-traitants US.
