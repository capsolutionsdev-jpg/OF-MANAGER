# COMPTE RENDU D'AUDIT 09 — Audit Backup / Disaster Recovery
## OFMANAGER — Programme d'audit de pré-commercialisation

**Date :** 2026-08-30
**Version auditée :** branche `feat/changer-session` @ `5d3f9e4` (backup/DR = niveau infra/doc, non sensible à la branche ; socle live `ofmanager.info`).
**Chef de projet audit :** Claude Code (chef de projet senior)
**Équipe mobilisée :** Ingénieur sauvegarde/restauration + Expert base de données (fusionnés — mécanisme unique Neon PITR) · Spécialiste stockage fichiers · Architecte continuité d'activité · Analyste risques (4 sub-agents en parallèle) + contre-vérification live du chef de projet sur les pièces des 🔴/🟠.
**Périmètre couvert :** sauvegarde/restauration de la base (Neon PITR), sauvegarde des fichiers (Vercel Blob), reconstruction (schéma, secrets, config), RPO/RTO, règle 3-2-1, scénarios de sinistre (suppression accidentelle, corruption massive, rançongiciel, défaillance fournisseur, indisponibilité, bus factor), engagements SLA/réversibilité. **Hors périmètre :** sécurité offensive (audit 01), exploitation courante (audit 08) — dépendances signalées et croisées.
**Durée / profondeur :** analyse statique multi-agents (4 agents, ~580 K tokens, ~120 appels d'outils) + contre-vérification live du chef de projet (`crypto.ts`, `blob.ts`, `docs/SECURITE-OPS.md`, `docs/PRA-SAUVEGARDE.md`, `legal/SLA.md`, `legal/clause-reversibilite.md`, `vercel.json`, `.env.example`, `.gitignore`). **Aucune connexion à la prod, aucun script exécuté, aucune restauration réelle** (règles absolues 4/5). Contrôles hors dépôt (dashboards Neon/Vercel, versioning Blob, MFA) listés en section 5.

---

### 1. SYNTHÈSE EXÉCUTIVE

Le dispositif de reprise après sinistre d'OFMANAGER est **conçu mais pas déployé** : la documentation (`PRA-SAUVEGARDE.md`, `SECURITE-OPS.md`, `SLA.md`) décrit correctement ce qu'il faudrait faire, mais chaque brique protectrice est marquée « optionnel / à planifier / à finaliser » et **aucune n'est en place**. C'est le périmètre le **moins prêt** de l'ensemble du programme. Trois blocages majeurs : (1) **les fichiers** — conventions signées, pièces d'identité, factures — n'ont **aucune sauvegarde** (copie unique sur Vercel Blob, sans versioning) ; (2) **la base** n'a **aucune copie hors-fournisseur** : tout repose sur le PITR interne à Neon, donc une suppression/suspension/compromission du compte Neon efface **tout, PITR compris** ; (3) **aucun soft-delete ni corbeille** — une suppression accidentelle par un client est **définitive**, le seul recours étant une restauration PITR globale **jamais testée**, à rétention **non confirmée** (potentiellement ~24 h). S'y ajoutent des cibles RPO/RTO **contradictoires** sur trois documents, une **fausse affirmation** du runbook (« Blob versionné côté Vercel »), l'absence d'escrow du secret qui déchiffre les clés API de tous les tenants, un **bus factor de 1** sans dépôt d'accès, et l'absence d'alerte sur échec. Points solides réels : code redondé sur GitHub, export de réversibilité client fonctionnel, sondes `/api/health` + `/api/version` désormais présentes, purge RGPD prudente (anonymise sans supprimer les pièces comptables).

| 🔴 Rouge | 🟠 Orange | 🟡 Jaune | 🟢 Vert |
|---|---|---|---|
| 3 | 13 | 6 | 8 |

**VERDICT : GO CONDITIONNEL** *(proche du NO-GO — périmètre le moins mûr du programme)*
La sauvegarde est le dernier filet de sécurité ; ici il est quasi entièrement « à faire ». Aucune refonte n'est requise et toutes les corrections sont de charge bornée, mais la mise en clientèle payante est **interdite** tant que ne sont pas levées les **7 conditions P0** : (C1) sauvegarde des fichiers Blob hors-Blob ; (C2) dump base chiffré **hors-fournisseur** + rétention PITR confirmée ; (C3) **une restauration réelle chronométrée** exécutée et documentée ; (C4) soft-delete/corbeille sur les entités clés (ou, à défaut immédiat, restauration PITR partielle prouvée) ; (C5) garde d'hôte anti-prod sur tous les scripts d'écriture + isolation dev/prod (croise A08-001) ; (C6) re-baseline des migrations versionnées (croise A08-002) ; (C7) escrow du `SECRETS_ENCRYPTION_KEY` + dépôt d'accès (bus factor). **Sans ces levées, le verdict est NO-GO.**

---

### 2. TABLEAU DES ANOMALIES

| ID | Gravité | Titre | Composant | Preuve | Impact | Recommandation | Charge | Priorité |
|---|---|---|---|---|---|---|---|---|
| A09-001 | 🔴 | Fichiers (Blob) sans aucune sauvegarde (copie unique) | Stockage fichiers | `src/lib/blob.ts:17-24` (`put` public, 0 versioning) ; aucune écriture vers un 2ᵉ stockage | Perte définitive des conventions **signées**, CNI, factures (preuves Qualiopi + 10 ans compta) | Réplication/dump chiffré des blobs vers stockage tiers + test de restauration | M | P0 |
| A09-002 | 🔴 | Base : aucune copie hors-fournisseur ni immuable (règle 3-2-1 violée) | Sauvegarde base (Neon PITR) | `PRA-SAUVEGARDE.md:5-8` ; `SECURITE-OPS.md:24-27` (offsite « à finaliser ») ; `EXPLOITATION.md:25-27` (pg_dump « à planifier ») | Suppression/suspension/défaut de paiement/compromission du compte Neon = perte totale, PITR inclus | `pg_dump -Fc` chiffré hebdo vers 2ᵉ fournisseur immuable (object-lock) + test réimport | M | P0 |
| A09-003 | 🔴 | Aucun soft-delete ni corbeille : suppression accidentelle définitive | Schéma + actions de suppression | `schema.prisma` `deletedAt`=0 ; `comptes-actions.ts:117` (`candidat.delete` sans garde) ; `inscription-actions.ts:685` ; 48 `onDelete:Cascade` | Un ADMIN client qui supprime par erreur n'a aucun undo ; recours = PITR global non prouvé | Soft-delete (`deletedAt`) + corbeille avec délai sur Candidat/Inscription/Session/Entreprise/Facture | L | P0 |
| A09-004 | 🟠 | Corruption/purge massive de la prod possible depuis un poste dev | Scripts + environnement | `reset-data.ts:10-14,34-55` (`deleteMany` cross-tenant, garde = passphrase seule) ; 13/15 scripts sans garde d'hôte ; **croise A08-001/002/007** | Un script/`db push`/test lancé en local purge tous les tenants ; seule issue = PITR non prouvé | Helper `assertNotProd()` sur tout script d'écriture + isolation dev/prod (A08-001) | M | P0 |
| A09-005 | 🟠 | Reconstruction du schéma impossible sur un point restauré (dérive migrations) | Migrations / DR | dernière migration `20260605140000` vs `schema.prisma` 28/08 (97 commits) ; `add_cnaps_numero_validite.sql` hors dossier horodaté ; **croise A08-002** | PITR vers point ancien = schéma désaligné du code → tenants cassés ; reconstruction impossible | Re-baseline `docs/db-baseline.sql` + `prisma migrate deploy` ; bannir `db push` en prod | L | P0 |
| A09-006 | 🟠 | `SECRETS_ENCRYPTION_KEY` sans coffre/escrow (reconstruction) | Secrets / reconstruction | `crypto.ts:42-46` (clé absente → illisible) ; `.gitignore:34` ; coffre = « amélioration future » (`AUDIT/07:39`) | Perte simultanée Vercel + poste (ou éditeur indispo) = clés API tenant définitivement illisibles | Coffre chiffré + dépôt scellé hors-ligne + procédure de reconstruction complète | S | P0 |
| A09-007 | 🟠 | Plan de reprise jamais testé — aucune sauvegarde prouvée restaurable | PRA | `PRA-SAUVEGARDE.md:26-31` (cases `[ ]`) ; `EXPLOITATION.md:62` décoché ; `DEPLOIEMENT.md:84` (délai `____` vide) | RTO/RPO réels inconnus ; procédure découverte sous incident sur des données d'apprenants | Restauration réelle chronométrée vers branche Neon + comparer 3-5 compteurs + consigner | S | P0 |
| A09-008 | 🟠 | Cibles RPO/RTO incohérentes (3 documents) et irréalistes pour un exploitant seul | SLA / PRA | RPO 5 min (`PRA:14`) vs [1] h (`SLA:35`) ; RTO 4 h ouvrées / [4] h / **2 h** (`PRA:15`,`SLA:34`,`SECURITE-OPS:14`) | Engagement SLA sur base fausse et non mesurée → manquement dès le 1ᵉʳ client | Figer un jeu unique **après** le test réel ; aligner les 3 docs sur la rétention PITR réelle | S | P1 |
| A09-009 | 🟠 | Le runbook PRA affirme faussement que les fichiers Blob sont « versionné côté Vercel » | Doc exploitation | `SECURITE-OPS.md:20` (« versionné côté Vercel ») vs réalité (`blob.ts`, 0 versioning) + `SLA.md:30` (« à préciser ») | Fausse assurance : la sauvegarde fichiers ne sera jamais mise en place ; illusion de restauration en incident | Corriger la table (Blob = copie unique, sans versioning) + aligner sur SLA + A09-001 | S | P1 |
| A09-010 | 🟠 | Après un PITR, les références Blob sont mortes (502) ; aucune réconciliation base↔fichiers | Cohérence Neon↔Blob | `api/public/piece/[id]/route.ts:71-72` (502 si blob absent) ; URL persistées en base | Après restauration, dossiers/conventions/factures en liens cassés non détectés ; RPO fichiers = **nul** | Sauvegarde blobs cohérente avec la base (A09-001) + job de réconciliation des URL pendantes | M | P1 |
| A09-011 | 🟠 | Bus factor = 1 : aucun dépôt d'accès ni plan de succession | Continuité éditeur | `DPA:8` (un seul président) ; `SECURITE-OPS.md:91` ; grep succession/dépôt accès → néant | Éditeur indisponible = personne ne peut restaurer, roter un secret, ni honorer la réversibilité | Dépôt d'accès scellé (Neon/Vercel/OVH/Stripe/GitHub) + procédure de bris de glace confiée à un tiers | M | P1 |
| A09-012 | 🟠 | Aucune alerte sur échec de sauvegarde, de cron ou d'anonymisation de masse | Supervision | `EXPLOITATION.md:45-47,60-65` (TODO/décoché) ; `anonymise.ts:103,124-176` (purge muette) ; croise A08-008/009 | Dégradation PITR, quota Neon, cron destructif défaillant ou anonymisation massive passent inaperçus | Monitor externe sur `/api/health` + alerte échec cron (`runCron`) + alerte volumétrie anonymisation | S | P1 |
| A09-013 | 🟠 | Aucun registre d'incidents / de violations rempli | Conformité / exploitation | `procedure-violation-donnees.md:33` (case « créer le registre » décochée) ; `SECURITE-OPS.md:108-112` (instruction sans fichier) ; **croise audit 02** | Obligation RGPD art. 33-5 non tenue ; aucune mémoire des incidents (ex. dépassement quota Neon) | Créer le registre (date, faits, données, personnes, mesures, notif CNIL) + consigner rétroactivement | S | P1 |
| A09-014 | 🟠 | Restauration par tenant impossible nativement (une branche Neon restaure toute la base) | Multi-tenant / granularité | `schema.prisma` 178 `organismeId` ; `administration/export/route.ts:15-40` (export lecture seule, sans ré-import, sans PDF) | Restaurer un OF à T-antérieur sans écraser les 2 autres = SQL sélectif manuel risqué | Documenter et éprouver une restauration sélective par `organismeId` ; prévoir un ré-import de l'export | M | P2 |
| A09-015 | 🟠 | Indisponibilité prolongée : aucun mode dégradé, page de statut ni communication client | Exploitation / produit | aucune page `status/maintenance` (`src/app/**`) ; `SECURITE-OPS.md:42` (« Attendre le rétablissement ») ; `SLA.md:9,42` (brouillon) | Pendant une panne, le 1ᵉʳ signal est un client mécontent ; SLA non engageable | Page de statut hébergée **hors** Vercel/Neon + procédure de comm d'incident + finaliser le SLA | M | P2 |
| A09-016 | 🟠 | Réversibilité : export incomplet (ni consentements/auditLog ni PDF) + bascule fournisseur non testée | Réversibilité / portabilité | `administration/export/route.ts:26-40` ; `clause-reversibilite.md:13,19-20` (brouillon `[30]j`/`[15]j`) ; self-host dégradé (A08-023) | Sortie/bascule dans l'urgence, tenant par tenant, sans amorce offsite ni procédure éprouvée | Export opérateur global (toutes tables + PDF) planifié offsite + tester une bascule standalone | M | P2 |
| A09-017 | 🟡 | Rétention PITR non fixée + présomption de plan insuffisant (Free ≈ 24 h) | Rétention | `EXPLOITATION.md:13-16` (« Free ≈ 24 h. Insuffisant ») ; `cron-external.yml` (Hobby) ; plan non attesté | Une erreur découverte > 24 h serait irrécupérable (délais Qualiopi/financeurs en mois) | Relever le plan Neon, viser ≥ 7-30 j, l'inscrire dans PRA + SLA | S | P1 |
| A09-018 | 🟡 | Auto-heal cassé par idempotence après perte d'un blob régénérable | Publication B2B | `documents/publish.ts:39-43` (`fileUrl not null` → « déjà publié ») | Même les documents régénérables restent perdus (lien mort) jusqu'à purge manuelle | Vérifier l'existence du blob avant « déjà publié » / invalider `fileUrl` sur 502 | S | P2 |
| A09-019 | 🟡 | Documents de continuité/SLA tous en BROUILLON avec valeurs en placeholders (dette systémique) | Documentation contractuelle | `SLA.md:1`, `clause-reversibilite.md:1`, `procedure-violation-donnees.md:3`, `registre-traitements.md` (brouillons) ; `SLA.md:30` (fichiers « à préciser ») | Aucun engagement de continuité opposable ni cohérent avant le 1ᵉʳ client payant | Figer les valeurs sur mesures réelles + validation juridique (traiter comme un ensemble) | M | P2 |
| A09-020 | 🟡 | Blobs orphelins : suppression d'une pièce efface la ligne mais pas le blob | Parcours candidat | `dossier-actions.ts:222` (`pieceJointe.delete` sans `del`) | Fuite de stockage + fichiers accessibles hors app (croise A08-003) ; complique l'inventaire de sauvegarde | `del` du blob à la suppression, ou passe de réconciliation/GC | S | P3 |
| A09-021 | 🟡 | PITR (jours) confondu avec la conservation légale (années) | Archivage vs sauvegarde | `matrice-conservation.md:14` (factures 10 ans) vs PITR 7-30 j | Confusion « sauvegardé » ≠ « conservé » ; donnée hors fenêtre PITR non récupérable | Clarifier SLA/DPA : conservation = base active + archivage applicatif, pas le PITR | S | P3 |
| A09-022 | 🟡 | Réversibilité éditeur dégradée (package self-host sans Redis ni stockage objet) | Portabilité | `selfhost/templates.ts:45-76` (compose `db`+`app` seulement) — **doublon A08-023** | Sortie de la pile managée possible mais dégradée (anti-abus contournable, bloat base), non annoncée | Ajouter `redis:7-alpine` + option S3/MinIO derrière `storeUpload()` ; annoncer les limites | M | P3 |

---

### 3. FICHES DÉTAILLÉES (toutes les 🔴 et 🟠)

#### A09-001 — Fichiers (Blob) sans aucune sauvegarde — 🔴
- **Constat :** l'unique fonction de stockage écrit tous les fichiers dans Vercel Blob et ne les copie nulle part ailleurs. Vercel Blob n'offre ni versioning, ni PITR, ni soft-delete par défaut : un objet supprimé ou écrasé est **définitivement perdu**.
- **Preuve :** `src/lib/blob.ts:17-24` — `put(..., { access:"public", addRandomSuffix:true })` → `return blob.url` (commentaire ligne 5 : « URL publique **pérenne** »). Le seul autre usage de `@vercel/blob` est `del` (`src/lib/rgpd/anonymise.ts:103`) — **aucune écriture vers un second stockage** nulle part (grep `backup|archive|s3|r2|bucket` côté fichiers → néant). Documents non régénérables concernés : `conventions/${id}/signee` (`convention-signature-actions.ts:59`), `factures/${entrepriseId}` (`facture-actions.ts:60`), `factures-formateur` (`formateur-actions.ts:129`), `dossiers/${candidatId}` — CNI/CV/diplômes scannés (`scan-actions.ts:53`, `dossier-actions.ts:151`), `documents/retour` — satisfaction signée (`document-retour-actions.ts:39`).
- **Scénario d'impact :** un écrasement accidentel, un incident du store Blob, ou une compromission du compte Vercel efface des **preuves juridiques non reproductibles** (convention signée = preuve d'engagement ; émargements ; pièces comptables à conserver 10 ans). Aucune restauration possible : c'est le critère 🔴 « fichiers non sauvegardés » de l'échelle, pris à la lettre.
- **Cause racine :** usage du mode le plus simple de Vercel Blob (stockage direct, URL publique) sans couche de sauvegarde, sur un périmètre qui contient des documents légaux.
- **Recommandation :** réplication/dump périodique **chiffré** des blobs vers un stockage indépendant (S3/R2/MinIO, compte séparé), au minimum pour `conventions/*/signee`, `factures/*`, `factures-formateur/*`, `dossiers/*` ; documenter fréquence + rétention ; **tester** une restauration de fichier.
- **Charge :** M — **Priorité :** P0 — **Type :** Chantier
- **Vérification de la correction :** existence d'un job de sauvegarde des blobs vers un stockage tiers + un fichier restauré avec succès (hash identique) depuis cette copie, chronométré.

