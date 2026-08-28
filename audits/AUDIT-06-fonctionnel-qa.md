# COMPTE RENDU D'AUDIT 06 — Audit fonctionnel / QA
## OFMANAGER — Programme d'audit de pré-commercialisation

**Date :** 2026-08-28
**Version auditée :** branche `fix/remediation-audits-05-02` — commit `ed5986e31ec55600d814c7cc06a9329bcb7dc09c`
**Chef de projet audit :** Claude Code (chef de projet senior)
**Équipe mobilisée :** Responsable QA / ingénieur test automatisé, Testeur fonctionnel métier OF (calculs financiers), Analyste numérotation & machines à états, Testeur fonctionnel parcours E2E, Testeur exploratoire & analyste régressions (5 sous-agents parallèles) + arbitrage et contre-vérification du chef de projet.
**Périmètre couvert :** parcours métier de bout en bout (prospect → devis → convention → session → émargement → attestation → facture → BPF → clôture), règles métier et calculs (HT/TVA/TTC, remises, acomptes/solde, numérotation), machines à états, cas limites/robustesse, et dispositif de test automatisé (inventaire + exécution réelle du sous-ensemble logique).
**Durée / profondeur :** analyse statique du code + schéma Prisma (3016 lignes) + exécution locale sécurisée de 14 fichiers de tests logiques purs (228 tests). Aucune écriture en base, aucun test sur environnement de production. Le rendu PDF réel (Chromium) et les tests d'intégration (isolation multi-tenant) n'ont pas été exécutés (cf. §5).

---

### 1. SYNTHÈSE EXÉCUTIVE

Le produit **fait réellement** le métier d'un organisme de formation, de bout en bout : catalogue, sessions, inscriptions multicanales, moteur documentaire Qualiopi (22 modèles rendus en PDF), automatisation par cron (convocations, attestations, satisfaction, certificats), émargement électronique multi-modal (feuille, QR de salle, signature à distance), certification/diplômes, BPF aligné CERFA, clôture gardée. Les **moteurs de calcul sont corrects** (HT/TVA/TTC, remises, solde/acompte avec tolérance au centime, FEC, exonération de TVA) et le **socle de tests logiques est vert** (228/228 exécutés). La **CI bloque** réellement un build ou des tests cassés.

Deux défauts **bloquants** ressortent, tous deux à la *restitution* et non au calcul : (1) le **certificat de réalisation** (et le BPF) affichent la **durée planifiée** — les heures réellement suivies ne sont **jamais** calculées, alors que l'émargement les capture ; sur une présence partielle, c'est un document légal erroné exposant l'OF à une reprise de financement. (2) Le formateur d'affichage `euros()` **arrondit à l'euro entier** et sert dans le PDF légal de facture et le contrat signé : la face lisible affiche « 161 € » quand le XML Factur-X embarqué et le prélèvement SEPA valent 160,65 € — facture électronique incohérente avec elle-même. Les majeurs suivants concernent la **génération de facture client absente** (dépôt de PDF externe uniquement), la **troncature de l'émargement au 60ᵉ jour** sur formations longues, et la **perte silencieuse des règlements** à la suppression d'une inscription.

| 🔴 Rouge | 🟠 Orange | 🟡 Jaune | 🟢 Vert |
|---|---|---|---|
| 2 | 12 | 10 | 12 |

**VERDICT : GO CONDITIONNEL**
Le socle fonctionnel est sain et réellement livré ; aucun blocage architectural. La commercialisation est conditionnée à la correction des **2 P0** (A06-001 certificat/heures réelles, A06-002 arrondi `euros()`), tous deux de charge faible à moyenne. Les majeurs P1 (facture client, émargement > 60 j, perte de règlements) doivent être traités avant les premiers clients payants.

---

### 2. TABLEAU DES ANOMALIES

