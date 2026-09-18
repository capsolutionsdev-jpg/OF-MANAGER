# Convergence CAP + ASPR → tenants de la plateforme commerciale — Audit de préparation

_Lot 3 (lecture seule). Décision du 2026-09-18 : converger. Ce document prépare la migration ; il n'exécute rien._

## 0. Objectif

Faire tourner **CAP Compétence** et **ASPR Herblay** comme **deux organismes (tenants)** de la plateforme commerciale (`OF-MANAGER`), puis **geler** le dépôt initial (`cap-competence-manager`). Toute nouvelle fonctionnalité va désormais dans le commercial uniquement.

## 1. Constat clé (rassurant)

Les deux dépôts sont **le même code multi-tenant**. L'initial possède déjà `Organisme`, `organismeId` sur presque tous les modèles, et le **même moteur de cloisonnement** (`scopedPrisma`/`getTenantDb`). Le commercial est un **sur-ensemble**.

➡️ Migrer CAP + ASPR = **exporter/importer des lignes tenant** entre deux schémas quasi identiques, **pas** une réécriture de modèle de données. Le risque est dans **les données de prod**, pas dans le code.

## 2. Écart de schéma (initial → commercial)

| Élément | Détail | Impact migration |
|---|---|---|
| Modèles **commercial-only** | `DemandeInscription`, `Circuit`, `CircuitStep`, `CircuitStepRun` (+ enums associés) | Tables neuves, **vides** au départ pour CAP/ASPR — aucun impact export |
| Modèles **initial-only** | **aucun** | — |
| **8 modèles cœur** (`Organisme, User, Candidat, Session, Inscription, Formation, Facture, Entreprise`) | Champs ajoutés côté commercial **tous nullable/à défaut** (`deletedAt`, tokens auth, colonnes config Organisme) | **Aucun backfill obligatoire** |
| Enum `FormuleAbonnement` | valeurs **entièrement remplacées** : `{BASIQUE, MEDIUM, COMPLET}` → `{INDEPENDANT, PRO, CROISSANCE, RESEAU}` | **Remapper** à l'import (`ContratPrestation.formule` est requis) ; pour les nouveaux tenants, formule choisie à la main |
| Enums `Role`, `DocumentType` | valeurs **ajoutées** (ENTREPRISE ; nouveaux types de docs) | additif, sans risque |

## 3. Le branding est déjà « par tenant »

Toute l'identité de CAP et d'ASPR s'exprime en **config `Organisme`** (aucun fork de code) : `nom, raisonSociale, siret, nda, numeroTva, adresse…`, visuel `logoUrl, cachetUrl, signatureUrl, faviconUrl, couleurPrimaire/Secondaire, theme, design`, communication `emailExpediteur(Nom), brevoApiKey, sousDomaine`, clés d'intégration par org (`anthropicApiKey, wedofApiKey…`), `fonctionnalites[]`, `documentsConfig`, Qualiopi (`qualiopiNumero, piecesQualiopi, referentHandicap*`), RGPD (`dureeConservationMois`).

Helpers de lecture : `src/lib/org-identity.ts` (`orgConfigFor`), `src/lib/org.ts` (`getBranding`, `getCurrentOrganisme`), `src/lib/tenant-host.ts` (`getPublicBranding`).

## 4. Résolution du tenant

- **Connecté** → `session.user.organismeId` (posé au login dans `auth.ts` → `auth.config.ts`), consommé par `getTenantDb()`.
- **Public (avant login)** → **sous-domaine** : `getOrganismeFromHost()` lit `Organisme.sousDomaine` (`@unique`). `src/lib/tenant-host.ts` + `src/lib/subdomain.ts`.
- **Pas de routage par domaine personnalisé** aujourd'hui (sous-domaine uniquement). `Organisme.appUrl` n'est qu'un lien catalogue, pas du routage.
- Isolation garantie **au niveau base** par `scopedPrisma` (injection `organismeId`), pas par l'hôte.

## 5. ⚠️ Blocages & risques (à traiter à l'import)

1. **BLOCAGE n°1 — `User.email` est unique GLOBALEMENT** (contrainte mono-colonne, pas par organisme). Si CAP et ASPR ont chacun un utilisateur avec **le même e-mail** (ex. un gérant commun aux deux OF), les deux lignes **ne peuvent pas coexister** dans la base fusionnée : le 2ᵉ import échoue. → Il faut **dédupliquer / renommer** ces e-mails avant l'import. (Un `User` appartient à **un seul** `organismeId` ; une même personne pilotant les deux OF aura besoin d'un e-mail distinct par tenant, ou d'un compte SUPERADMIN.)
   - À noter : `Candidat.email`, `Formateur.email`, `Entreprise.contactEmail` **ne sont pas** uniques globalement → **pas** de collision de ce côté.