#### A09-002 — Base : aucune copie hors-fournisseur ni immuable (règle 3-2-1 violée) — 🔴
- **Constat :** l'unique mécanisme de sauvegarde de la base est le PITR managé de Neon. Il n'existe **aucune copie hors du compte/fournisseur Neon**, ni immuable. La documentation le reconnaît explicitement comme un manque à combler.
- **Preuve :** `docs/PRA-SAUVEGARDE.md:5-8` (seules sauvegardes = « PITR Neon » + « Branches Neon », toutes deux chez Neon). `docs/SECURITE-OPS.md:24-27` — **« À finaliser : (b) mettre en place un export périodique hors fournisseur (dump chiffré hebdomadaire vers un stockage tiers) pour se prémunir d'une compromission du compte Neon lui-même »**. `docs/EXPLOITATION.md:25-27` — « Sauvegarde logique d'appoint (**optionnel, hors Neon**) … `pg_dump` … (**à planifier**) ». Aucun script `pg_dump`/offsite dans `scripts/` ni `.github/`. Facteur aggravant : `AUDIT-08` A08-001 (le poste de dev détient les creds **prod**, dont de quoi supprimer le projet).
- **Scénario d'impact :** le PITR est **interne** à Neon. Une suppression accidentelle du projet, une suspension de compte, un **défaut de paiement** (mémoire projet : quota de transfert Neon déjà dépassé), un rançongiciel ou une compromission du compte détruisent **données ET PITR** simultanément. Il ne resterait **aucune copie** pour reconstruire les émargements/conventions/factures de tous les tenants → sinistre légal Qualiopi/RGPD irréversible.
- **Cause racine :** mise en service rapide sur un socle managé mono-fournisseur, sans jamais externaliser une copie.
- **Recommandation :** cron hebdomadaire `pg_dump -Fc` chiffré (age/GPG) vers un **second fournisseur** (S3/R2/Backblaze) avec **object-lock/WORM** (immuable), rétention ≥ 4 semaines, sur un compte séparé avec MFA ; tester la réimportation.
- **Charge :** M — **Priorité :** P0 — **Type :** Chantier
- **Note d'arbitrage :** Neon PITR **est** un mécanisme automatisé, managé et redondé en interne — il protège des pannes matérielles. Le résidu 🔴 porte uniquement sur les **événements de niveau compte** (suppression/suspension/compromission), non couverts. La correction est modeste (charge M), ce qui rend le maintien en 🔴 proportionné plutôt que sur-dimensionné.
- **Vérification de la correction :** un dump chiffré hors-Neon existe, daté de < 7 j, et une réimportation vers une base neuve a été réalisée et chronométrée.