| ID | Gravité | Titre | Composant | Preuve | Impact | Recommandation | Charge | Priorité |
|---|---|---|---|---|---|---|---|---|
| A06-001 | 🔴 | Certificat de réalisation & BPF = durée **planifiée** ; heures réellement suivies jamais calculées | documents/émargement | `resolve.ts:109`, `templates.ts:433-443`, grep `heuresRealisees\|assiduite` = ∅ | Document légal faux sur présence partielle → reprise de financement CPF/OPCO | Dériver heures réalisées + taux d'assiduité depuis les émargements ; injecter dans certificat & BPF | M | P0 |
| A06-002 | 🔴 | `euros()` arrondit à l'euro entier sur documents légaux (facture éditeur + contrat) → face PDF ≠ XML Factur-X ≠ SEPA | plans/factures/contrats | `plans.ts:162` `maximumFractionDigits:0` ; `editeur.ts:211-213` ; `prestation.ts:238` | Facture électronique incohérente (rejet PDP), contrat signé sur montant erroné, PU 0,01 € → « 0 € » | Formateur monétaire **2 décimales** dédié aux documents ; réserver `euros()` aux tableaux de bord | S | P0 |
| A06-003 | 🟠 | Facture client **non générée** : dépôt de PDF externe uniquement, B2B seul (aucune facture pour particuliers) | factures | `facture-actions.ts:17` (« Pas de génération »), enum `DocumentType` sans `FACTURE` (schema:429-461) | Fonction cœur absente : facturer ailleurs puis re-téléverser ; CA/compta incomplets | Générateur de facture (numérotation atomique, lignes depuis devis/inscription, PDF) B2B + particuliers | L | P1 |
| A06-004 | 🟠 | Émargement & séances **tronqués au 60ᵉ jour** (`guard < 60`) | émargement | `emargement.ts:25`, dupliqué `emargement-actions.ts:46` ; exéc. : 121 j → 44 jours, dernier 05/03 au lieu du 05/05 | Formations longues (titre pro, Capacité Transport 105 h) : aucun émargement après J60 → trou de preuve Qualiopi | Relever/supprimer le plafond (borne ~366) ; unifier les 2 fonctions | S | P1 |
| A06-005 | 🟠 | Suppression d'une inscription **efface en cascade ses règlements** (Paiement), sans garde | inscriptions | `inscription-actions.ts:639` `delete` sans vérif ; `schema:1628` `Paiement…onDelete:Cascade` | Retirer un stagiaire (op. courante) détruit silencieusement ses `Paiement` (preuve d'encaissement) | Bloquer si `paiements`/`factures` existent (proposer annulation) ; passer Paiement en `Restrict` | S | P1 |
| A06-006 | 🟠 | `cancelCivicPayment` annule un paiement **sans émettre d'avoir** alors qu'une facture existe | facturation civique | `civique-actions.ts:351` (`statut:"annule"`, aucune garde) vs `refundCivicPayment:338` (émet l'avoir) | Facture fiscale numérotée orpheline (sans document d'annulation) → écart comptable | Bloquer l'annulation si une `CivicFacture` existe, ou émettre l'avoir comme le remboursement | S | P1 |
| A06-007 | 🟠 | N° de facture (civique) **alloué hors transaction** de création → trou de séquence possible | numérotation | `civique-api.ts:252` `create` avec `numero:await nextFactureNumero()` ; aucun `$transaction` | Échec d'insertion après incrément → n° brûlé = rupture de continuité (CGI) ; idem devis/convention | Envelopper allocation + insert dans `prisma.$transaction` (rollback annule l'incrément) | M | P1 |
| A06-008 | 🟠 | Devis : totaux **non arrondis** (`round2` absent) + ligne TVA = `ttc − ht` incohérente avec le taux | devis | `devis-actions.ts:41-42` (pas de `round2`) ; `devis/[id]/page.tsx:170` ; exéc. : 7,5 h × 66,67 €, TVA affichée 100,00 ≠ 100,01 | « Bon pour accord » signé dont HT + TVA ≠ TTC et TVA contredit le taux | Aligner sur `calcMontants` ; afficher le montant TVA calculé, pas `ttc − ht` | S | P1 |
| A06-009 | 🟠 | Double-soumission d'un règlement → **paiement compté deux fois** (pas d'idempotence) | paiements | `paiement-actions.ts:54` `create` sans clé anti-rejeu ; recalcul `Σ paiements` `:66-75` | Double-clic/renvoi réseau → total encaissé surévalué, bascule erronée en PAYE | Jeton anti-rejeu, ou `@@unique(inscriptionId,montant,date,mode,reference)` | M | P2 |
| A06-010 | 🟠 | Suppression d'un **formateur** → cascade sur ses `FactureFormateur` ; garde « FK-protégée » inopérante | comptes | `comptes-actions.ts:112` `delete` ; `schema:1651` `onDelete:Cascade` ; le `catch` P2003 `:133` jamais atteint | Suppression réussit toujours et **efface les factures de sous-traitance** (commentaire trompeur) | Bloquer si `factures`/`sessions` liées (comme pour le candidat) | S | P2 |
| A06-011 | 🟠 | **Aucune garde de transition de statut** (facture éditeur / devis / session) | machines à états | `facture-editeur-actions.ts:168-181` (ENCAISSEE→BROUILLON) ; `devis-actions.ts:134-148` ; `session-actions.ts:261` édite TERMINEE/ANNULEE | Réouverture d'une facture encaissée ; modif d'une session close ; annulation qui ne réconcilie ni inscriptions ni factures | Table de transitions autorisées + garde sur sessions TERMINEE/ANNULEE | M | P2 |
| A06-012 | 🟠 | Listes volumineuses **non paginées** (`findMany` sans `take`/`cursor`) | listing / perf | 107 `findMany(` vs 19 `take:` ; `comptabilite/page.tsx:54`, `console/prospects/page.tsx:13` (cross-tenant) | Sur OF mûr (milliers de lignes) : latence, mémoire/timeout Vercel, coût transfert Neon | Pagination serveur (`take`+`cursor`), comptabilité & console d'abord *(recouvre l'audit 07)* | L | P2 |
| A06-013 | 🟠 | Diplôme SSIAP : **aucune contrainte d'unicité DB** sur `numeroDiplome` | anti-fraude | `schema:2528` `numeroDiplome String?` (ni `@unique` ni `@@unique`) ; check applicatif non atomique | N° préfectoral dupliqué → registre de vérification anti-fraude invérifiable pour le 2ᵉ titre | `@@unique([organismeId, numeroDiplome])` | S | P2 |
| A06-014 | 🟠 | « Paiement en ligne Stripe (CB, SEPA) » pour devis/factures **annoncé, non implémenté** | promesse/réel | `fonctionnalites/page.tsx:224` ; Stripe branché seulement sur l'abonnement SaaS & civique | Le client final ne peut pas régler en ligne un devis/une facture | Brancher Stripe Checkout sur devis/facture, **ou** corriger la promesse | L | P2 |
| A06-015 | 🟡 | Factur-X : `CategoryCode` figé à « S », pas d'`ExemptionReason` si taux 0 (latent) | factures | `editeur.ts:264,291` ; non déclenché (éditeur `tauxTva=20`, `facture-editeur-actions.ts:63`) | Latent : XML EN 16931 rejeté le jour d'une facture exonérée | Dériver la catégorie du taux (0 → « E ») + `ExemptionReason` | M | P2 |
| A06-016 | 🟡 | Validation hétérogène : 26 actions sans schéma zod ; date malformée → 500 non géré | validation | `salle-actions.ts:22` (sans `.max()`) ; `public-inscription-actions.ts:64` `new Date(v.dateNaissance)` ; `session-actions.ts:76` | Chaînes non bornées stockées ; `new Date("abc")` → erreur 500 au lieu d'un message | Généraliser `safeParse` + `.max()` + validation de format de date | M | P2 |
| A06-017 | 🟡 | Course à la création de candidat (formulaire public) → doublons | inscriptions | `public-inscription-actions.ts:53-57` (`findFirst` puis `create`) ; `Candidat.email` `@@index` non `@@unique` (schema:765) | 2 soumissions quasi-simultanées (email neuf) → 2 candidats + 2 inscriptions | `@@unique([organismeId,email])` + `upsert` ; throttle sur l'endpoint public | M | P2 |
| A06-018 | 🟡 | `CONV` & titres numérotés **sans `seedExisting`** → ré-amorçage à 0001 (collision si import historique) | numérotation | `convention-actions.ts:115` `nextRef(org.id,"CONV")` ; `numero.ts:62,74` ; `numerotation.ts:36` | Après reprise/import, collision (convention `@unique` → throw ; diplôme sans unique → doublon) | Fournir `seedExisting` scopé année pour CONV et titres | S | P2 |
| A06-019 | 🟡 | Jours fériés jamais exclus + incohérence week-end entre `genererSeances` et `joursSession` | émargement | `emargement.ts:28-29` (filtre sam/dim seul) ; `emargement-actions.ts:46-58` (jours calendaires) ; exéc. : 01/05 inclus | Feuille d'émargement un jour férié ; week-ends après « Générer les séances » | Calendrier de fériés FR ; unifier la règle week-end | M | P3 |
| A06-020 | 🟡 | `count()+1` réintroduit sur `FactureEditeur` (l'anti-pattern banni par `numerotation.ts`) | numérotation | `facture-editeur-actions.ts:99-101` vs `numerotation.ts:7` ; mitigé par `numero @unique` (schema:236) | 2 émissions concurrentes → échec P2002 non catché (SUPERADMIN, mensuel) ; pas de doublon silencieux | Utiliser `nextSequence` (clé globale éditeur) | S | P3 |
| A06-021 | 🟡 | `maxSuffix` suppose la séquence en dernier segment `-` (fragile aux suffixes) | numérotation | `numerotation.ts:73` `Number(r.split("-").pop())` (cf. test `numerotation.test.ts:15`) | `FAC-2026-0007-BIS` → NaN ignoré → sous-amorçage → doublon/trou après évolution de format | Parser la séquence par regex ancrée, pas `pop()` | S | P3 |
| A06-022 | 🟡 | « Dû » incohérent entre la fiche paiements du candidat et la comptabilité | comptabilité | `candidats/[id]/paiements/page.tsx:50` (ignore les factures) vs `comptabilite/page.tsx:106-107` | Candidat avec factures mais `montant` nul : « Dû : — » sur sa fiche, dû réel en compta | Helper unique `montantDu(inscription)` réutilisé par les deux pages | S | P3 |
| A06-023 | 🟡 | Signature « eIDAS (YouSign) » annoncée — YouSign non branché (signature interne simple) | promesse/réel | `yousign.ts:18` `YOUSIGN_IMPLEMENTED=false` ; `fonctionnalites/page.tsx:206` | La signature interne est un eIDAS *simple* valide ; c'est le **wording** qui induit en erreur | Retirer « YouSign » de la promesse, ou brancher le flux v3 | S | P3 |
| A06-024 | 🟡 | Code mort `flows/devis-flow.ts` imprime des flottants bruts (non arrondis) | devis | `flows/devis-flow.ts:58-101` ; aucun import externe (mort) | Nul aujourd'hui ; PDF à 15 décimales si recâblé tel quel | Supprimer le module ou l'aligner sur `calcMontants` | S | P3 |

---

### 3. FICHES DÉTAILLÉES (toutes les 🔴 et 🟠)

#### A06-001 — Certificat de réalisation & BPF affichent la durée planifiée ; heures réellement suivies jamais calculées — 🔴
- **Constat :** la variable `{{duree}}` du **certificat de réalisation** est résolue vers la durée **déclarée** de la formation, jamais vers les heures effectivement suivies. Aucune agrégation des heures réelles ni du taux d'assiduité n'existe dans le code.
- **Preuve :** `src/lib/documents/resolve.ts:109` `duree: f.duree ?? (f.dureeHeures ? \`${f.dureeHeures}h\` : "—")` ; `src/lib/documents/templates.ts:433-443` (`CERTIFICAT_REALISATION`, ligne « Durée totale » = `{{duree}}`) ; `grep -rE "heuresRealisees|heuresSuivies|tauxAssiduite|tauxPresence|assiduite" src` = **aucun résultat**. La présence est bien saisie (`emargement-actions.ts:setPresence`, `EmargementSignature`) mais jamais convertie. Le BPF calcule aussi `dureeHeures × stagiaires` (`src/app/(app)/bpf/page.tsx:203-205`).
- **Scénario d'impact :** un stagiaire absent 1 jour sur 3 d'une session de 21 h reçoit un **certificat de réalisation mentionnant 21 h**. Les financeurs (CPF, OPCO) exigent les **heures réellement suivies** ; un certificat surévalué expose l'OF à un **remboursement/refus de prise en charge** et à une non-conformité en audit Qualiopi. Le document est correct uniquement en présence complète.
- **Cause racine :** l'émargement a été conçu comme preuve de présence (signatures), mais la couche « heures réalisées / assiduité » n'a jamais été construite ; les documents pointent vers la durée prévue du catalogue.
- **Recommandation :** créer une fonction d'agrégation `heuresRealisees(inscription)` + `tauxAssiduite` à partir de `EmargementSignature`/`Presence` (les demi-journées signées sont déjà disponibles), et l'injecter dans le certificat de réalisation et le BPF ; afficher heures prévues **et** réalisées.
- **Charge :** M — **Priorité :** P0 — **Type :** Standard
- **Vérification de la correction :** générer un certificat pour une inscription avec une demi-journée non signée et vérifier que la durée affichée < durée prévue ; test unitaire sur la fonction d'agrégation.

#### A06-002 — `euros()` arrondit à l'euro entier sur les documents légaux (facture éditeur + contrat) — 🔴
- **Constat :** le formateur monétaire `euros()` est configuré `maximumFractionDigits:0`. Il est utilisé pour afficher les montants du **PDF de facture éditeur** et du **contrat de prestation signé**, alors que le XML Factur-X embarqué utilise `toFixed(2)`. La face lisible, le XML et le montant prélevé divergent.
- **Preuve :** `src/lib/plans.ts:162-163` `new Intl.NumberFormat("fr-FR",{ style:"currency", currency:"EUR", maximumFractionDigits:0 })` ; utilisé en `src/lib/factures/editeur.ts:211-213` (`Total HT/TVA/TTC`) et `:161-162` (PU & montant de ligne), et dans le contrat `src/lib/contrats/prestation.ts:238,241,181,187`. Le XML CII utilise `m2 = (n)=>n.toFixed(2)` (`editeur.ts:240,295-298`). Vérification `node` : `euros(160.65)="161 €"`, `euros(0.01)="0 €"`, `euros(113.4)="113 €"`.
- **Scénario d'impact :** une facture électronique (réforme 2026) dont la face lisible indique « 161 € / 32 € / 193 € » tandis que le XML et le prélèvement SEPA valent 160,65 / 32,13 / 192,78 : incohérence intra-Factur-X → **rejet par une PDP / un validateur EN 16931**, et document comptable faux. Un contrat de prestation fait signer un montant HT arrondi différent de ce que Stripe prélève (risque de litige). Une ligne d'overage à 0,01 € s'imprime « 0 € ».
- **Cause racine :** un unique formateur (pensé pour les tableaux de bord/prix catalogue en euros entiers) réutilisé pour des documents comptables qui exigent 2 décimales.
- **Recommandation :** introduire `eurosDoc(n)` avec `minimumFractionDigits:2, maximumFractionDigits:2` et remplacer tous les appels `euros()` de `editeur.ts` (l. 161, 162, 211, 212, 213) et `prestation.ts`. Réserver `euros()` (0 décimale) aux dashboards.
- **Charge :** S — **Priorité :** P0 — **Type :** **Quick win**
- **Vérification de la correction :** générer le PDF d'une facture à 160,65 € et vérifier « 160,65 € » sur la face lisible = XML ; test unitaire `eurosDoc(0.01)="0,01 €"`.

#### A06-003 — Facture client non générée : dépôt de PDF externe uniquement, B2B seul — 🟠
- **Constat :** OFMANAGER ne **génère pas** de facture client ; `depositFacture` se limite à téléverser un PDF « fait sur un autre logiciel », et seulement pour une **entreprise** (jamais pour un particulier / une inscription).
- **Preuve :** `src/lib/actions/facture-actions.ts:17` (« Pas de génération : on ne fait que déposer + référencer »), unique `.facture.create` du dépôt = `facture-actions.ts:68` avec `entrepriseId` ; enum `DocumentType` (schema:429-461) sans `FACTURE` ; `schema:1605` « PDF déposé par l'admin (fait sur un autre logiciel) ». La page marketing promet « Devis & factures automatisés » (`fonctionnalites/page.tsx:150,224`).
- **Scénario d'impact :** l'OF doit facturer dans **un autre outil** puis re-téléverser ; aucune facture pour les **particuliers** (CPF/autofinancement). La comptabilité et le FEC ne voient que les factures B2B déposées → chiffre d'affaires incomplet. Écart net avec la promesse d'un outil « tout-en-un ».
- **Cause racine :** module hérité de l'usage interne (facturation externe), non porté vers une génération intégrée.
- **Recommandation :** générateur de facture (numérotation via `NumeroSequence` atomique, lignes issues du devis/de l'inscription, PDF Chromium comme les autres documents) pour B2B **et** particuliers ; réutiliser `calcMontants`.
- **Charge :** L — **Priorité :** P1 — **Type :** Chantier
- **Vérification de la correction :** générer une facture pour une inscription particulier, vérifier numéro séquentiel + reprise en comptabilité/FEC.

#### A06-004 — Émargement & séances tronqués au 60ᵉ jour (`guard < 60`) — 🟠
- **Constat :** l'énumération des jours d'une session est plafonnée à 60 itérations, et la logique est **dupliquée** en deux endroits avec des règles week-end différentes.
- **Preuve :** `src/lib/emargement.ts:25` `while (d <= end && guard < 60)` ; duplication `src/lib/actions/emargement-actions.ts:46` (`genererSeances`). Preuve d'exécution (TZ=UTC) : session 2026-01-05 → 2026-05-05 (121 jours) ⇒ **44 jours ouvrés générés, dernier = 2026-03-05** ; jours 61+ perdus.
- **Scénario d'impact :** toute formation longue (titre professionnel, Capacité de transport 105 h, alternance, parcours étalés) n'a **aucune feuille d'émargement ni séance générée au-delà du jour 60**. L'émargement signé étant une preuve obligatoire (Qualiopi + financeur), c'est un trou de traçabilité silencieux.
- **Cause racine :** garde anti-boucle codée en dur (60) au lieu d'une borne raisonnée sur la plage réelle.
- **Recommandation :** itérer sur `dateFin` avec une borne haute raisonnable (~366) ou générer par lots ; **unifier** `genererSeances` et `joursSession` sur une seule règle (jours ouvrés hors fériés, cf. A06-019).
- **Charge :** S — **Priorité :** P1 — **Type :** **Quick win**
- **Vérification de la correction :** générer les séances d'une session de 4 mois et vérifier que le dernier jour = `dateFin`.

#### A06-005 — Suppression d'une inscription efface en cascade ses règlements — 🟠
- **Constat :** `deleteInscriptionAction` supprime l'inscription sans vérifier l'existence de règlements ; la relation `Paiement → Inscription` est en `onDelete: Cascade`, donc les règlements disparaissent.
- **Preuve :** `src/lib/actions/inscription-actions.ts:630-639` `await db.inscription.delete({ where: { id } })` (aucune garde, seul un `auditLog` de la suppression) ; `prisma/schema.prisma:1628` `inscription … onDelete: Cascade` (modèle `Paiement`). Idem `DocumentGenere` (:1194) et `SignatureRequest` (:1772) ; `Facture` est en `SetNull` (:277, conservée). Le commentaire (:1192) affirme pourtant que « les données comptables restent en Restrict » — ce qui est faux pour `Paiement`.
- **Scénario d'impact :** un administrateur retire un stagiaire inscrit par erreur (opération courante) ; s'il avait un acompte, le `Paiement` (preuve d'encaissement) est **détruit silencieusement**. Perte de données comptables/probatoires sans avertissement. Le sous-cas « inscription déjà réglée » est moins fréquent que la suppression elle-même, d'où 🟠 et non 🔴.
- **Cause racine :** incohérence de politique `onDelete` — le schéma protège `Facture` mais pas `Paiement`, alors que les deux sont comptables.
- **Recommandation :** avant `delete`, bloquer si des `paiements`/`factures` existent (proposer `statut=ANNULEE`), **ou** passer `Paiement.inscription` en `Restrict`/`SetNull`. Aligner le commentaire.
- **Charge :** S — **Priorité :** P1 — **Type :** **Quick win**
- **Vérification de la correction :** tenter de supprimer une inscription avec un paiement → refus explicite ; vérifier que le `Paiement` subsiste.

#### A06-006 — `cancelCivicPayment` annule sans émettre d'avoir alors qu'une facture existe — 🟠
- **Constat :** l'annulation d'un paiement civique passe le statut à « annule » sans aucune garde ni émission d'avoir, alors qu'une facture fiscale a été créée à l'encaissement.
- **Preuve :** `src/lib/actions/civique-actions.ts:350-360` (`updateMany … statut:"annule"`, aucune vérification de facture) ; à comparer avec `refundCivicPayment:337-348` qui appelle `createCivicAvoir`. La `CivicFacture` est créée dès l'encaissement (`ensureCivicFactureFor`, `civique-actions.ts:327`).
- **Scénario d'impact :** annuler un paiement déjà facturé laisse une **facture numérotée sans document d'annulation** → écart comptable (une facture émise ne peut être « supprimée », seulement contrepassée par un avoir).
- **Cause racine :** deux chemins de sortie (remboursement vs annulation) dont un seul émet l'avoir.
- **Recommandation :** interdire `cancel` si une `CivicFacture` existe (forcer le remboursement/l'avoir), ou émettre l'avoir dans `cancel` comme dans `refund`.
- **Charge :** S — **Priorité :** P1 — **Type :** **Quick win**
- **Vérification de la correction :** annuler un paiement facturé → soit refus, soit avoir créé ; vérifier la présence d'un `CivicAvoir`.

#### A06-007 — N° de facture (civique) alloué hors transaction → trou de séquence possible — 🟠
- **Constat :** le numéro de facture est incrémenté (atomiquement) puis l'insertion de la facture se fait dans un appel séparé, sans transaction englobante ; un échec d'insertion « brûle » le numéro.
- **Preuve :** `src/lib/civique-api.ts:252` `create({ data: { …, numero: await nextFactureNumero(...) } })` ; `nextFactureNumero → nextRef → nextSequence` fait un `UPDATE … increment` (`numerotation.ts:24`) dans un round-trip distinct. `grep "\$transaction" src` = uniquement `prisma.ts` (RLS). Même structure pour devis (`devis-actions.ts:62`+`69`) et convention (`115`+`120`).
- **Scénario d'impact :** si l'insertion échoue après l'incrément (contrainte, coupure), le compteur a avancé → **numéro manquant** dans la séquence de factures = rupture de continuité chronologique (CGI). Vraisemblance faible (les insertions échouent rarement), mais correctif peu coûteux. Toléré pour devis/convention, **pas** pour facture/avoir.
- **Cause racine :** allocation du numéro et création de l'entité non atomiques.
- **Recommandation :** envelopper `nextSequence` + `create` dans `prisma.$transaction` (le rollback annule l'incrément).
- **Charge :** M — **Priorité :** P1 — **Type :** Standard
- **Vérification de la correction :** simuler un échec d'insertion et vérifier que le compteur n'a pas avancé.

#### A06-008 — Devis : totaux non arrondis + ligne TVA incohérente avec le taux — 🟠
- **Constat :** la création d'un devis calcule HT et TTC **sans arrondi** (contrairement à la facture), et la page devis affiche la TVA comme `ttc − ht` plutôt que le montant calculé.
- **Preuve :** `src/lib/actions/devis-actions.ts:41-42` `montantHT = Σ quantite*puHT` ; `montantTTC = montantHT*(1+tva/100)` (pas de `round2`, à comparer à `editeur.ts:75-77`). Colonnes `Decimal(10,2)` → HT et TTC arrondis indépendamment. Affichage `src/app/(app)/devis/[id]/page.tsx:170` `TVA ({tva}%) … {euro(ttc - ht)}`. Cas prouvé (`node`) : 7,5 h × 66,67 €, TVA 20 % → stocke HT 500,03 + TTC 600,03 ⇒ **TVA affichée 100,00 € alors que 20 % × 500,03 = 100,01 €**.
- **Scénario d'impact :** un devis (« bon pour accord » signé en ligne) dont HT + TVA ≠ TTC et dont la ligne TVA contredit le taux affiché ; l'écart (≤ 0,01 €) est repris tel quel en cas de conversion en facture. Décrédibilise le document.
- **Cause racine :** logique de calcul dupliquée sans réutiliser `calcMontants`.
- **Recommandation :** arrondir chaque ligne et les agrégats comme `calcMontants` ; stocker/afficher le **montant TVA calculé**, pas `ttc − ht`.
- **Charge :** S — **Priorité :** P1 — **Type :** **Quick win**
- **Vérification de la correction :** cas 7,5 h × 66,67 € → HT 500,03 + TVA 100,01 + TTC 600,04, ligne TVA = 100,01 €.

#### A06-009 — Double-soumission d'un règlement → paiement compté deux fois — 🟠
- **Constat :** l'enregistrement d'un règlement crée une ligne `Paiement` sans mécanisme d'idempotence ; le statut de paiement est ensuite recalculé sur la somme des règlements.
- **Preuve :** `src/lib/actions/paiement-actions.ts:54` `db.paiement.create(...)` (aucune clé anti-rejeu) ; recalcul `Σ paiements` `:66-75`.
- **Scénario d'impact :** un double-clic ou un renvoi réseau du formulaire « Enregistrer un règlement » crée **2 lignes `Paiement`** → total encaissé surévalué, bascule erronée en `PAYE`, trésorerie faussée. Correction manuelle nécessaire.
- **Cause racine :** absence d'idempotence sur la création d'entité (le reste de l'app s'appuie sur des `@@unique`, ici manquant).
- **Recommandation :** jeton anti-rejeu par soumission, ou contrainte `@@unique([inscriptionId, montant, date, mode, reference])`, ou verrou `submitting` côté serveur.
- **Charge :** M — **Priorité :** P2 — **Type :** Standard
- **Vérification de la correction :** soumettre deux fois le même règlement → une seule ligne créée.

#### A06-010 — Suppression d'un formateur : cascade sur ses factures ; garde « FK-protégée » inopérante — 🟠
- **Constat :** supprimer un formateur réussit toujours et efface ses factures de sous-traitance ; le `catch` FK censé bloquer ne se déclenche jamais car aucune relation n'est en `Restrict`.
- **Preuve :** `src/lib/actions/comptes-actions.ts:112` `db.formateur.delete(...)` ; `schema:1651` `FactureFormateur.formateur … onDelete: Cascade` ; `Formateur` (schema:1011-1016) : sessions en M2M, séances `SetNull`, dispos/factures/conventions `Cascade` — aucune `Restrict`. Le `catch` P2003 (`comptes-actions.ts:133`) est donc inatteignable, malgré le commentaire « Suppression FK-protégée » (:94).
- **Scénario d'impact :** suppression d'un ex-formateur → **perte de ses `FactureFormateur`** (pièces financières de sous-traitance) et détachement silencieux des sessions/séances, sans l'erreur attendue.
- **Cause racine :** politique `onDelete` en cascade sur des données financières + garde applicative reposant sur un `catch` FK jamais déclenché.
- **Recommandation :** bloquer explicitement si `factures`/`sessions` liées (comme pour le candidat via P2003/P2014) ; ne pas dépendre du seul `catch`.
- **Charge :** S — **Priorité :** P2 — **Type :** **Quick win**
- **Vérification de la correction :** supprimer un formateur ayant une facture → refus ; vérifier la persistance des `FactureFormateur`.

#### A06-011 — Aucune garde de transition de statut (facture éditeur / devis / session) — 🟠
- **Constat :** plusieurs actions acceptent n'importe quelle valeur d'enum comme nouveau statut, sans matrice de transitions autorisées ; l'édition d'une session close et l'annulation ne sont pas gardées.
- **Preuve :** `src/lib/actions/facture-editeur-actions.ts:168-181` (accepte ENCAISSEE→BROUILLON sans remettre `paidAt` à null) ; `src/lib/actions/devis-actions.ts:134-148` (PAYEE→BROUILLON) ; `src/lib/actions/session-actions.ts:261` `db.session.update({ … statut: v.statut })` sans vérifier le statut courant, et aucune action `annulerSession` dédiée (grep). Nuance : `emettreFactureEditeur` (:95) et `deleteFactureEditeur` (:191) **sont** gardés, et `archiverSession` refuse la clôture si dossiers incomplets (`session-guard-actions.ts:63-82`).
- **Scénario d'impact :** réouverture d'une facture éditeur encaissée (incohérence `paidAt`/statut) ; modification d'une session TERMINEE (enjeu Qualiopi/audit) ; passage d'une session à ANNULEE sans réconcilier les inscriptions (restent VALIDEE) ni les factures émises.
- **Cause racine :** transitions de statut non modélisées comme machine à états.
- **Recommandation :** table de transitions autorisées par entité ; verrouiller l'édition des sessions TERMINEE/ANNULEE ; action d'annulation qui réconcilie inscriptions/factures.
- **Charge :** M — **Priorité :** P2 — **Type :** Standard
- **Vérification de la correction :** tenter ENCAISSEE→BROUILLON → refus ; éditer une session TERMINEE → refus.

#### A06-012 — Listes volumineuses non paginées — 🟠
- **Constat :** de nombreuses pages listent via `findMany` sans `take`/`skip`/`cursor`, y compris des agrégats lourds et une liste cross-tenant.
- **Preuve :** 107 occurrences de `findMany(` pour seulement 19 `take:`. Exemples lus sans `take` : `src/app/(app)/candidats/page.tsx:23`, `crm/page.tsx:19`, `comptabilite/page.tsx:54` (includes candidat+session+factures+paiements), `console/prospects/page.tsx:13` (`prisma.lead.findMany` cross-tenant, SUPERADMIN), `tresorerie/page.tsx:31`.
- **Scénario d'impact :** sur un OF mûr (milliers de prospects/inscriptions après imports CRM ; console = agrégat multi-tenant), ces pages chargent toute la table en mémoire → latence, dépassement mémoire/timeout Vercel, coût de transfert Neon (déjà pointé dans l'historique projet). Dégradation progressive, invisible en démonstration. *La performance relève de l'audit 07 ; retenu ici car c'est une robustesse fonctionnelle sur volumes réels.*
- **Cause racine :** pagination non systématisée sur les listes.
- **Recommandation :** pagination serveur (`take` + `cursor`) ; prioriser la comptabilité et la console/prospects (includes lourds / cross-tenant).
- **Charge :** L — **Priorité :** P2 — **Type :** Chantier
- **Vérification de la correction :** liste de 5 000 lignes → temps de rendu borné, mémoire stable.

#### A06-013 — Diplôme SSIAP sans contrainte d'unicité DB sur `numeroDiplome` — 🟠
- **Constat :** le numéro de diplôme (n° préfectoral SSIAP, clé du registre anti-fraude) n'a aucune contrainte d'unicité en base ; seul un contrôle applicatif non atomique existe pour la saisie manuelle.
- **Preuve :** `prisma/schema.prisma:2528` `numeroDiplome String?` (ni `@unique`, ni `@@unique` dans le modèle `Diplome`) ; contrôle manuel `diplome-actions.ts:214` (check-then-insert). Le chemin automatique `genererDiplomeSsiap` (`titre-actions.ts:80`) ne refait pas ce contrôle avant `create`.
- **Scénario d'impact :** deux diplômes peuvent porter le même n° préfectoral (course, ou chemins distincts) ; le registre de vérification anti-fraude lie le n° au premier titulaire → le second titre devient **invérifiable**.
- **Cause racine :** unicité déléguée à l'applicatif, sans filet en base.
- **Recommandation :** `@@unique([organismeId, numeroDiplome])`.
- **Charge :** S — **Priorité :** P2 — **Type :** **Quick win**
- **Vérification de la correction :** tenter de créer deux diplômes de même numéro → violation d'unicité.

#### A06-014 — « Paiement en ligne Stripe (CB, SEPA) » pour devis/factures annoncé, non implémenté — 🟠
- **Constat :** la page fonctionnalités annonce le paiement en ligne des devis/factures client ; Stripe n'est branché que sur l'abonnement SaaS et le produit e-learning civique.
- **Preuve :** `src/app/fonctionnalites/page.tsx:224` (« Devis & factures automatisés — Paiement en ligne Stripe (CB, SEPA) ») ; imports Stripe limités à `billing-actions.ts`/`console-billing-actions.ts` (abonnement) et `api/civique/checkout` ; `acceptDevis` = « un devis accepté n'est **PAS** payé » (`devis-actions.ts`).
- **Scénario d'impact :** le client final ne peut pas régler en ligne un devis ou une facture. Écart clair entre la promesse commerciale et le produit.
- **Cause racine :** fonctionnalité annoncée en amont de son implémentation.
- **Recommandation :** brancher Stripe Checkout sur devis/facture client, **ou** corriger la promesse commerciale.
- **Charge :** L — **Priorité :** P2 — **Type :** Chantier
- **Vérification de la correction :** un client règle un devis en ligne et le statut passe à payé.

---

### 4. POINTS CONFORMES (🟢)

1. **Moteurs de calcul corrects (preuve + tests).** `calcMontants` (`editeur.ts:75-77`) applique la méthode EN 16931 (TVA sur la somme des HT, arrondi au centime au niveau agrégat) ; `montantNet`/`computeContratTotals` (`prestation.ts:69-107`) bornent la remise [0,100] et arrondissent chaque agrégat ; test `factures-editeur.test.ts` (149 → 29,80 → 178,80). ✅
2. **Solde / acompte fiable.** `paiement-actions.ts:66-76` : dû = `inscription.montant` ou Σ factures ; seuil « payé » avec **tolérance ½ centime** (`totalPaye + 0.005 >= du`), cohérent avec l'affichage `comptabilite/page.tsx:127-131` (`restant = max(0, du−paye)`, pas de solde négatif). ✅
3. **Exonération de TVA gérée.** Facture civique : `civique-api.ts:245-249` (`tvaCents:0, exonereTva:true`) + mention légale imprimée « TVA non applicable, art. 261-4-4° a du CGI » (`examen-civique/facture/[id]/route.ts:74-79`) ; convention `templates.ts:593` ; FEC omet la ligne 44571 si TVA nulle (`compta/fec.ts:145` + test `fec.test.ts:30`). Devis force `tva=0` si `assujettiTva=false` (`devis-actions.ts:33-39`). ✅
4. **Numérotation atomique et unicité DB.** `nextSequence` (`numerotation.ts:24-52`) : `UPDATE … increment` (verrou de ligne PG), gestion propre du premier appel (P2025) et de la course d'amorçage (P2002) ; bascule d'année propre (redémarrage `0001`). Unicité DB sur tous les documents à référence : Devis (`schema:185`), Facture (`@@unique[organismeId,reference]`), Convention (:1344), CivicFacture (:2392), FactureEditeur (:236). ✅
5. **Parcours métier réellement câblé de bout en bout.** Moteur documentaire itérant 22 modèles Qualiopi rendus en PDF (`documents/build-pdf.ts:152-159`) ; programme de formation complet (`templates.ts:643`, résolu depuis les vrais champs) ; automatisation planifiée par cron 7h/13h (`automation-engine.ts`, 789 lignes, verrou anti-concurrence) ; émargement multi-modal (feuille imprimable, QR de salle HMAC `emargement-salle.ts`, signature à distance par demi-journée) ; certification → auto-création du `Diplome` ; BPF aligné CERFA 10443*17 ; clôture/archivage gardé (`archiveSessionValidated`). ✅
6. **Cloisonnement multi-tenant appliqué aux mutations.** `tenant.ts:82-106` injecte `organismeId` dans les `where` de `update`/`delete`/`findUnique` (« Accès refusé » sinon) — `depositFacture`, `deleteInscriptionAction` sont tenant-safe (le constat A06-005 est une perte *intra-tenant*, pas un IDOR). ✅
7. **Suppressions d'entités référencées « classiques » bloquées.** `Inscription.candidat`/`session` (schema:1052,1054) et `Session.formation` (:895) sans `onDelete` = `Restrict` → supprimer un candidat/une session/une formation utilisé(e) échoue et est traduit en « Suspendez-le plutôt » (`comptes-actions.ts:130-138`). ✅
8. **Émargement idempotent + anti-double-signature ; double-inscription exacte bloquée.** `emargement-signature-actions.ts:69-77` (Set des signatures existantes) + `:135` (« Déjà signé ») ; `@@unique([candidatId, sessionId])` (schema:1157) avec gestion P2002 explicite. ✅
9. **Dates : bissextile & passage d'année corrects ; fuseau cohérent sur runtime UTC.** 29/02 inclus, `dayKey` via getters locaux cohérent avec `norm()` ; dates « date seule » stockées en UTC-minuit restent le même jour en heure de Paris (UTC+1/+2). ✅ *(fragilité latente si un `datetime-local` porteur d'heure était introduit — cf. §5).*
10. **HTML de contenu assaini au rendu.** `sanitize-html.ts:12` (retire `<script>`/`on*`/`iframe`) appliqué au rendu des leçons (`mes-cours/[coursId]/page.tsx:216`). ✅
11. **CI qui gate réellement.** `.github/workflows/ci.yml` : Postgres éphémère → `prisma db push` → `lint` → `tsc --noEmit` → `npm test` (avec `DATABASE_URL_TEST`) → `npm run build`. Un build ou des tests cassés bloquent le merge. ✅
12. **Suite de tests logiques verte (exécutée).** `vitest run` sur 14 fichiers de logique pure → **228 tests passés / 228** (9 s), assertions réelles (Factur-X PDF/A-3B + EN 16931, `HT+TVA=TTC`, matrice d'autorisation rôle×page, FEC équilibré). Les chemins critiques (calcul de facturation, autorisation) disposent de tests réels et passants. ✅

---

### 5. CONTRÔLES NON RÉALISÉS

| Contrôle | Raison | Ce qu'il faudrait pour le faire |
|---|---|---|
| Exécution des tests d'**intégration** (isolation multi-tenant, écritures DB) | Nécessite `DATABASE_URL_TEST`/pg éphémère ; le sous-agent « ingénieur test » a échoué sur la limite de session. Seul le sous-ensemble **logique pur** a été exécuté (228/228). | Base Postgres de test locale + `DATABASE_URL_TEST`, ou s'appuyer sur la CI (qui les exécute). |
| **Rendu PDF réel** (Chromium `htmlToPdf`) des documents | Lecture seule + pas d'exécution touchant la prod. Le défaut `euros()` (A06-002) est prouvé déterministe via `node`, indépendant du moteur de rendu. | Runtime serverless + jeu de données ; capture des PDF générés. |
| Validation **Factur-X** contre un validateur officiel EN 16931 (veraPDF / Mustang) | Non disponible hors-ligne. Analyse par lecture croisée des règles BR-CO-15 / BR-S / BR-E. | Outil de validation EN 16931 + un PDF Factur-X généré. |
| Reproduction **runtime** des courses de concurrence (A06-009 double-submit, A06-017 candidat) | Prouvées par lecture de code ; interdiction d'écriture en base. | 2 requêtes concurrentes contre une base de test. |
| Test de **volume réel** sur la pagination (A06-012) | Impact déduit de la structure des requêtes ; pas de seed massif autorisé. | Jeu de données de plusieurs milliers de lignes en environnement dédié. |
| Transitions détaillées d'**autres enums** (`FactureFormateurStatut`, `DossierFinancementEtat`, `DemandeInscriptionStatut`, `ParcoursT3PStatut`) | Priorisé sur facture/devis/session (budget temps). | Second passage ciblé sur ces machines à états. |

---

### 6. QUICK WINS
*(fort risque, charge S/M — à lancer en premier)*

- **A06-002** 🔴 — formateur monétaire 2 décimales pour les documents (facture, contrat). Charge S.
- **A06-004** 🟠 — relever/supprimer le plafond `guard < 60` de l'émargement. Charge S.
- **A06-005** 🟠 — garde à la suppression d'inscription si règlements/factures existent. Charge S.
- **A06-006** 🟠 — `cancelCivicPayment` : bloquer ou émettre l'avoir. Charge S.
- **A06-008** 🟠 — arrondir les totaux du devis + afficher la TVA calculée. Charge S.
- **A06-010** 🟠 — garde explicite à la suppression d'un formateur facturé. Charge S.
- **A06-013** 🟠 — `@@unique([organismeId, numeroDiplome])`. Charge S.

---

### 7. PLAN DE REMÉDIATION

- **Vague 1 — avant Go-Live (P0) :** A06-001 (heures réelles → certificat/BPF, M) · A06-002 (`euros()` 2 décimales, S). **Charge cumulée ≈ 1,5–2,5 j.**
- **Vague 2 — J+30 (P1) :** A06-004 (émargement > 60 j, S) · A06-005 (perte de règlements, S) · A06-006 (avoir civique, S) · A06-008 (arrondi devis, S) · A06-007 (numérotation transactionnelle, M) · A06-003 (génération de facture client, L). **Charge cumulée ≈ 4–6 j** (dont A06-003 en chantier).
- **Vague 3 — J+90 (P2/P3) :** A06-009 à A06-014 (double-submit, cascade formateur, gardes de transition, pagination, unicité diplôme, Stripe client) puis les 🟡 (A06-015 à A06-024 : Factur-X exonération, validation zod, doublons candidat, seed CONV/titres, fériés, count()+1, maxSuffix, cohérence « dû », wording YouSign, code mort devis-flow).

---

### 8. ANNEXES

**Dépôt :** `C:\Users\GPSP\Desktop\ofmanager-commercial` — 837 commits — branche `fix/remediation-audits-05-02` @ `ed5986e`.
**Stack :** Next.js 16.3.1 / React 19 / Prisma 6 (Postgres Neon) / NextAuth 5 / Stripe / Vitest 4 / Playwright.
**Tests :** 66 fichiers unit/intégration + 12 specs e2e Playwright.

**Commandes exécutées (extraits) :**
- `git rev-list --count HEAD` → 837 ; `git log -1` → `ed5986e` (2026-08-27).
- Inventaire tests : `find src SECURITY_TESTS -name "*.test.ts"` → 66 ; `find e2e -name "*.spec.ts"` → 12.
- **Exécution sécurisée** (DB bloquée, `DATABASE_URL` pointé vers un hôte inerte, `DATABASE_URL_TEST` unset) :
  `node_modules/.bin/vitest run <14 fichiers logique pure>` → `Test Files 14 passed (14) · Tests 228 passed (228)` en 9,02 s.
- Vérification arithmétique `node` : `euros(160.65)="161 €"`, `euros(0.01)="0 €"`, `euros(113.4)="113 €"`.
- Preuve dates (TZ=UTC) : session 2026-01-05→2026-05-05 ⇒ 44 jours générés, dernier 2026-03-05 (plafond 60).

**Fichiers clés analysés :** `lib/factures/editeur.ts`, `lib/factures/facturx.ts`, `lib/numerotation.ts`, `lib/contrats/prestation.ts`, `lib/emargement.ts`, `lib/documents/{resolve,templates,build-pdf}.ts`, `lib/actions/{facture,facture-editeur,devis,paiement,inscription,comptes,civique,session}-actions.ts`, `prisma/schema.prisma`, `.github/workflows/ci.yml`.

**Méthode :** 5 sous-agents spécialistes en parallèle (mandat : constats prouvés uniquement, `fichier:ligne`) ; contre-vérification personnelle du chef de projet sur toutes les 🔴/🟠 (arbitrage indépendant : 1 faux 🔴 écarté — Factur-X exonération latent ; 2 🔴 proposés rétrogradés — `count()+1` mitigé par `@unique`).

**Réserve de qualité (transparence) :** le sous-agent « ingénieur test » a échoué (limite de session) — sa part a été reprise par le chef de projet (inventaire + exécution du sous-ensemble logique). Le sous-agent « exploratoire » a mal libellé la branche (`feat/aguyse-design-v6`), mais son analyse de churn porte bien sur OFMANAGER (837 commits confirmés).

---

### 9. BLOC DE CONSOLIDATION (ne pas modifier le format)

```json
{
  "audit_id": 6,
  "audit_nom": "Audit fonctionnel / QA",
  "date": "2026-08-28",
  "commit": "ed5986e31ec55600d814c7cc06a9329bcb7dc09c",
  "verdict": "GO_CONDITIONNEL",
  "compteurs": {"rouge": 2, "orange": 12, "jaune": 10, "vert": 12, "non_verifie": 6},
  "anomalies": [
    {"id": "A06-001", "gravite": "rouge", "titre": "Certificat de realisation & BPF affichent la duree planifiee ; heures reellement suivies jamais calculees", "composant": "documents/emargement", "preuve": "resolve.ts:109 ; templates.ts:433-443 ; grep heuresRealisees|assiduite = vide", "impact": "Document legal errone sur presence partielle -> reprise de financement CPF/OPCO", "recommandation": "Deriver heures realisees + taux d'assiduite depuis les emargements et les injecter dans certificat & BPF", "charge": "M", "priorite": "P0", "type": "standard", "depend_de": []},
    {"id": "A06-002", "gravite": "rouge", "titre": "euros() arrondit a l'euro entier sur documents legaux : face PDF != XML Factur-X != SEPA", "composant": "plans/factures/contrats", "preuve": "plans.ts:162 maximumFractionDigits:0 ; editeur.ts:211-213 ; prestation.ts:238", "impact": "Facture electronique incoherente (rejet PDP), contrat signe sur montant errone, PU 0,01EUR -> 0EUR", "recommandation": "Formateur monetaire 2 decimales pour les documents ; reserver euros() aux tableaux de bord", "charge": "S", "priorite": "P0", "type": "quick_win", "depend_de": []},
    {"id": "A06-003", "gravite": "orange", "titre": "Facture client non generee : depot de PDF externe uniquement, B2B seul", "composant": "factures", "preuve": "facture-actions.ts:17 ; DocumentType sans FACTURE (schema:429-461)", "impact": "Facturer ailleurs puis reteleverser ; aucune facture particuliers ; CA/compta incomplets", "recommandation": "Generateur de facture (numerotation atomique, lignes devis/inscription, PDF) B2B + particuliers", "charge": "L", "priorite": "P1", "type": "chantier", "depend_de": []},
    {"id": "A06-004", "gravite": "orange", "titre": "Emargement & seances tronques au 60e jour (guard < 60)", "composant": "emargement", "preuve": "emargement.ts:25 ; emargement-actions.ts:46 ; exec 121j->44 jours dernier 05/03", "impact": "Formations longues : aucun emargement apres J60 -> trou de preuve Qualiopi", "recommandation": "Relever/supprimer le plafond ; unifier genererSeances et joursSession", "charge": "S", "priorite": "P1", "type": "quick_win", "depend_de": ["A06-019"]},
    {"id": "A06-005", "gravite": "orange", "titre": "Suppression d'une inscription efface en cascade ses reglements (Paiement)", "composant": "inscriptions", "preuve": "inscription-actions.ts:639 delete sans garde ; schema:1628 Paiement onDelete:Cascade", "impact": "Retirer un stagiaire detruit silencieusement ses Paiement (preuve d'encaissement)", "recommandation": "Bloquer si paiements/factures existent ; ou Paiement en Restrict/SetNull", "charge": "S", "priorite": "P1", "type": "quick_win", "depend_de": []},
    {"id": "A06-006", "gravite": "orange", "titre": "cancelCivicPayment annule sans emettre d'avoir alors qu'une facture existe", "composant": "facturation civique", "preuve": "civique-actions.ts:351 (statut:annule, aucune garde) vs refundCivicPayment:338", "impact": "Facture fiscale numerotee orpheline (sans document d'annulation) -> ecart comptable", "recommandation": "Bloquer si CivicFacture existe, ou emettre l'avoir comme le remboursement", "charge": "S", "priorite": "P1", "type": "quick_win", "depend_de": []},
    {"id": "A06-007", "gravite": "orange", "titre": "N de facture (civique) alloue hors transaction -> trou de sequence possible", "composant": "numerotation", "preuve": "civique-api.ts:252 create avec numero:await nextFactureNumero() ; aucun $transaction", "impact": "Echec d'insertion apres increment -> n brule = rupture de continuite (CGI)", "recommandation": "Envelopper allocation + insert dans prisma.$transaction", "charge": "M", "priorite": "P1", "type": "standard", "depend_de": []},
    {"id": "A06-008", "gravite": "orange", "titre": "Devis : totaux non arrondis + ligne TVA = ttc-ht incoherente avec le taux", "composant": "devis", "preuve": "devis-actions.ts:41-42 (pas de round2) ; devis/[id]/page.tsx:170 ; exec TVA 100,00 != 100,01", "impact": "Bon pour accord signe dont HT+TVA != TTC et TVA contredit le taux", "recommandation": "Aligner sur calcMontants ; afficher le montant TVA calcule, pas ttc-ht", "charge": "S", "priorite": "P1", "type": "quick_win", "depend_de": []},
    {"id": "A06-009", "gravite": "orange", "titre": "Double-soumission d'un reglement -> paiement compte deux fois (pas d'idempotence)", "composant": "paiements", "preuve": "paiement-actions.ts:54 create sans cle anti-rejeu ; recalcul Sigma paiements :66-75", "impact": "Double-clic/renvoi reseau -> total encaisse surevalue, bascule erronee en PAYE", "recommandation": "Jeton anti-rejeu, ou @@unique(inscriptionId,montant,date,mode,reference)", "charge": "M", "priorite": "P2", "type": "standard", "depend_de": []},
    {"id": "A06-010", "gravite": "orange", "titre": "Suppression d'un formateur -> cascade sur FactureFormateur ; garde FK inoperante", "composant": "comptes", "preuve": "comptes-actions.ts:112 delete ; schema:1651 onDelete:Cascade ; catch P2003 :133 jamais atteint", "impact": "Suppression reussit toujours et efface les factures de sous-traitance", "recommandation": "Bloquer si factures/sessions liees (comme pour le candidat)", "charge": "S", "priorite": "P2", "type": "quick_win", "depend_de": []},
    {"id": "A06-011", "gravite": "orange", "titre": "Aucune garde de transition de statut (facture editeur / devis / session)", "composant": "machines a etats", "preuve": "facture-editeur-actions.ts:168-181 ; devis-actions.ts:134-148 ; session-actions.ts:261", "impact": "Reouverture facture encaissee ; modif session close ; annulation qui ne reconcilie rien", "recommandation": "Table de transitions autorisees + garde sur sessions TERMINEE/ANNULEE", "charge": "M", "priorite": "P2", "type": "standard", "depend_de": []},
    {"id": "A06-012", "gravite": "orange", "titre": "Listes volumineuses non paginees (findMany sans take/cursor)", "composant": "listing/perf", "preuve": "107 findMany vs 19 take ; comptabilite/page.tsx:54 ; console/prospects/page.tsx:13 cross-tenant", "impact": "Sur OF mur : latence, memoire/timeout Vercel, cout transfert Neon", "recommandation": "Pagination serveur (take+cursor), comptabilite & console d'abord", "charge": "L", "priorite": "P2", "type": "chantier", "depend_de": []},
    {"id": "A06-013", "gravite": "orange", "titre": "Diplome SSIAP sans contrainte d'unicite DB sur numeroDiplome", "composant": "anti-fraude", "preuve": "schema:2528 numeroDiplome String? (ni @unique ni @@unique) ; check applicatif non atomique", "impact": "N prefectoral duplique -> registre de verification anti-fraude inverifiable", "recommandation": "@@unique([organismeId, numeroDiplome])", "charge": "S", "priorite": "P2", "type": "quick_win", "depend_de": []},
    {"id": "A06-014", "gravite": "orange", "titre": "Paiement en ligne Stripe (devis/factures client) annonce, non implemente", "composant": "promesse/reel", "preuve": "fonctionnalites/page.tsx:224 ; Stripe branche seulement abonnement SaaS & civique", "impact": "Le client final ne peut pas regler en ligne un devis/une facture", "recommandation": "Brancher Stripe Checkout sur devis/facture, ou corriger la promesse", "charge": "L", "priorite": "P2", "type": "chantier", "depend_de": []},
    {"id": "A06-015", "gravite": "jaune", "titre": "Factur-X : CategoryCode fige a S, pas d'ExemptionReason si taux 0 (latent)", "composant": "factures", "preuve": "editeur.ts:264,291 ; non declenche (editeur tauxTva=20, facture-editeur-actions.ts:63)", "impact": "Latent : XML EN 16931 rejete le jour d'une facture exoneree", "recommandation": "Deriver la categorie du taux (0 -> E) + ExemptionReason", "charge": "M", "priorite": "P2", "type": "standard", "depend_de": []},
    {"id": "A06-016", "gravite": "jaune", "titre": "Validation heterogene : 26 actions sans schema zod ; date malformee -> 500", "composant": "validation", "preuve": "salle-actions.ts:22 ; public-inscription-actions.ts:64 new Date(dateNaissance) ; session-actions.ts:76", "impact": "Chaines non bornees ; new Date(abc) -> erreur 500 au lieu d'un message", "recommandation": "Generaliser safeParse + .max() + validation de format de date", "charge": "M", "priorite": "P2", "type": "standard", "depend_de": []},
    {"id": "A06-017", "gravite": "jaune", "titre": "Course a la creation de candidat (formulaire public) -> doublons", "composant": "inscriptions", "preuve": "public-inscription-actions.ts:53-57 findFirst puis create ; Candidat.email @@index non @@unique (schema:765)", "impact": "2 soumissions quasi-simultanees (email neuf) -> 2 candidats + 2 inscriptions", "recommandation": "@@unique([organismeId,email]) + upsert ; throttle endpoint public", "charge": "M", "priorite": "P2", "type": "standard", "depend_de": []},
    {"id": "A06-018", "gravite": "jaune", "titre": "CONV & titres numerotes sans seedExisting -> re-amorcage a 0001 (collision si import)", "composant": "numerotation", "preuve": "convention-actions.ts:115 nextRef sans seed ; numero.ts:62,74 ; numerotation.ts:36", "impact": "Apres reprise/import : collision (convention @unique throw ; diplome sans unique -> doublon)", "recommandation": "Fournir seedExisting scope annee pour CONV et titres", "charge": "S", "priorite": "P2", "type": "quick_win", "depend_de": []},
    {"id": "A06-019", "gravite": "jaune", "titre": "Jours feries jamais exclus + incoherence week-end genererSeances/joursSession", "composant": "emargement", "preuve": "emargement.ts:28-29 (sam/dim seul) ; emargement-actions.ts:46-58 (jours calendaires) ; exec 01/05 inclus", "impact": "Feuille d'emargement un jour ferie ; week-ends apres Generer les seances", "recommandation": "Calendrier de feries FR ; unifier la regle week-end", "charge": "M", "priorite": "P3", "type": "standard", "depend_de": []},
    {"id": "A06-020", "gravite": "jaune", "titre": "count()+1 reintroduit sur FactureEditeur (anti-pattern banni par numerotation.ts)", "composant": "numerotation", "preuve": "facture-editeur-actions.ts:99-101 vs numerotation.ts:7 ; mitige par numero @unique (schema:236)", "impact": "2 emissions concurrentes -> echec P2002 non catche (SUPERADMIN, mensuel) ; pas de doublon silencieux", "recommandation": "Utiliser nextSequence (cle globale editeur)", "charge": "S", "priorite": "P3", "type": "quick_win", "depend_de": []},
    {"id": "A06-021", "gravite": "jaune", "titre": "maxSuffix suppose la sequence en dernier segment - (fragile aux suffixes)", "composant": "numerotation", "preuve": "numerotation.ts:73 Number(r.split(-).pop()) ; cf. test numerotation.test.ts:15", "impact": "FAC-2026-0007-BIS -> NaN ignore -> sous-amorcage -> doublon/trou apres evolution de format", "recommandation": "Parser la sequence par regex ancree, pas pop()", "charge": "S", "priorite": "P3", "type": "quick_win", "depend_de": []},
    {"id": "A06-022", "gravite": "jaune", "titre": "Du incoherent entre fiche paiements candidat et comptabilite", "composant": "comptabilite", "preuve": "candidats/[id]/paiements/page.tsx:50 (ignore les factures) vs comptabilite/page.tsx:106-107", "impact": "Candidat avec factures mais montant nul : Du : - sur sa fiche, du reel en compta", "recommandation": "Helper unique montantDu(inscription) reutilise par les deux pages", "charge": "S", "priorite": "P3", "type": "quick_win", "depend_de": []},
    {"id": "A06-023", "gravite": "jaune", "titre": "Signature eIDAS (YouSign) annoncee - YouSign non branche (signature interne simple)", "composant": "promesse/reel", "preuve": "yousign.ts:18 YOUSIGN_IMPLEMENTED=false ; fonctionnalites/page.tsx:206", "impact": "La signature interne est un eIDAS simple valide ; c'est le wording qui induit en erreur", "recommandation": "Retirer YouSign de la promesse, ou brancher le flux v3", "charge": "S", "priorite": "P3", "type": "quick_win", "depend_de": []},
    {"id": "A06-024", "gravite": "jaune", "titre": "Code mort flows/devis-flow.ts imprime des flottants bruts", "composant": "devis", "preuve": "flows/devis-flow.ts:58-101 ; aucun import externe (mort)", "impact": "Nul aujourd'hui ; PDF a 15 decimales si recable tel quel", "recommandation": "Supprimer le module ou l'aligner sur calcMontants", "charge": "S", "priorite": "P3", "type": "quick_win", "depend_de": []}
  ],
  "conditions_go": [
    "Corriger A06-001 : calculer les heures reellement suivies + taux d'assiduite et les injecter dans le certificat de realisation et le BPF",
    "Corriger A06-002 : formateur monetaire 2 decimales sur la facture editeur et le contrat (coherence face lisible / XML Factur-X / SEPA)"
  ],
  "risques_residuels": [
    "Tests d'integration (isolation multi-tenant) non re-executes localement : reposent sur la CI",
    "Rendu PDF reel et validation Factur-X officielle (EN 16931) non outilles",
    "Facturation client integree absente (A06-003) : depend d'un logiciel tiers en attendant"
  ]
}
```