2. **Colonnes uniques globales** à réconcilier : `Organisme.sousDomaine`, `Organisme.codeVerification` ; tokens `@unique` par enregistrement (cuid/aléatoire → risque faible mais les deux jeux de données ne doivent pas porter de valeurs fixes en doublon).
3. **Remap enum** `FormuleAbonnement` (cf. §2).
4. **Fichiers/blobs** : les URLs de fichiers sont stockées en colonnes texte (Vercel Blob), + un PDF **en base** (`Inscription.dossierPdf`, `Bytes`). Les objets Blob doivent **suivre** leurs lignes (copie ou re-pointage d'URL).

## 6. Inventaire des données à migrer

**~66 des ~75 modèles portent `organismeId`** → ce sont les tables à exporter depuis l'initial et à réimporter **par organisme** (candidats, sessions, inscriptions, formations, factures, documents, e-learning, Qualiopi, civique, T3P, etc.).

Modèles **hors export tenant** : `Organisme` (la ligne tenant elle-même), `PlanTarif` (tarifs globaux), `Lead/LeadEvent/LeadTask` (pré-vente éditeur), `SupportMessage` (via ticket), `MrrSnapshot`, `DeviceToken` (via user), `Jury` (via session).

Ordre d'import dicté par les FK : `Organisme` → `User`/`Formateur`/`Formation`/`Salle` → `Candidat`/`Apprenant`/`Entreprise` → `Session` → `Inscription` → documents/paiements/e-learning/audit…

## 7. Plan de migration par phases (lots suivants)

| Lot | Objet | Risque | Précédents de code réutilisables |
|---|---|---|---|
| **4** | **Provisioning** de CAP & ASPR comme `Organisme` + admin + config branding (sur **staging**) | faible (staging) | `src/lib/actions/organisme-actions.ts` (`createOrganisme`/`updateOrganisme` : couvre TOUT le champ branding), `src/lib/demo/provision.ts`, `src/lib/formations/provision.ts` |
| **5** | **Scripts export (initial) → import (commercial)** par `organismeId`, remap enums, dédup e-mails, transfert blobs + **dry-run** sur staging | moyen (staging) | `src/app/console/[id]/export/route.ts` + `src/lib/selfhost/templates.ts` (sérialisation d'un Organisme), moteur `scopedPrisma` |
| **6** | **Recette** (rejouer les parcours CAP/ASPR sur staging) puis **bascule prod + rollback** | élevé (prod) — **piloté par vous** | runbook `docs/DEPLOIEMENT.md` (déjà `db push` manuel Neon) |

Répartition : je livre tout le **code/scripts/staging** ; **la bascule prod (données, DNS, cutover) reste pilotée par vous** — je ne touche jamais la prod sans validation explicite.

## 8. Décisions / infos requises de votre part (avant le Lot 4)

1. **CAP est-il déjà un `Organisme` sur le commercial ?** Le commercial épingle « CAP Compétences » comme éditeur/vitrine via `VITRINE_ORGANISME_ID`. Si oui, la prod de CAP doit migrer **vers cet organisme existant** (pas en créer un nouveau) ; ASPR = nouvel organisme. **À confirmer.**
2. **Sous-domaines** souhaités : ex. `cap.ofmanager.info` et `aspr.ofmanager.info` ? Ou conserver des domaines existants (nécessiterait d'ajouter le routage par domaine personnalisé — non présent aujourd'hui) ?
3. **E-mails partagés** entre comptes CAP et ASPR (blocage §5.1) : y a-t-il des utilisateurs (gérant, admin) présents des **deux** côtés avec le même e-mail ? Si oui, lesquels ?
4. **Accès à une base de STAGING** (copie de la prod commerciale + dumps des prods CAP/ASPR) pour les dry-runs du Lot 5.
5. **Ordre & fenêtre** : CAP d'abord puis ASPR ? Fenêtre de bascule (hors heures de pointe) ?

## 9. Ce qui NE change pas

- CAP reste l'**éditeur** de la plateforme (vitrine, contrats/factures éditeur via `VITRINE_ORGANISME_ID`).
- Le moteur multi-tenant existant (`scopedPrisma`, RLS optionnelle) fait déjà **90 %** du travail conceptuel : provisionner = créer 2 lignes `Organisme`, tout le reste s'accroche par `organismeId`.

---
_Facts établis par diff de schéma champ-par-champ + analyse du code des deux dépôts (2026-09-18). Aucune donnée de production consultée._