#### A09-003 — Aucun soft-delete ni corbeille : suppression accidentelle définitive — 🔴
- **Constat :** aucune entité n'a de suppression logique. Les suppressions applicatives sont **matérielles** ; la seule récupération est une restauration PITR globale (non testée, rétention non confirmée).
- **Preuve :** `prisma/schema.prisma` : **`deletedAt` = 0 occurrence**. Le seul champ apparenté, `archivedAt` (`:916-918`), est un **statut métier de Session** (clôture Qualiopi), pas une corbeille. Suppressions matérielles réelles : `src/lib/actions/comptes-actions.ts:117` (`candidat.delete` **sans garde**), `src/lib/actions/inscription-actions.ts:685` (`inscription.delete`), `src/lib/demo/purge.ts:85` (`organisme.delete` — un tenant entier). 48 `onDelete: Cascade` (Candidat → interactions/messages `:782,799` ; Session → séances `:1235`). *Atténuation :* `Inscription.session`/`Inscription.candidat` sont en `Restrict` par défaut (`:1057-1060`) → une suppression échoue tant qu'une inscription rattache l'enregistrement ; mais une fois passée, elle est irréversible. Récupération jamais prouvée (`PRA-SAUVEGARDE.md:26-31`, `EXPLOITATION.md:62` décochés).
- **Scénario d'impact :** un ADMIN client supprime par erreur un candidat, une inscription ou une session → **aucun undo applicatif** (ni corbeille, ni délai). Le seul recours est une restauration PITR de **toute** la base (tous tenants), non testée, à rétention potentiellement ~24 h (A09-017). Au-delà de la fenêtre PITR, la donnée est perdue. Correspond au 🔴 « aucun moyen de récupérer une suppression accidentelle ».
- **Cause racine :** modèle de données pensé pour un usage interne, sans exigence de récupérabilité orientée client.
- **Recommandation :** introduire `deletedAt` + corbeille avec délai de purge sur les entités clés (Candidat, Inscription, Session, Entreprise, Facture) et filtrer les lectures ; à défaut immédiat, **prouver et chronométrer** une restauration PITR partielle.
- **Charge :** L — **Priorité :** P0 — **Type :** Chantier
- **Vérification de la correction :** une suppression suivie d'une restauration depuis la corbeille rétablit l'enregistrement et ses liens ; test consigné.

#### A09-004 — Corruption/purge massive de la prod possible depuis un poste dev — 🟠
- **Constat :** les scripts d'écriture chargent `DATABASE_URL` (= prod, via A08-001) sans garde d'hôte ; un lancement local peut purger la production de tous les tenants. *Angle audit 09 : le seul filet après un tel incident est le PITR non prouvé.*
- **Preuve :** balayage indépendant confirmant A08-007 — **13 scripts sur 15** sans garde d'hôte (`seed-*`, `cleanup-*`, `clean-aguyse-demo`) ; seul `scripts/seed-test.cjs:16-18` a une vraie garde. `scripts/reset-data.ts:22-32` n'a qu'une passphrase (`CONFIRM_DESTRUCTIVE`) **sans** contrôle d'hôte, et `:34-55` exécute un `deleteMany` **non scopé par tenant** (presence, evaluation, paiement, facture, inscription, session, candidat, entreprise, formateur) ; aveu `:10-14`. Croise A08-001 (`.env` = base+secrets prod) et A08-002 (`db push` manuel sans rollback).
- **Scénario d'impact :** un script/test/`db push` local écrit ou purge la prod de **tous les tenants** (atteinte à l'isolation inter-clients → 🔴 par défaut au niveau cause, déjà porté par A08-001). Reprise = PITR global non testé.
- **Cause racine :** outillage mono-opérateur sans hypothèse d'environnements séparés.
- **Recommandation :** helper partagé `assertNotProd()` (liste blanche localhost/branche de test, ou blocage si hôte = prod) sur **tout** script d'écriture ; isoler base + secrets de dev (A08-001).
- **Charge :** M — **Priorité :** P0 — **Type :** Chantier
- **Doublon assumé :** A08-001 / A08-002 / A08-007 — à compter une seule fois lors de la consolidation (prompt 25). Repris ici pour couverture du contrôle « corruption massive ».
- **Vérification de la correction :** un script d'écriture lancé avec `DATABASE_URL` = host prod s'arrête avec une erreur explicite.

