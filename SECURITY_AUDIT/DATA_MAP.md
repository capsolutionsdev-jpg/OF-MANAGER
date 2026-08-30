# DATA MAP — Données sensibles OF Manager

> STEP 3 de la méthode d'audit. Recense les données sensibles, leur sensibilité, leur clé de cloisonnement tenant et leur régime de protection. Source : `prisma/schema.prisma` (3016 lignes, ~80 modèles).

## Légende sensibilité
🔴 Critique (secret/identifiant régalien) · 🟠 PII forte / financier · 🟡 PII / métier · 🔵 Peu sensible

## 1. Secrets & authentification

| Donnée | Modèle / champ | Sensibilité | Cloisonnement | Protection |
|---|---|---|---|---|
| Hash mot de passe | `User.passwordHash` | 🔴 | — (auth cross-tenant) | bcrypt ✅ |
| Secret TOTP 2FA | `User.totpSecret` | 🔴 | — | AES-256-GCM (`crypto.ts`) ✅ |
| Session active | `User.activeSessionId` | 🟡 | — | opaque |
| Jeton d'invitation | `User.inviteToken` (+expiry) | 🟠 | — | unique, expirable |
| Secret app | env `AUTH_SECRET` (signe le JWT) | 🔴 | global | env Vercel |
| Clé de chiffrement | env `SECRETS_ENCRYPTION_KEY` | 🔴 | global | env Vercel |
| Secret cron | env `CRON_SECRET` | 🟠 | global | env, Bearer, échec fermé ✅ |
| Secret ingestion lead | env `LEAD_API_SECRET` | 🟠 | global | env |
| **Clés d'intégration tenant** | `Organisme.{brevoApiKey, anthropicApiKey, imageApiKey, yousignApiKey, wedofApiKey, wedofWebhookSecret}` | 🔴 | `organismeId` | **AES-256-GCM applicatif — à confirmer que TOUS ces champs passent par `encryptSecret`** |
| IDs Stripe | `Organisme.{stripeCustomerId, stripeSubscriptionId}` | 🟡 | `organismeId` | référence (non secrète) |

## 2. Données personnelles candidats (RGPD — le cœur sensible)

Modèle **`Candidat`** (`schema.prisma:647-769`), clé tenant `organismeId` (**nullable**), `@@index([organismeId])`.

| Catégorie | Champs | Sensibilité |
|---|---|---|
| Identité | `nom, prenom, dateNaissance, lieuNaissance, departementNaissance, paysNaissance, nationalite` | 🟠 |
| Contact | `email, telephone, adresse, ville, codePostal` | 🟠 |
| **Photo d'identité** | `photoUrl` (data URL) | 🔴 (biométrie faciale) |
| **Signature manuscrite** | `prospectSignatureUrl` + `prospectSignatureIp` | 🔴 |
| Situation pro | `situationPro, employeur, posteOccupe, dernierDiplome` | 🟡 |
| **Titres régaliens sécurité** | `cnapsNumero, carteProNumero, ssiapDiplomeNumero, carteProVtcTaxiNumero` | 🔴 (identifiants officiels) |
| **Donnée sensible (art. 9 RGPD)** | `situationHandicap` (bool) + `besoinsAdaptation` | 🔴 (santé) |
| Tokens d'accès public | `prospectToken`, `civicToken` (uniques) | 🟠 (porteur = accès) |
| Commercial | `crmStage, tags, valeurEstimee, relanceDate, sourceConnaissance` | 🟡 |
| Purge RGPD | `anonymiseLe` (horodatage effacement) | — |

**Pièces jointes** — `PieceJointe` (`schema.prisma:789-808`) : `url` (Blob), `categorie` (CV, **CNI**, DIPLOME…), `mimeType`, `statut`. Servies par `GET /api/public/piece/[id]` → **contrôle d'accès = point critique**.

**Interactions / consentements** : `CandidatInteraction` (contenu échanges), `Consentement` (type, `ip`, `accepteLe`/`retireLe`), `Conversation`/`Message` (portail candidat).

## 3. Données financières

| Donnée | Modèle | Cloisonnement |
|---|---|---|
| Factures OF | `Facture` (montantHT/TTC, `fileUrl` PDF, lignes) | `@@unique([organismeId, reference])` ✅ |
| Règlements | `Paiement` (montant, mode CB/CPF/OPCO, `enregistrePar`) | `organismeId` |
| Factures formateur | `FactureFormateur` (`fichierUrl` justificatif) | `organismeId` |
| Dossiers financement | `DossierFinancement` (CPF/OPCO) | `organismeId` |
| Facturation éditeur (SaaS) | `FactureEditeur`, `ContratPrestation` | `organismeId` (console SUPERADMIN) |
| E-learning civique | `CivicPaiement`, `CivicFacture` | via `Candidat` |

## 4. Documents générés (sensibles — Qualiopi & régaliens)

`DocumentGenere`, `DocumentTemplate`, `Convention`, `Contrat`, `EmargementSignature`, `SignatureRequest`, `QualiopiPreuve` — attestations, contrats de formation, **émargements signés**, conventions, certificats/titres, bordereaux. Accès via routes `/documents/*`, `/api/*/{attestation,bordereau,expression-besoin}`, `/api/console/*` (facturx/PDF). Contrôle d'accès + scope tenant = contrôles SEC-45/47/74.

## 5. Traçabilité & RGPD

| Donnée | Modèle | Usage |
|---|---|---|
| Journal d'actions | `AuditLog` (`action, entityType, entityId, changesJson, userId, organismeId`) | SEC-38 (audit log) |
| Demandes RGPD | `DataRequest` (`subjectEmail, type, statut`) | droit d'accès/effacement (SEC-71) |
| Consentements | `Consentement` (`ip, version, accepteLe, retireLe`) | preuve de consentement |
| Config rétention | `Organisme.dureeConservationMois` (défaut 36) | purge auto (`cron/rgpd-purge`) |

## 6. Cross-tenant par nature (hors cloisonnement)

- `User`, `Apprenant` : entités d'auth **cross-tenant** (e-mail unique toutes organisations confondues) — laissées en BYPASS même en mode RLS strict (`src/lib/prisma.ts:54`). Sensible : une faille de scoping sur `User` toucherait tous les tenants.
- `Organisme`, `PlanTarif`, `SupportMessage` : modèles globaux (console éditeur), sans policy RLS.

## 7. Risque structurel identifié

- **`organismeId` est `String?` (nullable)** sur les modèles métier (Candidat, PieceJointe, Formation, Facture, Paiement, AuditLog…). Des lignes *legacy* à tenant `NULL` peuvent exister. Un filtre `where organismeId = X` exclut correctement les `NULL`, mais tout chemin de création laissant `organismeId` à `NULL`, ou toute requête sans filtre, crée un angle mort d'isolation. → à corréler avec le verdict de l'audit d'isolation (SEC-22).
