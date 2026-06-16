# Cloisonnement multi-tenant — état de sécurité (Phase 0-C)

Objectif : aucune donnée d'un organisme (OF) ne doit être visible/modifiable par un autre.
Mécanisme : `organismeId` sur tous les modèles + client Prisma cloisonné `src/lib/tenant.ts`
(`getTenantDb()` / `requireTenant()`), qui injecte automatiquement le `organismeId` du tenant
de la session.

## Garanties du moteur (`src/lib/tenant.ts`)

- **Lectures / maj / suppressions de masse** (`findMany`, `findFirst`, `count`, `aggregate`,
  `groupBy`, `updateMany`, `deleteMany`) → filtre `organismeId` injecté dans le `where`.
- **Créations** (`create`, `createMany`, `upsert.create`) → `organismeId` posé sur les données.
- **Par identifiant unique** (`findUnique`/`findUniqueOrThrow`) → converti en `findFirst` scopé.
- **`update` / `delete`** → vérification d'appartenance au tenant avant exécution (sinon refus).
- Modèle `Organisme` non cloisonné. Le client BRUT `prisma` reste réservé à l'authentification
  (login par e-mail) et à la future console SUPERADMIN (qui gère tous les tenants).

## ✅ Cloisonné (utilise `getTenantDb`)

- **41 pages** authentifiées `src/app/(app)/**` (dashboard, CRM, candidats, clients-pro,
  formations, sessions, e-learning, mes-cours, qualiopi, BPF, RGPD, signatures, automatisations,
  formateurs, administration, comptabilité…).
- **2 routes** authentifiées : `candidats/[id]/export` (export RGPD), `mes-cours/[coursId]/attestation`.
- **20 fichiers d'actions** : candidat, admin, account, client-pro, crm, session, formateur,
  formation, qualiopi, registre, learning, cours, apprenant, emargement, rgpd,
  automation-settings, email, inscription, paiement, prospect (`sendProspectIntakeLink`).

## ✅ Brut volontaire — sûr (routes publiques par token)

Résolues par un **token unique** (cuid non devinable) → pas de session, et naturellement
isolées entre OF. Le `organismeId` est posé sur les créations à partir de l'enregistrement résolu.

- Pages : `inscription`, `prospect/[token]`, `parcours/[token]`, `signer/[token]`,
  `emarger/[token]`, `positionnement/[token]`, `satisfaction/[token]`,
  `satisfaction-entreprise/[token]`, `reclamer/[token]`, `compte-rendu/[token]`,
  `contrat-formateur/[token]`.
- Routes : `*/[token]/document(s)`, `api/lead`, `api/public/sessions`.
- Actions : `public-inscription-actions`, `positionnement-actions`,
  `emargement-signature-actions`, `compte-rendu-actions`, `contrat-formateur-actions`,
  `submitProspectForm`.
- `auth.ts` (login), `tenant.ts` (le moteur).

## ✅ Fuites d'accès inter-OF : fermées (lots 1 & 2)

- **Pages/routes authentifiées** désormais cloisonnées : `app/documents/[inscriptionId]/[type]`,
  `app/emargement/[seanceId]`, `app/api/convention` (entreprise scopée).
- **Sous-système signatures** : `lib/actions/signature-actions.ts` (les 3 actions vérifient
  l'appartenance via le client cloisonné) + `components/signature/signature-section.tsx` (lecture scopée).
  Les builders `lib/documents/{resolve,build-pdf,build-zip}.ts` restent en brut mais ne sont atteints
  qu'**après autorisation** (page authentifiée cloisonnée OU route publique à token unique) — pas de fuite.
- **Inscription publique** : `submitPublicInscription` dérive désormais `organismeId` de la session
  ciblée et le pose sur candidat/inscription/consentement (corrige un bug LIVE : sinon le candidat
  créé restait invisible dans le CRM cloisonné).

## ✅ Créations en flux public/token : étiquetées (`organismeId` dérivé du record)

- `lib/actions/public-inscription-actions.ts` : candidat / inscription / consentement / auditLog (← session).
- `lib/actions/prospect-actions.ts` : consentement (← candidat) ; `sendProspectIntakeLink` cloisonné.
- `lib/actions/parcours-actions.ts` : emailLog ×4, consentement, reclamation, signatureRequest,
  apprenant, coursApprenant, **compte apprenant `user`** (← `insc.organismeId`).
- `lib/actions/emargement-signature-actions.ts` : `emargementSignature.createMany` (← session).
- `lib/actions/compte-rendu-actions.ts`, `lib/actions/contrat-formateur-actions.ts` : emailLog (← session).

## ⚠️ Restant — couplé à la Phase 2 (PAS une fuite d'accès)

1. **Cron / automatisations** : `lib/automation-engine.ts`, `lib/automation-settings.ts`
   → itérer **par organisme** et utiliser l'expéditeur/clé Brevo de chaque OF
   (la correction n'a de sens qu'avec la **marque dynamique** : sinon les e-mails partent en marque CAP).

2. **Marque en dur** : `lib/org-config.ts` (nom, SIRET, logo, cachet, signature…) + chemins
   `public/cap-competences-logo.png` → remplacés par les données du modèle `Organisme` en **Phase 2**.

> Bilan : le cloisonnement des accès (lecture/écriture) est complet pour un usage multi-tenant.
> Les 2 points ci-dessus sont des sujets de **marque/envoi par tenant**, à traiter en Phase 2.

## ✅ Modules avancés (revue QA) — cloisonnés

Tous les modules avancés livrés respectent le cloisonnement :

- **Cloisonnés (`getTenantDb`)** : pages `kanban`, `taches`, `notifications`, `leads-multicanal`,
  `scoring`, `sms`, `rapports`, `portail-client`, `ia` ; actions `tache-actions`, `lead-actions`,
  `sms-actions`, `portal-actions`, `ai-actions` (contexte candidat), `devis-actions`
  (`requestDevisSignature`, `setDevisStatut`). `lib/notifications.ts` agrège via `getTenantDb`
  (try/catch → ne casse jamais le layout) ; lecture de `notificationsSeenAt` par l'**id de session**.
- **Brut volontaire — sûr (token unique)** : `app/devis-accept/[token]` + `acceptDevis` (bon pour
  accord public) ; `app/portail/[token]` (espace client B2B en lecture seule). Résolus par jeton
  aléatoire 24 octets ; le token EST la capacité d'accès — pas de fuite inter-OF.

## 🛠️ Correctif d'accès trouvé en QA (faille fermée)

Le matcher du middleware excluait `portail` pour rendre `/portail/[token]` public — mais `portail`
**préfixait aussi `/portail-client`** (hub authentifié de gestion des liens). Conséquence : la route
protégée contournait l'auth + le gating rôle/fonctionnalité du middleware.
**Fix** : exclusion resserrée à `portail/` (n'attrape plus `portail-client`) **+** garde serveur
`requireSection("portail-client")` ajoutée sur la page (défense en profondeur). Vérifié : aucun autre
segment authentifié ne préfixe-clashe avec les exclusions publiques.

## Revue à refaire

À la fin de chaque conversion résiduelle : `grep -r 'from "@/lib/prisma"' src` et vérifier que
tout usage restant est soit le moteur, soit l'auth, soit une route publique par token, soit le cron.