#### A09-005 — Reconstruction du schéma impossible sur un point restauré — 🟠
- **Constat :** les migrations Prisma sont gelées ; restaurer les **données** ne fournit pas un **schéma** reconstructible à l'identique, et un PITR vers un point ancien peut livrer un schéma désaligné du code déployé.
- **Preuve :** dernière migration versionnée `prisma/migrations/20260605140000_elearning_v2` (05/06) vs `schema.prisma` modifié le 28/08 ; **97 commits** touchant `schema.prisma` depuis le 05/06 ; `prisma/migrations/add_cnaps_numero_validite.sql` **en vrac à la racine** (ignoré par `prisma migrate deploy`) ; `docs/MIGRATIONS.md:3-8` l'atteste.
- **Scénario d'impact :** en reprise (nouvel environnement, preuve d'audit, PITR ancien), le schéma ne peut être rejoué à l'identique ; un décalage schéma↔code casse tous les tenants. C'est l'angle **DR** du problème déjà relevé côté CI/CD (A08-002).
- **Cause racine :** contournement historique de `migrate dev` sur base partagée, jamais rebasculé vers un flux versionné.
- **Recommandation :** exécuter la re-baseline **déjà outillée** (`docs/db-baseline.sql` + `MIGRATIONS.md:16-37`) puis `prisma migrate deploy` ; associer chaque point de restauration à un couple schéma↔SHA traçable.
- **Charge :** L — **Priorité :** P0 — **Type :** Chantier
- **Doublon assumé :** A08-002 (angle CI/CD) — dédupliquer à la consolidation ; l'angle DR (reconstructibilité) est spécifique à cet audit.
- **Vérification de la correction :** `prisma migrate status` = « up to date » sur une base reconstruite depuis les migrations seules.

#### A09-006 — `SECRETS_ENCRYPTION_KEY` sans coffre/escrow — 🟠
- **Constat :** la clé qui déchiffre les clés API de tous les tenants n'est ni sauvegardée dans un coffre, ni déposée en escrow ; elle ne vit que sur Vercel et sur le poste de l'exploitant.
- **Preuve :** `src/lib/crypto.ts:42-46` — `decryptSecret` : `if (!k) return null; // chiffré mais clé absente → indéchiffrable` ; `crypto.ts:27-30` — `encryptSecret` **lève une exception** en production sans la clé (donc elle est bien posée sur Vercel). `.env.example:15` (« Sans elle, les clés API par OF sont illisibles ») ; `PROD-ENV-CHECKLIST.md:9`. Valeurs **jamais versionnées** (`.gitignore:34`). Aucun coffre en place : `AUDIT/07_securite_rgpd.md:39` liste « Coffre à secrets » en **améliorations futures**.
- **Scénario d'impact :** la clé existe aujourd'hui en double (Vercel + poste), donc le risque n'est pas « 0 copie » mais une **perte simultanée** (Vercel purgé + poste perdu) ou l'**indisponibilité de l'exploitant** : dans ces cas, même la base restaurée laisse les clés API tenant (Brevo/Anthropic/YouSign/Wedof) **définitivement illisibles**. `.env.example` ne fournit que les **noms**, pas les valeurs → reconstruction depuis zéro impossible.
- **Cause racine :** gestion des secrets mono-opérateur, sans dépôt durable indépendant.
- **Recommandation :** consigner l'ensemble des secrets de prod (dont `SECRETS_ENCRYPTION_KEY`, `AUTH_SECRET`, `DATABASE_URL`) dans un gestionnaire chiffré avec **dépôt scellé hors ligne** ; documenter la procédure de reconstruction.
- **Charge :** S — **Priorité :** P0 — **Type :** Standard
- **Note d'arbitrage :** proposé 🔴 par le spécialiste continuité, **rétrogradé à 🟠** par le chef de projet : la clé étant obligatoire en prod (`crypto.ts:27-30`), elle existe déjà de façon redondée (Vercel + poste) ; le trou réel est l'absence d'escrow délibéré + bus factor, sérieux mais pas « copie unique ».
- **Vérification de la correction :** procédure de reconstruction testée à blanc à partir du coffre, sans le poste d'origine.

#### A09-007 — Plan de reprise jamais testé — 🟠
- **Constat :** la procédure de restauration est documentée mais n'a **jamais** été exécutée ; aucune sauvegarde n'a été prouvée restaurable.
- **Preuve :** `docs/PRA-SAUVEGARDE.md:26-31` (4 cases `[ ]` non cochées) ; `docs/EXPLOITATION.md:61-62` (« 1 test de restauration » décoché) ; `docs/DEPLOIEMENT.md:83-84` (« Consigner le délai réel : `____` » vide) ; `docs/SECURITE-OPS.md:118`. Croise le contrôle non réalisé `AUDIT-08:202` (« prod-only »).
- **Scénario d'impact :** une sauvegarde non restaurée n'est pas une sauvegarde. En incident réel, l'exploitant découvre la procédure et ses angles morts sous pression ; RTO/RPO effectifs inconnus. C'est le **critère de validation absolu** de cet audit (§7).
- **Cause racine :** absence d'environnement de préproduction et de créneau dédié au test.
- **Recommandation :** créer une branche Neon de test, exécuter une restauration **réelle chronométrée**, comparer 3-5 compteurs (organismes/candidats/sessions/factures) branche vs prod, consigner date + RTO/RPO mesurés dans `PRA-SAUVEGARDE.md:31`.
- **Charge :** S — **Priorité :** P0 — **Type :** Quick win
- **Vérification de la correction :** section « Test de restauration » renseignée avec date, RTO/RPO mesurés et compteurs comparés.

#### A09-008 — Cibles RPO/RTO incohérentes et irréalistes — 🟠
- **Constat :** trois documents annoncent des RPO/RTO **différents**, aucun mesuré, sur une procédure de restauration **manuelle** peu compatible avec un exploitant unique hors heures.
- **Preuve :** `PRA-SAUVEGARDE.md:14-15` (RPO ≤ 5 min / RTO ≤ 4 h ouvrées) ; `SECURITE-OPS.md:13-14` (RPO ≤ 5 min / **RTO ≤ 2 h**) ; `legal/SLA.md:34-35` (RPO **[1] h** / RTO [4] h, doc « BROUILLON »). Incohérence RPO d'un facteur 12 ; RTO en trois valeurs. Restauration manuelle : `PRA-SAUVEGARDE.md:20-24` (créer branche → basculer `DATABASE_URL` → redéployer).
- **Scénario d'impact :** un RTO ≤ 2 h est intenable pour une astreinte d'une personne le soir/week-end ; contractualiser ces chiffres expose à un manquement SLA dès le premier client.
- **Cause racine :** cibles posées sur plusieurs documents à des moments différents, jamais réconciliées ni éprouvées.
- **Recommandation :** figer un **jeu unique** après le test réel (A09-007), aligner le RPO sur la rétention PITR réellement souscrite (A09-017), fixer un RTO réaliste, ne pas contractualiser tant que non testé.
- **Charge :** S — **Priorité :** P1 — **Type :** Quick win
- **Vérification de la correction :** les trois documents affichent le même couple RPO/RTO, cohérent avec la mesure consignée.

#### A09-009 — Le runbook affirme faussement « Blob versionné côté Vercel » — 🟠
- **Constat :** le seul runbook de reprise déclare « sauvegardé/versionné » le stockage qui contient les preuves légales non régénérables, alors qu'aucun versioning n'existe.
- **Preuve :** `docs/SECURITE-OPS.md:20` (tableau Sauvegardes : « Fichiers (PDF, pièces) | Vercel Blob | **versionné côté Vercel** »). Contredit la réalité (`src/lib/blob.ts`, aucun versioning) **et** `legal/SLA.md:30` (« documents … inclus dans les sauvegardes — **à préciser** »).
- **Scénario d'impact :** en incident, l'exploitant croit pouvoir restaurer une version antérieure d'un fichier — impossible ; et la sauvegarde fichiers (A09-001) ne sera jamais construite puisque le runbook la présente comme acquise. **Fausse assurance qui aggrave A09-001.**
- **Cause racine :** hypothèse non vérifiée sur les capacités de Vercel Blob.
- **Recommandation :** corriger `SECURITE-OPS.md:20` (Blob = copie unique, **pas** de versioning/PITR), aligner sur SLA et sur la sauvegarde à créer (A09-001).
- **Charge :** S — **Priorité :** P1 — **Type :** Quick win
- **Vérification de la correction :** la ligne du runbook reflète l'absence de versioning et renvoie à la sauvegarde tierce mise en place.

