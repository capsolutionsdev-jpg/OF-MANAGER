# Espace client B2B — Spécification de conception

**Date** : 2026-08-20
**Produit** : OFManager (fork commercial, `ofmanager.info`)
**Statut** : conception validée en brainstorming — à implémenter par phases.

## 1. Objectif

Offrir aux **clients professionnels** (entreprises qui envoient leurs salariés en formation) un **espace authentifié en self-service** pour :

- consulter le **planning** des sessions du centre ;
- **inscrire leurs salariés** à une session (avec validation de l'OF) ;
- suivre l'**issue pédagogique** de chaque salarié (certifié / ajourné / abandonné) ;
- récupérer leurs **documents** (convocations, attestations, certificats) et leurs **factures** ;
- **signer la convention** de formation (upload sur l'espace ou envoi par mail).

But : autonomiser le client, réduire les allers-retours e-mail côté staff, professionnaliser la relation.

## 2. Décisions validées (brainstorming)

| Sujet | Décision |
|---|---|
| Création d'accès | L'OF **crée le compte** depuis sa console → **e-mail d'invitation** au client pour définir son mot de passe. |
| Modèle de compte | **Un login par entreprise** → lien `Entreprise.userId` (calqué sur `Apprenant.userId`). |
| Approche | **A** — espace authentifié dédié qui **réutilise** le backend B2B existant (écartées : greffer un login sur le portail par token ; big-bang tout-en-un). |
| Factures | **Pas de génération** : l'admin **dépose** le PDF (fait sur un autre logiciel), le client **télécharge**. |
| Workflow inscription | Entité dédiée **`DemandeInscription`** pour la négociation (confirmer / proposer d'autres dates), plutôt que des inscriptions « en attente » à moitié créées. |
| Suivi pédagogique | Rubrique dédiée, **lecture seule**, branchée sur l'enum existant `CertificationResultat`. |

## 3. Base existante réutilisée (rien à réinventer)

- Modèle **`Entreprise`** (SIRET, `contact*`, `representant`/signataire, `opco` financeur), `Candidat.entrepriseId`, `Inscription.entrepriseId` + **convention de groupe** (`conventionGroupe`).
- Flux staff **`createConventionEntreprise`** (session + entreprise + salariés → candidats + convention de groupe + inscriptions `EN_ATTENTE`) et **`signerConvention`** (validation) — `src/lib/actions/convention-actions.ts`.
- **Templates documentaires** : `CONVENTION_ENTREPRISE`, convocations, attestations, **certificat de réalisation** (`src/lib/documents/templates.ts`) ; génération PDF `buildSingleDocPdf` ; variables entreprise déjà résolues (`src/lib/documents/resolve.ts`).
- **API « sessions à venir »** filtrée avec places restantes (`src/app/api/public/sessions/route.ts`).
- **Patron d'espace authentifié non-staff** : rôles `APPRENANT`/`FORMATEUR` confinés à `/mes-*` via `authorized()` (`src/auth.config.ts`) ; création de compte `createApprenantAccount` (`src/lib/actions/apprenant-actions.ts`) ; garde `getCurrentApprenant()` (`src/lib/candidat-portal.ts`) ; shell `(app)/layout.tsx` + `buildNav` (`src/lib/navigation.ts`).
- **Enum `CertificationResultat`** = `CERTIFIE | AJOURNE | ABANDON` (exactement les 3 issues voulues).
- Portail entreprise **lecture seule** existant (`/portail/[token]`) → base de contenu.
- Auth NextAuth v5 (bcrypt, anti-brute-force, session unique) ; e-mail **Resend** opérationnel (`contact@ofmanager.info`).

## 4. Architecture

### 4.1 Authentification & isolation
- Nouveau rôle **`ENTREPRISE`** dans l'enum `Role`.
- Champ **`Entreprise.userId String? @unique`** → un `User` (role `ENTREPRISE`).
- Action **`createEntrepriseAccount(entrepriseId)`** (staff, depuis la fiche client-pro), calquée sur `createApprenantAccount` : crée le `User` (via prisma brut, e-mail unique cross-tenant), lie l'entreprise, envoie l'**e-mail d'invitation** (jeton « définir mot de passe » — réutilise le flux compte/mot de passe existant : `account-actions.ts` / `apprenant-actions.ts`). Envoi via Resend.
- **Session (JWT)** : ajout de `entrepriseId` (absent aujourd'hui de `src/types/next-auth.d.ts`).
- **Confinement** : groupe de routes `/espace-entreprise/*` verrouillé dans `authorized()` (comme `/mes-*` pour l'apprenant) + garde de page en défense en profondeur (patron `requireSection`).
- **Garde `getCurrentEntreprise()`** (calquée sur `getCurrentApprenant`) : résout l'entreprise du user connecté et **scope toutes les requêtes** du portail.
- Cycle de vie : suspension/révocation via `User.isActive`.

### 4.2 Modèle de données (ajouts au schéma Prisma)
- `enum Role { … , ENTREPRISE }`.
- `Entreprise.userId String? @unique` + relation `user User?`.
- **`model DemandeInscription`** : `id`, `organismeId`, `entrepriseId` (+ relation), `sessionId` (+ relation), `salariesJson Json` (liste `{nom, prenom, email}` ou candidats existants), `statut DemandeInscriptionStatut @default(EN_ATTENTE)`, `sessionProposeeId String?` (contre-proposition), `motif String?`, `traiteeParId String?`, `createdAt`, `updatedAt`. Index : `organismeId`, `entrepriseId`, `statut`.
- **`enum DemandeInscriptionStatut { EN_ATTENTE, CONTRE_PROPOSEE, CONFIRMEE, REFUSEE, ANNULEE }`**.
- **`Facture.fileUrl String?`** (PDF déposé par l'admin, stocké sur Vercel Blob via `lib/blob.ts`).

### 4.3 Les 5 rubriques (`/espace-entreprise/*`)
| Rubrique | Route | Source de données | Mode |
|---|---|---|---|
| ① Formation | `/espace-entreprise/formation` | requête « sessions à venir » (places restantes) | lecture + point de départ inscription |
| ② Inscriptions | `/espace-entreprise/inscriptions` | `Inscription` filtré entreprise, catégorisé `etat()` (en cours / à venir / passées) | lecture |
| ③ Suivi pédagogique | `/espace-entreprise/suivi` | `CertificationResultat` (CERTIFIE/AJOURNE/ABANDON) + résultats d'évaluation | lecture |
| ④ Documents | `/espace-entreprise/documents` | `DocumentGenere` filtré entreprise, groupé par session & salarié | téléchargement |
| ⑤ Factures | `/espace-entreprise/factures` | `Facture` (entreprise) + `fileUrl` | téléchargement |

Toutes filtrées par `getCurrentEntreprise()`. Contenu inspiré de la page `/portail/[token]` existante.

### 4.4 Workflow d'inscription
1. **Demande (client)** — depuis une session du planning : ajoute ses salariés → `createDemandeInscription` → `DemandeInscription(EN_ATTENTE)` → notifie le staff (e-mail + badge console).
2. **Traitement (staff)** — liste `/demandes-inscription` :
   - **Confirmer** → `confirmerDemande` → appelle `createConventionEntreprise` (candidats + convention de groupe + inscriptions) → statut `CONFIRMEE`.
   - **Proposer d'autres dates** → `proposerAutreDate(sessionProposeeId)` → `CONTRE_PROPOSEE` → le client **accepte** (`accepterContreProposition` → repointe sur la nouvelle session + confirme) ou **refuse**.
   - **Refuser** → `REFUSEE` (+ motif).
   - Notifications client à chaque transition (Resend + espace).
3. **Convention (Phase 3)** — à `CONFIRMEE` : convention de groupe générée (template `CONVENTION_ENTREPRISE`). Le client la **signe/tamponne**, puis **upload** sur l'espace (`uploadConventionSignee` → Vercel Blob → `Convention.fileUrl` + statut) **ou** l'envoie par mail (staff upload). Réception du signé → `signerConvention` → inscriptions `VALIDEE`.
4. **Convocations + documents** — à la validation : génération des convocations + mise à disposition des attestations / certificats dans la rubrique Documents.

## 5. Sécurité & isolation
- **Triple verrou** : tenant (`organismeId`) + entreprise (`getCurrentEntreprise`) + confinement de routes (`ENTREPRISE` hors `/espace-entreprise/*` → redirection).
- **Anti-IDOR** : tout accès ou téléchargement par identifiant (document, facture, session, demande) **vérifie l'appartenance à l'entreprise connectée AVANT** de servir. (L'app a déjà subi un audit IDOR : même rigueur.)
- **Écritures** : le client n'agit que sur SES demandes/salariés ; confirmer/proposer/refuser = **staff-only** (gardes existantes, ex. `requireUser` rejette déjà APPRENANT/FORMATEUR sur `clients-pro`).
- Auth : stack NextAuth existante (bcrypt, anti-brute-force, session unique).

## 6. Tests (vitest)
- **Isolation** : entreprise A ne voit **jamais** les inscriptions / documents / factures / demandes de l'entreprise B (test-clé du portail).
- **Anti-IDOR** : accès à un document/facture d'une autre entreprise → refusé.
- **Machine à états** `DemandeInscription` : transitions valides et rejet des invalides.
- **Intégration** : `confirmerDemande` → `createConventionEntreprise` crée candidats + convention + inscriptions.
- `createEntrepriseAccount` : crée le user, lie l'entreprise, déclenche l'e-mail d'invitation.

## 7. Cas limites
- Session pleine à la confirmation (contrôle de capacité déjà présent dans `createConventionEntreprise`).
- Session archivée / non ouverte à l'inscription.
- Ré-inscription d'un salarié déjà inscrit à la session.
- Expiration ou renvoi du lien d'invitation.
- Upload de convention : validation du type (PDF) et de la taille.
- Demande vide (aucun salarié) → refus de création.

## 8. Phasage (plan de livraison)
- **Phase 1 — Accès + consultation** : rôle `ENTREPRISE`, `Entreprise.userId`, `createEntrepriseAccount` + invitation, `getCurrentEntreprise`, confinement de routes, et les **5 rubriques en lecture** (Formation, Inscriptions, Suivi pédagogique, Documents) + **Factures** (upload admin `Facture.fileUrl` + download client). Valeur immédiate, risque faible.
- **Phase 2 — Inscription self-service** : `DemandeInscription` + `createDemandeInscription` (client) + traitement staff (confirmer / proposer / refuser) + notifications.
- **Phase 3 — Convention & documents** : génération de la convention à la confirmation, signature client (upload / mail), validation → convocations + documents mis à disposition automatiquement dans l'espace.

## 9. Hors périmètre (YAGNI)
- Multi-contacts par entreprise (un seul login pour l'instant ; le modèle reste extensible).
- **Génération** de factures (faites sur un autre logiciel — on ne fait que déposer/télécharger).
- E-signature YouSign de la convention (l'upload du signé suffit ; branchable plus tard).
- Domaine d'envoi e-mail propre à chaque tenant.
- Messagerie entreprise ↔ OF.

---
*Spec issue d'un brainstorming validé section par section. Prochaine étape : plan d'implémentation (skill writing-plans), en commençant par la Phase 1.*