#### A09-010 — Après un PITR, références Blob mortes et aucune réconciliation — 🟠
- **Constat :** les URL Blob sont persistées en base ; restaurer la base à T ne restaure pas les blobs (pas de PITR Blob), produisant des références mortes non détectées.
- **Preuve :** `src/app/api/public/piece/[id]/route.ts:71-72` (le proxy renvoie **502 « Indisponible »** si le blob a disparu). URL persistées : `PieceJointe.url`, `Convention.fileUrl/fileUrlSigne`, `Facture.fileUrl`, `DocumentGenere.fileUrl`. Aucun job de réconciliation (grep → néant).
- **Scénario d'impact :** après un PITR (scénario nominal de reprise), une partie des dossiers/conventions/factures affiche des liens cassés, sans détection ni réparation. Les RPO/RTO annoncés ne valent que pour la base ; pour les fichiers, le RPO réel est **nul** (aucune sauvegarde).
- **Cause racine :** couplage base↔Blob sans stratégie de sauvegarde cohérente entre les deux.
- **Recommandation :** sauvegarde des blobs cohérente avec la base (A09-001) + job de réconciliation (détecter/relister les `url` pendantes après restauration).
- **Charge :** M — **Priorité :** P1 — **Type :** Chantier
- **Vérification de la correction :** après une restauration de test, un rapport de réconciliation liste 0 référence morte (ou les répare).

#### A09-011 — Bus factor = 1 : aucun dépôt d'accès ni plan de succession — 🟠
- **Constat :** l'éditeur est une seule personne détenant seule les accès prod ; aucun dépôt d'accès ni plan de continuité en cas d'indisponibilité.
- **Preuve :** `legal/DPA-sous-traitance.md:8` (« CAP SOLUTIONS … représentée par M. … Président ») ; `docs/SECURITE-OPS.md:91` (« Responsable incident : le gérant / dev principal »). Grep `succession|dépôt des accès|plan de continuité|bus factor` → seule occurrence = `AUDIT-08:44` (A08-013, qui **désigne** le risque sans le traiter). Atténuation : le `README.md` a été refait depuis l'audit 08 (onboarding dev), mais cela ne donne **aucun accès aux consoles fournisseurs de prod**.
- **Scénario d'impact :** maladie/accident/départ de l'unique personne → personne ne peut restaurer, redéployer, roter un secret, ni honorer le préavis de réversibilité client.
- **Cause racine :** structure mono-personne sans dispositif de continuité formalisé.
- **Recommandation :** constituer un **dépôt d'accès scellé** (coffre partagé + procédure de bris de glace) confié à un tiers de confiance ; documenter un plan de continuité minimal (qui, quoi, comment).
- **Charge :** M — **Priorité :** P1 — **Type :** Standard
- **Vérification de la correction :** un dépôt d'accès existe et un tiers désigné peut, en test, accéder aux consoles critiques via la procédure.

#### A09-012 — Aucune alerte sur échec de sauvegarde, de cron ou d'anonymisation — 🟠
- **Constat :** rien ne signale un échec de sauvegarde, un cron destructif défaillant ou une anonymisation de masse anormale.
- **Preuve :** `docs/EXPLOITATION.md:45-47` (alerte cron = TODO), checklist `:60-65` **entièrement décochée**. Le cron `rgpd-purge` déclenche une anonymisation de masse (`src/lib/rgpd-retention.ts:26-57` → `src/lib/rgpd/anonymise.ts:124-176` `updateMany`, `statut:"ARCHIVE"` `:84`, `del` blob `:103`) **sans supervision de volumétrie**. Sentry non prouvé actif (A08-008). *(Positif : `/api/health` existe désormais — voir §4 — mais aucun monitor externe n'est branché dessus.)*
- **Scénario d'impact :** une fenêtre PITR réduite, un cron muet ou une anonymisation déclenchée par une durée de conservation mal réglée passent inaperçus jusqu'au jour où l'on a besoin de restaurer.
- **Cause racine :** observabilité de sauvegarde non câblée (dépend de réglages hors dépôt).
- **Recommandation :** monitor externe sur `/api/health` (503 → alerte), alerte sur échec de cron (via `runCron`) et sur volumétrie d'anonymisation, alerte de facturation/rétention Neon, activer Sentry.
- **Charge :** S — **Priorité :** P1 — **Type :** Quick win
- **Vérification de la correction :** un échec simulé de cron et une indisponibilité `/api/health` déclenchent une alerte reçue.

#### A09-013 — Aucun registre d'incidents / de violations rempli — 🟠
- **Constat :** l'obligation de tenir un registre des violations est documentée mais le registre n'existe pas, et aucun incident passé n'est consigné.
- **Preuve :** `legal/procedure-violation-donnees.md:33` (« [ ] **Créer le registre des violations** » — décoché, alors que `:28-29` en pose l'obligation) ; `docs/SECURITE-OPS.md:108-112` (instruction « Tenir un registre… » sans fichier). Aucun fichier registre d'incidents dans le dépôt (`legal/registre-traitements.md` = registre Art. 30 des *traitements*, distinct). Incident opérationnel connu (dépassement quota de transfert Neon) non consigné.
- **Scénario d'impact :** l'obligation RGPD (art. 33-5) de documenter toute violation n'est pas tenue ; aucune mémoire des incidents pour tirer les leçons.
- **Cause racine :** procédure rédigée, exécution non amorcée.
- **Recommandation :** créer le registre (date, faits, données concernées, nb de personnes, mesures, notification CNIL) ; y consigner rétroactivement l'incident Neon. **Croise audit 02 (RGPD).**
- **Charge :** S — **Priorité :** P1 — **Type :** Standard
- **Note d'arbitrage :** l'échelle classe « pas de journal d'incidents » en 🟠 ; maintenu 🟠 (et non 🔴) car c'est une lacune documentaire/process, pas un mécanisme de perte de données.
- **Vérification de la correction :** un fichier registre existe, avec au moins l'incident Neon consigné.

#### A09-014 — Restauration par tenant impossible nativement — 🟠
- **Constat :** la base est multi-tenant partagée ; une branche/PITR Neon restaure toute la base. Restaurer un seul OF à T-antérieur sans écraser les autres n'est pas possible nativement.
- **Preuve :** `prisma/schema.prisma` : **178 `organismeId`**. L'export par tenant existe (`src/app/(app)/administration/export/route.ts:15-40`, ADMIN, scopé, JSON) mais est **en lecture seule**, **sans ré-import** (grep import/restore → 0) et **sans les PDF** (Blob).
- **Scénario d'impact :** si un OF corrompt/supprime ses données par erreur, la remise à T-antérieur exige un SQL sélectif manuel sur des tables liées par FK (risqué), ou impacte les autres tenants. L'export existant ne comble pas le trou.
- **Cause racine :** modèle mono-base partagé sans outillage de restauration scopée.
- **Recommandation :** documenter et éprouver une restauration **sélective par `organismeId`** (branche PITR → extraction scopée → ré-injection contrôlée) ; à terme, prévoir un ré-import de l'export JSON.
- **Charge :** M — **Priorité :** P2 — **Type :** Standard
- **Vérification de la correction :** une restauration d'un tenant de test à T-antérieur réussit sans modifier les autres tenants.

#### A09-015 — Indisponibilité prolongée : pas de mode dégradé, page de statut ni communication — 🟠
- **Constat :** aucune page de statut/maintenance, aucun mode dégradé, aucune procédure de communication client d'incident.
- **Preuve :** aucune page `maintenance/status/statut` dans `src/app/**` (glob → 0). `docs/SECURITE-OPS.md:42` : réponse à une indispo Neon = « **Attendre le rétablissement (managé)** ». `legal/SLA.md:1,9,42` (BROUILLON ; dispo `[99,5] %` placeholder ; « alerting : [à mettre en place] »). Le playbook `SECURITE-OPS.md:88-108` couvre le technique, pas la comm externe. *(Existe : `/api/health` — sonde technique, pas une page publique.)*
- **Scénario d'impact :** pendant une panne, aucun canal de statut ni bascule dégradée ; le premier signal reste un client mécontent ; le SLA n'est pas engageable en l'état.
- **Cause racine :** produit/exploitation centrés sur le fonctionnement nominal.
- **Recommandation :** page de statut hébergée **hors** Vercel/Neon (type statuspage), procédure de communication d'incident, finalisation chiffrée du SLA.
- **Charge :** M — **Priorité :** P2 — **Type :** Standard
- **Vérification de la correction :** une page de statut externe existe et une procédure de comm d'incident est documentée.

#### A09-016 — Export de réversibilité incomplet + bascule fournisseur non testée — 🟠
- **Constat :** la réversibilité **client** existe mais l'export est incomplet (ni consentements/auditLog, ni PDF dans le bundle) et la bascule **éditeur** hors Vercel/Neon n'est ni éprouvée ni amorçable offsite.
- **Preuve :** `src/app/(app)/administration/export/route.ts:26-40` (couvre candidats→paiements, **pas** consentements/auditLog/dossiers ; PDF « téléchargeables individuellement » `clause-reversibilite.md:13`). Self-host dégradé (A08-023, `src/lib/selfhost/templates.ts`). `legal/clause-reversibilite.md:1,19-20` (BROUILLON, délais `[30]j`/`[15]j`). `docs/SECURITE-OPS.md:42-43` (bascule = « redéployer sur un autre hébergeur », non testée). Aucune copie offsite pour ré-amorcer (cf. A09-002).
- **Scénario d'impact :** une fermeture/défaillance prolongée de Neon oblige à exporter dans l'urgence, tenant par tenant, sans amorce offsite ni procédure de bascule éprouvée → RTO réel inconnu, risque de perte si l'accès fournisseur tombe avant l'export.
- **Cause racine :** export conçu pour la réversibilité RGPD self-service, pas pour une reprise éditeur globale.
- **Recommandation :** export **opérateur global** (tous tenants, toutes tables + PDF) planifié offsite (rejoint A09-002) ; documenter et **tester** une bascule vers infra propre (build standalone) ; finaliser la clause de réversibilité.
- **Charge :** M — **Priorité :** P2 — **Type :** Standard
- **Vérification de la correction :** un export global (données + PDF) est produit offsite et une bascule standalone a été testée à blanc.

---

### 4. POINTS CONFORMES (🟢)

> Rappel de la règle : **aucun 🟢 sur la restauration elle-même** (aucune restauration réelle n'a pu être testée). Les points ci-dessous sont des mécanismes **annexes** vérifiés sur pièce, à valoriser dans l'argumentaire commercial et la doc de conformité.

1. **Code source redondé hors Vercel (GitHub).** `git remote -v` → `origin = github.com/capsolutionsdev-jpg/OF-MANAGER.git` ; confirmé `docs/DEPLOIEMENT.md:8`, `README.md:5`, `docs/SECURITE-OPS.md:22`. Le code survit à la disparition du compte Vercel. *Réserve : compte GitHub unique, sans miroir documenté.*
2. **Réversibilité client réelle (export autonome).** `src/app/(app)/administration/export/route.ts:15-40` — export JSON scopé au tenant (`getTenantDb`), réservé ADMIN, rate-limité. Aligné sur `legal/clause-reversibilite.md`. *(Limite : incomplet — voir A09-016.)*
3. **Sondes `/api/health` et `/api/version` présentes.** `src/app/api/health/route.ts:13-22` (`SELECT 1` → 200/503) et `src/app/api/version/route.ts` (SHA/ref/build), **ajoutées depuis l'audit 08** → lèvent A08-006 et fournissent le socle d'A08-009 (l'activation du monitor externe reste à faire, A09-012).
4. **Garde-fou de la purge démo.** `src/lib/demo/purge.ts:55-57` : `purgeDemoOrganisme` **refuse** tout organisme `isDemo:false` (`throw`) → un tenant payant ne peut pas être purgé par ce chemin.
5. **Cron RGPD prudent (anonymise, ne supprime pas).** `src/lib/rgpd-retention.ts:38-48` : n'anonymise que `updatedAt < cutoff` **et** sans session vivante, par lots de 500, et **conserve l'enregistrement**. Conventions signées et factures (non-`PieceJointe`) **échappent** à la purge → pièces comptables 10 ans préservées.
6. **Cron `purge-pdf-cache` non destructif.** `src/app/api/cron/purge-pdf-cache/route.ts:9-10,21` : ne vide qu'un **cache** (`dossierPdf`), régénérable à la demande.
7. **Point de restauration transactionnellement cohérent.** PITR Neon sur WAL continu (`docs/PRA-SAUVEGARDE.md:14`) → un point T est cohérent. Socle 100 % UE (Neon Francfort `eu-central-1`, `legal/DPA-sous-traitance.md:65`).
8. **PRA écrit et accessible hors production.** `docs/PRA-SAUVEGARDE.md`, `docs/SECURITE-OPS.md §1`, `docs/DEPLOIEMENT.md §9` (rollback 3 niveaux) versionnés dans Git = disponibles même prod down. *Réserve : incohérent (A09-008) et non testé (A09-007) ; playbook incident NIST + CNIL 72 h documenté (`SECURITE-OPS.md:88-112`).*

---

### 5. CONTRÔLES NON RÉALISÉS

| Contrôle | Raison | Ce qu'il faudrait pour le faire |
|---|---|---|
| **Restauration réelle (critère absolu §7)** | Interdiction de toucher la prod ; pas de préprod ; aucune restauration jamais faite | Créer une branche Neon de test, restaurer, chronométrer RTO/RPO, comparer les compteurs |
| **Plan Neon réel + fenêtre PITR effective** | Hors dépôt (dashboard Neon) | Console Neon → Settings → History retention ; relever la fenêtre et le plan |
| **Chiffrement au repos Neon** | `DPA:75` = placeholder `[chiffrement disque hébergeur]` | Attestation Neon (AES-256 at-rest) + inscription au DPA |
| **Versioning / config du store Vercel Blob** | Hors dépôt (dashboard Vercel) ; affirmé faussement dans le runbook (A09-009) | Vérifier au dashboard si un versioning/rétention est activé (par défaut : non) |
| **MFA + restriction d'accès Neon/Vercel/GitHub** | Hors dépôt | Vérifier l'activation du MFA et des accès restreints (condition d'immutabilité) |
| **Sentry DSN + monitor uptime posés en prod** | Variables Vercel hors dépôt (A08-008/009) | Vercel → Env Vars (Production) + config du moniteur externe |
| **Copie/synchro non maîtrisée du `.env` du poste** | Nécessite d'inspecter le poste | Vérifier l'absence de synchro cloud (OneDrive) du `.env` prod |

---

### 6. QUICK WINS
*(fort risque, charge S — à traiter en premier)*
- **A09-007** — Exécuter **une restauration réelle chronométrée** vers une branche Neon (le geste le plus important de tout l'audit). *(S, P0)*
- **A09-009** — Corriger la fausse affirmation « Blob versionné côté Vercel » dans `SECURITE-OPS.md:20`. *(S, P1)*
- **A09-008** — Réconcilier les RPO/RTO sur les 3 documents. *(S, P1)*
- **A09-012** — Brancher un monitor externe sur `/api/health` + alerte échec cron. *(S, P1)*
- **A09-006** — Déposer les secrets prod (dont `SECRETS_ENCRYPTION_KEY`) dans un coffre scellé. *(S, P0)*
- **A09-013** — Créer le fichier registre des incidents/violations. *(S, P1)*
- **A09-017** — Relever le plan Neon et fixer la rétention PITR dans PRA/SLA. *(S, P1)*

---

### 7. PLAN DE REMÉDIATION

**Vague 1 — avant Go-Live (P0) — conditions de levée du GO CONDITIONNEL :** *(charge cumulée ~ 2,5 à 4 semaines-personne)*
- A09-007 (restauration réelle testée, S) · A09-009 (corriger le runbook, S) · A09-006 (escrow secrets, S)
- A09-001 (sauvegarde des fichiers Blob, M) · A09-002 (dump base offsite immuable, M) · A09-004 (garde d'hôte scripts + isolation dev/prod, M)
- A09-003 (soft-delete/corbeille, L) · A09-005 (re-baseline migrations, L)

**Vague 2 — J+30 (P1) :**
- A09-008 (RPO/RTO unifiés) · A09-010 (réconciliation base↔Blob, M) · A09-011 (dépôt d'accès, M) · A09-012 (alerting, S) · A09-013 (registre incidents, S) · A09-017 (rétention PITR, S)

**Vague 3 — J+90 (P2/P3) :**
- A09-014 (restauration par tenant) · A09-015 (page de statut/mode dégradé) · A09-016 (export global + bascule testée) · A09-018 (auto-heal idempotence) · A09-019 (docs continuité au propre) · A09-020 (blobs orphelins) · A09-021 (archivage vs PITR) · A09-022 (self-host Redis/objet, dup A08-023)

---

### 8. ANNEXES

**Fichiers analysés (extrait) :** `docs/PRA-SAUVEGARDE.md`, `docs/SECURITE-OPS.md`, `docs/EXPLOITATION.md`, `docs/DEPLOIEMENT.md`, `docs/MIGRATIONS.md`, `docs/ETUDE-COUTS-INFRA.md`, `docs/PROD-ENV-CHECKLIST.md`, `docs/ROTATION-SECRETS.md`, `legal/SLA.md`, `legal/clause-reversibilite.md`, `legal/DPA-sous-traitance.md`, `legal/procedure-violation-donnees.md`, `legal/matrice-conservation.md`, `legal/registre-traitements.md`, `prisma/schema.prisma`, `prisma/migrations/`, `vercel.json`, `.env.example`, `.gitignore`, `.github/workflows/cron-external.yml`, `src/lib/blob.ts`, `src/lib/crypto.ts`, `src/lib/rgpd/anonymise.ts`, `src/lib/rgpd-retention.ts`, `src/lib/demo/purge.ts`, `src/lib/documents/publish.ts`, `src/lib/selfhost/templates.ts`, `src/app/(app)/administration/export/route.ts`, `src/app/api/public/piece/[id]/route.ts`, `src/app/api/health/route.ts`, `src/app/api/version/route.ts`, `src/app/api/cron/*`, `src/lib/actions/{comptes,inscription,dossier,facture,formateur,convention-signature,scan,document-retour}-actions.ts`, `scripts/{reset-data.ts,seed-*.cjs,cleanup-*.cjs}`, `audits/AUDIT-08-infrastructure-devops.md`.

**Méthode :** 4 sous-agents spécialistes en parallèle (analyse statique, lecture seule) + contre-vérification live du chef de projet sur les pièces des 🔴/🟠. Aucune connexion prod, aucun script exécuté, aucune restauration réelle. Gravités arbitrées par le chef de projet (dont rétrogradation A09-006 🔴→🟠).

**Croisements inter-audits :** A08-001 (dev=prod), A08-002 (db push), A08-003 (Blob public), A08-007 (scripts sans garde), A08-008/009 (observabilité), A08-013 (bus factor), A08-023 (self-host) ; audit 02 (RGPD — registre violations, résidence). À dédupliquer lors de la consolidation (prompt 25).

---

### 9. BLOC DE CONSOLIDATION (ne pas modifier le format)

```json
{
  "audit_id": 9,
  "audit_nom": "Audit Backup / Disaster Recovery",
  "date": "2026-08-30",
  "commit": "5d3f9e4",
  "verdict": "GO_CONDITIONNEL",
  "compteurs": {"rouge": 3, "orange": 13, "jaune": 6, "vert": 8, "non_verifie": 7},
  "anomalies": [
    {"id": "A09-001", "gravite": "rouge", "titre": "Fichiers (Blob) sans aucune sauvegarde (copie unique)", "composant": "Stockage fichiers", "preuve": "src/lib/blob.ts:17-24 (put public, 0 versioning) ; aucune ecriture vers un 2e stockage", "impact": "Perte definitive des conventions signees, CNI, factures (Qualiopi + 10 ans compta)", "recommandation": "Dump/replication chiffre des blobs vers stockage tiers + test de restauration", "charge": "M", "priorite": "P0", "type": "chantier", "depend_de": []},
    {"id": "A09-002", "gravite": "rouge", "titre": "Base : aucune copie hors-fournisseur ni immuable (3-2-1 violee)", "composant": "Sauvegarde base (Neon PITR)", "preuve": "docs/PRA-SAUVEGARDE.md:5-8 ; docs/SECURITE-OPS.md:24-27 (offsite a finaliser) ; docs/EXPLOITATION.md:25-27", "impact": "Suppression/suspension/defaut de paiement/compromission du compte Neon = perte totale, PITR inclus", "recommandation": "pg_dump -Fc chiffre hebdo vers 2e fournisseur immuable (object-lock) + test reimport", "charge": "M", "priorite": "P0", "type": "chantier", "depend_de": []},
    {"id": "A09-003", "gravite": "rouge", "titre": "Aucun soft-delete ni corbeille : suppression accidentelle definitive", "composant": "Schema + actions de suppression", "preuve": "schema.prisma deletedAt=0 ; comptes-actions.ts:117 (candidat.delete sans garde) ; inscription-actions.ts:685 ; 48 onDelete:Cascade", "impact": "Un ADMIN client qui supprime par erreur n'a aucun undo ; recours = PITR global non prouve", "recommandation": "Soft-delete (deletedAt) + corbeille avec delai sur Candidat/Inscription/Session/Entreprise/Facture", "charge": "L", "priorite": "P0", "type": "chantier", "depend_de": []},
    {"id": "A09-004", "gravite": "orange", "titre": "Corruption/purge massive de la prod possible depuis un poste dev", "composant": "Scripts + environnement", "preuve": "reset-data.ts:10-14,34-55 (deleteMany cross-tenant, garde=passphrase seule) ; 13/15 scripts sans garde d'hote", "impact": "Un script/db push/test local purge tous les tenants ; seule issue = PITR non prouve", "recommandation": "Helper assertNotProd() sur tout script d'ecriture + isolation dev/prod (A08-001)", "charge": "M", "priorite": "P0", "type": "chantier", "depend_de": ["A08-001", "A08-002", "A08-007"]},
    {"id": "A09-005", "gravite": "orange", "titre": "Reconstruction du schema impossible sur un point restaure (derive migrations)", "composant": "Migrations / DR", "preuve": "derniere migration 20260605140000 vs schema.prisma 28/08 (97 commits) ; add_cnaps_numero_validite.sql hors dossier horodate", "impact": "PITR vers point ancien = schema desaligne du code -> tenants casses ; reconstruction impossible", "recommandation": "Re-baseline docs/db-baseline.sql + prisma migrate deploy ; bannir db push en prod", "charge": "L", "priorite": "P0", "type": "chantier", "depend_de": ["A08-002"]},
    {"id": "A09-006", "gravite": "orange", "titre": "SECRETS_ENCRYPTION_KEY sans coffre/escrow (reconstruction)", "composant": "Secrets / reconstruction", "preuve": "crypto.ts:42-46 (cle absente -> illisible) ; crypto.ts:27-30 (obligatoire en prod) ; .gitignore:34 ; coffre = amelioration future (AUDIT/07:39)", "impact": "Perte simultanee Vercel+poste (ou editeur indispo) = cles API tenant definitivement illisibles", "recommandation": "Coffre chiffre + depot scelle hors-ligne + procedure de reconstruction", "charge": "S", "priorite": "P0", "type": "standard", "depend_de": []},
    {"id": "A09-007", "gravite": "orange", "titre": "Plan de reprise jamais teste - aucune sauvegarde prouvee restaurable", "composant": "PRA", "preuve": "PRA-SAUVEGARDE.md:26-31 (cases vides) ; EXPLOITATION.md:62 decoche ; DEPLOIEMENT.md:84 (delai vide)", "impact": "RTO/RPO reels inconnus ; procedure decouverte sous incident. Critere de validation absolu de l'audit", "recommandation": "Restauration reelle chronometree vers branche Neon + comparer 3-5 compteurs + consigner", "charge": "S", "priorite": "P0", "type": "quick_win", "depend_de": []},
    {"id": "A09-008", "gravite": "orange", "titre": "Cibles RPO/RTO incoherentes (3 documents) et irrealistes pour un exploitant seul", "composant": "SLA / PRA", "preuve": "RPO 5min (PRA:14) vs 1h (SLA:35) ; RTO 4h ouvrees / 4h / 2h (PRA:15, SLA:34, SECURITE-OPS:14)", "impact": "Engagement SLA sur base fausse et non mesuree -> manquement des le 1er client", "recommandation": "Figer un jeu unique apres le test reel ; aligner les 3 docs sur la retention PITR reelle", "charge": "S", "priorite": "P1", "type": "quick_win", "depend_de": ["A09-007", "A09-017"]},
    {"id": "A09-009", "gravite": "orange", "titre": "Le runbook PRA affirme faussement que Blob est versionne cote Vercel", "composant": "Doc exploitation", "preuve": "SECURITE-OPS.md:20 vs realite (blob.ts, 0 versioning) + SLA.md:30 (a preciser)", "impact": "Fausse assurance : sauvegarde fichiers jamais mise en place ; illusion de restauration", "recommandation": "Corriger la table (Blob = copie unique, sans versioning) + aligner sur SLA + A09-001", "charge": "S", "priorite": "P1", "type": "quick_win", "depend_de": []},
    {"id": "A09-010", "gravite": "orange", "titre": "Apres un PITR, references Blob mortes (502) ; aucune reconciliation base<->fichiers", "composant": "Coherence Neon<->Blob", "preuve": "api/public/piece/[id]/route.ts:71-72 (502 si blob absent) ; URL persistees en base", "impact": "Apres restauration, dossiers/conventions/factures en liens casses non detectes ; RPO fichiers = nul", "recommandation": "Sauvegarde blobs coherente (A09-001) + job de reconciliation des URL pendantes", "charge": "M", "priorite": "P1", "type": "chantier", "depend_de": ["A09-001"]},
    {"id": "A09-011", "gravite": "orange", "titre": "Bus factor = 1 : aucun depot d'acces ni plan de succession", "composant": "Continuite editeur", "preuve": "DPA:8 (un seul president) ; SECURITE-OPS.md:91 ; grep succession/depot acces -> neant (AUDIT-08:44)", "impact": "Editeur indispo = personne ne peut restaurer, roter un secret, ni honorer la reversibilite", "recommandation": "Depot d'acces scelle + procedure de bris de glace confiee a un tiers", "charge": "M", "priorite": "P1", "type": "standard", "depend_de": []},
    {"id": "A09-012", "gravite": "orange", "titre": "Aucune alerte sur echec de sauvegarde, de cron ou d'anonymisation", "composant": "Supervision", "preuve": "EXPLOITATION.md:45-47,60-65 (TODO/decoche) ; anonymise.ts:103,124-176 (purge muette) ; A08-008/009", "impact": "Degradation PITR, quota Neon, cron destructif ou anonymisation massive passent inapercus", "recommandation": "Monitor externe sur /api/health + alerte echec cron (runCron) + alerte volumetrie anonymisation", "charge": "S", "priorite": "P1", "type": "quick_win", "depend_de": []},
    {"id": "A09-013", "gravite": "orange", "titre": "Aucun registre d'incidents / de violations rempli", "composant": "Conformite / exploitation", "preuve": "procedure-violation-donnees.md:33 (case decochee) ; SECURITE-OPS.md:108-112 (instruction sans fichier)", "impact": "Obligation RGPD art. 33-5 non tenue ; aucune memoire des incidents (ex. quota Neon)", "recommandation": "Creer le registre (date, faits, donnees, personnes, mesures, notif CNIL) + consigner retroactivement", "charge": "S", "priorite": "P1", "type": "standard", "depend_de": []},
    {"id": "A09-014", "gravite": "orange", "titre": "Restauration par tenant impossible nativement", "composant": "Multi-tenant / granularite", "preuve": "schema.prisma 178 organismeId ; administration/export/route.ts:15-40 (lecture seule, sans re-import, sans PDF)", "impact": "Restaurer un OF a T-anterieur sans ecraser les autres = SQL selectif manuel risque", "recommandation": "Documenter/eprouver une restauration selective par organismeId ; prevoir un re-import de l'export", "charge": "M", "priorite": "P2", "type": "standard", "depend_de": []},
    {"id": "A09-015", "gravite": "orange", "titre": "Indisponibilite prolongee : aucun mode degrade, page de statut ni communication client", "composant": "Exploitation / produit", "preuve": "aucune page status/maintenance (src/app/**) ; SECURITE-OPS.md:42 (Attendre le retablissement) ; SLA.md:9,42 (brouillon)", "impact": "Pendant une panne, le 1er signal est un client mecontent ; SLA non engageable", "recommandation": "Page de statut hebergee hors Vercel/Neon + procedure de comm d'incident + finaliser le SLA", "charge": "M", "priorite": "P2", "type": "standard", "depend_de": []},
    {"id": "A09-016", "gravite": "orange", "titre": "Export de reversibilite incomplet + bascule fournisseur non testee", "composant": "Reversibilite / portabilite", "preuve": "administration/export/route.ts:26-40 (sans consentements/auditLog/PDF) ; clause-reversibilite.md:13,19-20 (brouillon) ; self-host degrade (A08-023)", "impact": "Sortie/bascule dans l'urgence, tenant par tenant, sans amorce offsite ni procedure eprouvee", "recommandation": "Export operateur global (toutes tables + PDF) planifie offsite + tester une bascule standalone", "charge": "M", "priorite": "P2", "type": "standard", "depend_de": ["A09-002"]},
    {"id": "A09-017", "gravite": "jaune", "titre": "Retention PITR non fixee + presomption de plan insuffisant (Free ~ 24h)", "composant": "Retention", "preuve": "EXPLOITATION.md:13-16 (Free ~24h insuffisant) ; cron-external.yml (Hobby) ; plan non atteste", "impact": "Une erreur decouverte > 24h serait irrecuperable (delais Qualiopi/financeurs en mois)", "recommandation": "Relever le plan Neon, viser >= 7-30 j, l'inscrire dans PRA + SLA", "charge": "S", "priorite": "P1", "type": "quick_win", "depend_de": []},
    {"id": "A09-018", "gravite": "jaune", "titre": "Auto-heal casse par idempotence apres perte d'un blob regenerable", "composant": "Publication B2B", "preuve": "documents/publish.ts:39-43 (fileUrl not null -> deja publie)", "impact": "Meme les documents regenerables restent perdus (lien mort) jusqu'a purge manuelle", "recommandation": "Verifier l'existence du blob avant deja publie / invalider fileUrl sur 502", "charge": "S", "priorite": "P2", "type": "correctif", "depend_de": []},
    {"id": "A09-019", "gravite": "jaune", "titre": "Documents de continuite/SLA tous en BROUILLON avec placeholders (dette systemique)", "composant": "Documentation contractuelle", "preuve": "SLA.md:1, clause-reversibilite.md:1, procedure-violation-donnees.md:3, registre-traitements.md (brouillons) ; SLA.md:30", "impact": "Aucun engagement de continuite opposable ni coherent avant le 1er client payant", "recommandation": "Figer les valeurs sur mesures reelles + validation juridique (ensemble)", "charge": "M", "priorite": "P2", "type": "standard", "depend_de": []},
    {"id": "A09-020", "gravite": "jaune", "titre": "Blobs orphelins : suppression d'une piece efface la ligne mais pas le blob", "composant": "Parcours candidat", "preuve": "dossier-actions.ts:222 (pieceJointe.delete sans del)", "impact": "Fuite de stockage + fichiers accessibles hors app (croise A08-003) ; complique l'inventaire de sauvegarde", "recommandation": "del du blob a la suppression, ou passe de reconciliation/GC", "charge": "S", "priorite": "P3", "type": "correctif", "depend_de": []},
    {"id": "A09-021", "gravite": "jaune", "titre": "PITR (jours) confondu avec la conservation legale (annees)", "composant": "Archivage vs sauvegarde", "preuve": "matrice-conservation.md:14 (factures 10 ans) vs PITR 7-30 j", "impact": "Confusion sauvegarde != conservation ; donnee hors fenetre PITR non recuperable", "recommandation": "Clarifier SLA/DPA : conservation = base active + archivage applicatif, pas le PITR", "charge": "S", "priorite": "P3", "type": "quick_win", "depend_de": []},
    {"id": "A09-022", "gravite": "jaune", "titre": "Reversibilite editeur degradee (self-host sans Redis ni stockage objet)", "composant": "Portabilite", "preuve": "selfhost/templates.ts:45-76 (compose db+app seulement) - doublon A08-023", "impact": "Sortie de la pile managee possible mais degradee (anti-abus contournable, bloat base), non annoncee", "recommandation": "Ajouter redis:7-alpine + option S3/MinIO derriere storeUpload() ; annoncer les limites", "charge": "M", "priorite": "P3", "type": "standard", "depend_de": ["A08-023"]}
  ],
  "conditions_go": [
    "A09-007 : realiser et documenter une restauration reelle chronometree (critere absolu)",
    "A09-001 : sauvegarde des fichiers Blob hors-Blob (dump/replication chiffree vers stockage tiers)",
    "A09-002 : dump base chiffre hors-fournisseur immuable + retention PITR confirmee (A09-017)",
    "A09-003 : soft-delete/corbeille sur entites cles (ou restauration PITR partielle prouvee)",
    "A09-004 : garde d'hote anti-prod sur tous les scripts d'ecriture + isolation dev/prod (A08-001)",
    "A09-005 : re-baseline des migrations versionnees (A08-002)",
    "A09-006 : escrow du SECRETS_ENCRYPTION_KEY + depot d'acces (A09-011)"
  ],
  "risques_residuels": [
    "Retention PITR reelle non confirmee (potentiellement ~24h si plan Free) -> A09-017 hors depot",
    "Chiffrement au repos Neon non atteste (placeholder DPA:75)",
    "MFA/acces Neon/Vercel/GitHub non verifies (condition d'immutabilite anti-rancongiciel)",
    "Sentry/monitor uptime non prouves actifs en prod (A08-008/009)"
  ]
}
```
