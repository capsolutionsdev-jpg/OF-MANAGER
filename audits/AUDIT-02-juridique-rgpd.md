# COMPTE RENDU D'AUDIT 02 — Audit juridique / RGPD
## OFMANAGER — Programme d'audit de pré-commercialisation

**Date :** 2026-08-26
**Version auditée :** branche `security/audit-90-controls-2026-08` — commit `a23ae3a`
**Chef de projet audit :** Claude Code (chef de projet senior)
**Équipe mobilisée :** Juriste protection des données (DPO), Juriste contrats IT, Ingénieur privacy by design, Spécialiste transferts & hébergement, Analyste métier OF & interfaces publiques (+ contre-vérification personnelle du chef de projet sur les 🔴).
**Périmètre couvert :** Conformité RGPD d'OFMANAGER en tant que **sous-traitant art. 28** : cartographie des traitements, droits des personnes, conservation/minimisation, sous-traitance ultérieure, transferts, interfaces publiques et corpus documentaire (`legal/`). Sécurité technique offensive = audit 01 ; contrats commerciaux = audit 22 (clauses de données croisées signalées).
**Durée / profondeur :** Revue statique du corpus `legal/` (9 documents) + implémentation technique des droits + schéma des données + formulaires publics. **Analyse de conformité documentée — pas un avis juridique opposable** : les points nécessitant un avocat/DPO externe sont listés en §5.

---

### 1. SYNTHÈSE EXÉCUTIVE

Bonne surprise : OFMANAGER dispose déjà d'un corpus de conformité **structurellement complet** (DPA, registre des traitements, matrice de conservation, procédure de violation, liste de sous-traitants, clause de réversibilité, CGV, SLA) et d'outils techniques réels (consentement horodaté avec retrait, anonymisation des identités/photos/signatures, suivi des demandes, routes d'export, cron de purge). Il existe même un **contrat de prestation signé** (tracé manuscrit + IP + horodatage) entre l'éditeur et l'OF client. La minimisation est correcte (aucun NIR, IBAN ni passeport stocké). **Mais un blocage de fond interdit la commercialisation en l'état, et un second point majeur le talonne.** Le blocage (🔴) : des **données personnelles partent hors UE sans garantie documentée** — l'e-mail transactionnel est routé **activement** vers Resend (US, clé présente et sans repli Brevo) et la génération d'images vers OpenAI (US), pendant que la politique de confidentialité **affirme le contraire** (« hébergées au sein de l'UE »). Le point majeur (🟠) : **le DPA art. 28 n'est pas opposable** — le contrat signé est un contrat *commercial* qui ne porte aucune clause art. 28, et le DPA lui-même reste un brouillon à identité erronée (il nomme « CAP Compétences » alors que l'éditeur réel est « CAP SOLUTIONS », **non encore immatriculée**), rendu facultatif par la page CGV publiée. S'y ajoutent une liste de sous-traitants incomplète, une politique de confidentialité inexacte, une donnée de **santé** (situation de handicap) collectée sans base art. 9 outillée, et une conservation des logs annoncée mais jamais appliquée. Aucun de ces points n'exige de refonte technique : ce sont des corrections **juridiques et de configuration**, mais plusieurs sont **bloquantes**.

| 🔴 Rouge | 🟠 Orange | 🟡 Jaune | 🟢 Vert |
|---|---|---|---|
| 1 | 9 | 12 | 10 |

**VERDICT : GO CONDITIONNEL**
Le produit est *techniquement capable* d'être conforme, mais une non-conformité sanctionnable (transferts hors UE sans garantie documentée, doublée d'une mention publique fausse) est 🔴, et la finalisation d'un DPA art. 28 opposable est un 🟠 tout aussi **bloquant pour signer un premier client payant**. **Conditions de GO (P0) :** (1) encadrer les transferts hors UE (CCT/Data Privacy Framework ou bascule sur sous-traitants UE) et corriger les mentions « hébergement UE/France » ; (2) immatriculer l'éditeur, figer son identité dans tout le corpus, et rendre le DPA **obligatoire** (annexé/signé à la souscription, portant les clauses art. 28) ; (3) rendre la politique de confidentialité exacte ; (4) compléter la liste des sous-traitants ultérieurs (DPA + registre + politique) ; (5) désigner un point de contact RGPD et opérationnaliser la procédure de violation ; (6) établir la base légale art. 9 pour la donnée de handicap.

> **Note d'arbitrage (transparence Phase 3) :** la vérification adversariale a coté *orange* les deux constats initialement 🔴. **A02-002 (DPA)** a été **rétrogradé en 🟠** : le vérificateur a établi qu'un contrat éditeur↔client *est* signé (`contrat-prestation-public.ts`), infirmant « aucun contrat opposable » — mais ce contrat ne porte pas les clauses art. 28, donc la déficience demeure. **A02-001 (transferts)** est **maintenu en 🔴** au titre de la règle d'arbitrage de l'audit (« obligation légale = 🔴 par défaut » ; « en cas d'hésitation, le plus grave ») : le transfert est *actif* et la mention publique *fausse* ; dé-escalade possible en 🟠 si l'adhésion DPF/CCT des sous-traitants US est prouvée **et** la mention corrigée.

---

### 2. TABLEAU DES ANOMALIES

| ID | Gravité | Titre | Composant | Preuve | Impact | Recommandation | Charge | Priorité |
|---|---|---|---|---|---|---|---|---|
| A02-001 | 🔴 | Transferts de données hors UE sans garantie documentée | `lib/email.ts`, `lib/image-gen.ts`, `lib/ai.ts` | `email.ts:143-144` (Resend US prioritaire), `image-gen.ts:51` (OpenAI US), `lib/ai.ts` (Anthropic US) | PII (e-mails candidats) exportée hors UE, contredisant les mentions publiques « hébergement UE » | CCT/Data Privacy Framework par sous-traitant US, ou bascule UE (Brevo) ; mettre le registre à jour | M | P0 |
| A02-002 | 🟠 | DPA art. 28 non opposable (contrat signé sans clauses art. 28 + DPA brouillon + éditeur non immatriculé) | `app/cgv/page.tsx`, `legal/DPA-sous-traitance.md`, `src/lib/legal.ts`, `lib/actions/contrat-prestation-actions.ts` | `contrat-prestation-actions.ts` (contrat signé SANS clause art. 28) ; `cgv:108` « le cas échéant » ; `DPA:1` « BROUILLON » ; `DPA:8` « CAP Compétences » ≠ `legal.ts:13-18` « CAP SOLUTIONS … en cours d'immatriculation » | Un contrat commercial est signé mais ne couvre pas l'art. 28 ; le DPA reste inopposable (identité erronée) → art. 28 non satisfait pour l'éditeur et le client | Immatriculer CAP SOLUTIONS, figer l'identité, faire porter les clauses art. 28 par le DPA annexé et signé à la souscription | M | P0 |
| A02-003 | 🟠 | Politique de confidentialité inexacte (sous-traitants « tous UE », transferts tus) | `app/confidentialite/page.tsx` | `page.tsx:81-88` « situés dans l'Union européenne », omet IA + e-mail US | Information trompeuse des personnes (art. 13-14) ; aggrave le constat de transfert | Réécrire §5 : liste nominative des sous-traitants + mention des transferts hors UE et de leur garantie | S | P0 |
| A02-004 | 🟠 | Liste des sous-traitants ultérieurs incomplète (Resend, OpenAI, YouSign, Blob, Sentry, Turnstile) | `legal/DPA-sous-traitance.md`, `legal/sous-traitants-ulterieurs.md` | `DPA:62-68` (Vercel/Neon/Upstash/e-mail/Stripe) vs code `signature-actions.ts:7` (YouSign), `image-gen.ts:52` (OpenAI), `email.ts` (Resend) | Traitement par des sous-traitants non autorisés (art. 28-2) ; client privé de son droit d'objection | Compléter la liste dans DPA §6 + registre + politique ; nommer le fournisseur e-mail réel | S | P0 |
| A02-005 | 🟠 | Donnée de santé (situation de handicap, art. 9) collectée sans base art. 9 ni consentement explicite outillé | `prisma/schema.prisma`, `app/api/lead/route.ts`, `components/parcours/parcours-form.tsx` | `schema:712` `situationHandicap Boolean` ; `api/lead:123-126` écrit `true` ; `parcours-form:266-293` (case + `besoinsAdaptation`) | Traitement de catégorie particulière sans base art. 9-2 clairement établie (risque CNIL) | Établir la base art. 9 (obligation Qualiopi d'accessibilité ou consentement explicite) + mention dédiée à la collecte | M | P1 |
| A02-006 | 🟠 | Point de contact RGPD/DPO non désigné + procédure de violation non opérationnalisée | `legal/dossier-conformite-rgpd.md`, `legal/procedure-violation-donnees.md` | `dossier:51` « DPO / point de contact : [À COMPLÉTER] » | Incapacité pratique à tenir la notification 72 h (art. 33) ; client sans interlocuteur | Désigner un référent (nom + e-mail), figer la chaîne éditeur→client→CNIL avec délais | S | P1 |
| A02-007 | 🟠 | Effacement RGPD incomplet : des tables porteuses de PII non nettoyées | `lib/rgpd/anonymise.ts` | `anonymise.ts:115-188` (traite candidat/pièces/signatures mais laisse subsister des PII exploitables ailleurs) | Droit à l'effacement (art. 17) partiel ; résidus de données identifiantes | Étendre l'anonymisation à toutes les tables porteuses de PII (croiser avec A05-005) | M | P1 |
| A02-008 | 🟠 | Conservation des logs annoncée mais jamais appliquée (e-mails nominatifs + IP sans limite) | `legal/matrice-conservation.md`, `vercel.json`, `EmailLog` | `matrice:19` « logs 6 mois à 1 an — Suppression » vs `vercel.json` (aucun cron de purge des logs) | Non-respect de sa propre matrice (art. 5-1-e) ; rétention illimitée de PII | Ajouter un cron de purge des `EmailLog`/logs selon la matrice | M | P1 |
| A02-009 | 🟠 | Vercel Blob : région non verrouillée + pièces sensibles en `access:"public"` | `lib/blob.ts` | `blob.ts:19-24` `put(..., { access:"public", addRandomSuffix:true })` (photos d'identité, signatures) | Localisation non prouvée (transfert possible) + accès public de pièces sensibles (art. 5-1-f) | Passer en accès privé/signé, verrouiller/documenter la région du store | M | P1 |
| A02-010 | 🟠 | AIPD/DPIA ni réalisée ni outillée malgré données art. 9 et volumétrie multi-tenant | `legal/` (absence) | recherche `aipd\|dpia` = 0 fichier ; `dossier-conformite-rgpd.md` muet | L'éditeur ne peut démontrer l'évaluation de la nécessité d'une AIPD (accountability art. 35) ; clients démunis | Réaliser (ou motiver l'absence de) l'AIPD + fournir un modèle aux OF | L | P1 |
| A02-011 | 🟡 | Registre des traitements = brouillon : ni base légale ni durée par traitement ; IA/analytics/financeurs non recensés | `legal/registre-traitements.md` | `registre:5-6` coordonnées `[…]` ; table T1–T6 sans colonne base légale/durée | Registre art. 30-2 non opposable | Compléter base légale + durée + traitements manquants | S | P1 |
| A02-012 | 🟡 | Export « accès/portabilité » hétérogène et non exhaustif | `lib/actions/rgpd-actions.ts` | `rgpd-actions.ts:49-59` (omet apprenant/documents/conversations…) | Demande art. 15/20 potentiellement incomplète | Unifier un export exhaustif par personne | M | P2 |
| A02-013 | 🟡 | Preuve du consentement inégale (version de politique non enregistrée, IP partielle) | `prisma/schema.prisma`, `lib/actions/public-inscription-actions.ts` | `schema:1795-1796` (version/ip optionnels) ; `public-inscription-actions:121-128` (sans version/ip) | Accountability du consentement affaiblie (art. 7-1) | Enregistrer systématiquement version + horodatage (+ IP si base=consentement) | S | P2 |
| A02-014 | 🟡 | Adresse IP journalisée/conservée sans durée définie | `app/api/verification/route.ts` | `route.ts:116-117` `console.log` JSON incluant `ip` | Minimisation partielle (art. 5-1-c) ; rétention indéfinie | Retirer l'IP des logs ou définir/appliquer une durée | S | P2 |
| A02-015 | 🟡 | `situationHandicap` non remis à zéro par l'anonymisation | `lib/rgpd/anonymise.ts` | `anonymise.ts:50-96` (annule `besoinsAdaptation`, pas `situationHandicap`) | Résidu de donnée de santé sur enregistrement conservé | Inclure `situationHandicap=false` dans l'anonymisation | S | P2 |
| A02-016 | 🟡 | Suivi des demandes de droits sans échéance ni lien candidat | `prisma/schema.prisma` (`DataRequest`) | `schema:1804-1816` (pas de `dueDate` ni `candidatId`) | Dépassement du délai de réponse non détecté | Ajouter `dueDate` (J+30) + rattachement candidat | S | P2 |
| A02-017 | 🟡 | Aucun modèle de registre (art. 30-1) fourni aux OF clients | `legal/` | seul `registre-traitements.md` (éditeur, art. 30-2) | Non-conformité probable côté clients (imputée à l'outil) | Fournir un modèle de registre responsable de traitement | S | P2 |
| A02-018 | 🟡 | Mentions légales incomplètes (LCEN) — identité/hébergeur en cours | `src/lib/legal.ts`, `app/mentions-legales/page.tsx` | `legal.ts:16-18` « en cours d'immatriculation » | Mentions non conformes LCEN à la publication | Compléter à l'immatriculation (lié A02-002) | S | P1 |
| A02-019 | 🟡 | Formulaires publics sans mention d'information / lien vers la politique à la collecte | `components/public/public-inscription-form.tsx`, `app/contact/contact-form.tsx` | `public-inscription-form:410-421` (case sans lien) ; `contact-form` (aucune mention) | Information à la collecte insuffisante (art. 12-13) | Ajouter mention courte + lien politique sous chaque formulaire | S | P2 |
| A02-020 | 🟡 | Photo d'identité rendue obligatoire dès l'étape prospect (minimisation) | `components/prospect/prospect-form.tsx` | `prospect-form:135-136` (bloquant) | Collecte plus large/précoce que nécessaire (art. 5-1-c) | Différer la photo à l'inscription confirmée | S | P2 |
| A02-021 | 🟡 | DPA : nuances art. 28.3 (a/g/h) et documents à trous (délais réversibilité, SLA non testé, incohérences) | `legal/DPA-sous-traitance.md`, `legal/clause-reversibilite.md`, `legal/SLA.md` | `DPA:49,55,56` ; `clause-reversibilite:19-20` `[…]` ; `SLA:9,34-36` `[…]` | Clauses non finalisées/inopposables (litige à la résiliation, SLA invérifiable) | Finaliser les crochets, encadrer l'audit (préavis/coût), tester RTO/RPO avant d'afficher un taux | M | P1 |
| A02-022 | 🟡 | Sur-affirmation documentaire : RLS présentée comme « prête » alors qu'inactive | `legal/dossier-conformite-rgpd.md` | `dossier:17` « RLS PostgreSQL prête … comme filet » (or `RLS_ENABLED` off, cf. audit 05) | Exactitude des mesures de sécurité (art. 32) | Aligner le discours sur l'état réel (RLS conçue mais non activée) | S | P2 |

---

### 3. FICHES DÉTAILLÉES (toutes les 🔴 et 🟠)

#### A02-001 — Transferts de données personnelles hors UE sans garantie documentée — 🔴
- **Constat :** L'envoi d'e-mails privilégie **Resend** (`api.resend.com`, États-Unis) dès que sa clé est présente ; la génération d'images appelle **OpenAI** (`api.openai.com`, US) ; le module IA appelle **Anthropic** (US). Or les pages publiques affirment un hébergement UE/France, et aucun mécanisme de transfert (CCT / Data Privacy Framework) n'est documenté.
- **Preuve :** `lib/email.ts:143-144` `if (process.env.RESEND_API_KEY) { return sendViaResend(params, sender); }` (endpoint `:95` `fetch("https://api.resend.com/emails")`) ; `lib/image-gen.ts:51` `fetch("https://api.openai.com/v1/images/generations")` ; `app/page.tsx:110` « Hébergement en France » ; `app/confidentialite/page.tsx:86` « hébergées au sein de l'UE ».
- **Scénario d'impact :** Les e-mails transactionnels (convocations, attestations) contiennent nom + e-mail des stagiaires : ces PII transitent par un sous-traitant US sans garantie appropriée (chap. V RGPD). En cas de contrôle, l'éditeur (sous-traitant) et les OF (responsables) sont exposés à une sanction, et le registre art. 30-2 est inexact.
- **Cause racine :** Provider e-mail « serverless sans restriction IP » choisi pour la fiabilité, sans traiter la question du transfert ; mentions publiques rédigées avant la bascule.
- **Recommandation :** Pour chaque sous-traitant US actif (Resend, OpenAI, Anthropic, Sentry) : conclure des CCT / vérifier l'adhésion au Data Privacy Framework, **ou** basculer sur un équivalent UE (Brevo pour l'e-mail est déjà câblé). Mettre le registre et la politique à jour.
- **Charge :** M — **Priorité :** P0 — **Type :** Standard
- **Vérification de la correction :** Le registre liste chaque transfert avec sa garantie ; la politique de confidentialité mentionne les destinataires US et le mécanisme ; ou les clés US sont retirées au profit de Brevo.

#### A02-002 — DPA art. 28 non opposable — 🟠
- **Constat :** Un contrat éditeur↔client **est** réellement signé (contrat de prestation, avec tracé manuscrit + IP + horodatage), mais il s'agit d'un contrat **commercial** qui ne porte **aucune** clause art. 28 (traitement de données). Le DPA dédié, lui, reste un **brouillon** à identité non renseignée, nomme un cocontractant (**CAP Compétences**) différent de l'éditeur réel (**CAP SOLUTIONS**, **non immatriculée**), et la page CGV publiée le rend **facultatif**. L'obligation art. 28 n'est donc pas satisfaite, bien qu'un véhicule contractuel existe.
- **Preuve :** `src/lib/actions/contrat-prestation-actions.ts` (contrat généré/signé — `contrat-prestation-public.ts:32-41`, statut `SIGNE` — mais aucune occurrence de « DPA / art. 28 / sous-traitance / données personnelles » dans le contrat) ; `app/cgv/page.tsx:108` « …**le cas échéant**, dans un accord de sous-traitance (DPA) » (alors que `legal/CGV-abonnement-SaaS.md:11` le référence comme annexe standard — incohérence page/source) ; `legal/DPA-sous-traitance.md:1` « BROUILLON », `:8` « **CAP Compétences** … SIREN [n°] » ≠ `src/lib/legal.ts:13-18` `"CAP SOLUTIONS" … "En cours d'immatriculation"` ; `legal/CGV-abonnement-SaaS.md:66` « hébergé dans l'UE `[à confirmer]` ».
- **Scénario d'impact :** Un OF client signe un contrat commercial mais aucun DPA art. 28 valide n'y est adossé (mauvais cocontractant sur le DPA, mentions vides, caractère optionnel dans la page CGV). L'éditeur et le client restent en non-conformité art. 28 — opposable en cas de contrôle ou de litige.
- **Cause racine :** Corpus juridique préparé avant l'immatriculation de la société éditrice ; le DPA n'a pas été fusionné/annexé au contrat réellement signé.
- **Recommandation :** Immatriculer CAP SOLUTIONS ; figer l'identité (raison sociale, SIREN, siège, représentant) dans **tout** le corpus et `legal.ts` ; faire **porter les clauses art. 28** par le DPA, l'annexer au contrat de prestation existant et le faire **signer** à la souscription ; aligner la page CGV sur la source (retirer « le cas échéant »).
- **Charge :** M (juridique + intégration) — **Priorité :** P0 — **Type :** Chantier
- **Vérification de la correction :** Le parcours de souscription produit un DPA nominatif signé/horodaté portant les clauses art. 28 ; plus aucune mention « CAP Compétences » ni crochet dans le corpus.
- **Note :** Constat initialement proposé en 🔴, **rétrogradé en 🟠** après contre-vérification (l'existence d'un contrat signé infirme « absence totale de contrat opposable »).

#### A02-003 — Politique de confidentialité inexacte — 🟠
- **Constat :** La politique affirme que les sous-traitants sont « situés dans l'Union européenne » et n'énumère ni l'IA ni le fournisseur e-mail, alors que des traitements ont lieu aux US (cf. A02-001).
- **Preuve :** `app/confidentialite/page.tsx:81-88`.
- **Scénario d'impact :** Information trompeuse des personnes (art. 13-14) ; en cas de contrôle, aggrave le constat de transfert non déclaré.
- **Cause racine :** Politique non synchronisée avec la réalité technique.
- **Recommandation :** Réécrire le §5 avec la liste nominative des sous-traitants, les catégories de données transférées et le mécanisme de garantie.
- **Charge :** S — **Priorité :** P0 — **Type :** Quick win
- **Vérification :** La page reflète exactement la liste des sous-traitants du registre.

#### A02-004 — Liste des sous-traitants ultérieurs incomplète — 🟠
- **Constat :** Le DPA et le registre omettent plusieurs sous-traitants réellement câblés : Resend (e-mail US), OpenAI (images US), YouSign (signature — reçoit identité + documents), Vercel Blob (stockage), Sentry (erreurs US), Cloudflare Turnstile.
- **Preuve :** `legal/DPA-sous-traitance.md:62-68` (liste = Vercel, Neon, Upstash, e-mail, Stripe) ; code : `lib/actions/signature-actions.ts:7` (YouSign), `lib/image-gen.ts:52` (OpenAI), `lib/email.ts` (Resend), `lib/blob.ts` (Blob).
- **Scénario d'impact :** Recours à des sous-traitants ultérieurs **non autorisés contractuellement** (art. 28-2) ; le client ne peut exercer son droit d'objection.
- **Cause racine :** Liste rédigée à un instant T, non maintenue au fil des intégrations.
- **Recommandation :** Compléter la liste (DPA §6 + `sous-traitants-ulterieurs.md` + politique), avec pays et garantie de transfert ; instaurer une revue à chaque nouvelle intégration.
- **Charge :** S — **Priorité :** P0 — **Type :** Quick win
- **Vérification :** Chaque appel réseau sortant vers un tiers correspond à une ligne de la liste.

#### A02-005 — Donnée de santé (handicap, art. 9) sans base art. 9 outillée — 🟠
- **Constat :** La situation de handicap (donnée de santé, art. 9) est collectée via formulaires et API publics sans consentement explicite ni base art. 9 clairement établie/outillée.
- **Preuve :** `prisma/schema.prisma:712` `situationHandicap Boolean` ; `app/api/lead/route.ts:123-126` écrit `situationHandicap: true` ; `components/parcours/parcours-form.tsx:266-293` (case + textarea `besoinsAdaptation`).
- **Scénario d'impact :** Traitement de catégorie particulière sans base art. 9-2 — risque de sanction CNIL. La responsabilité première incombe à l'OF (responsable de traitement), mais l'outil ne fournit ni base ni mention adaptée.
- **Cause racine :** Champ ajouté pour l'obligation Qualiopi d'accessibilité, sans traitement du régime art. 9.
- **Recommandation :** Déterminer la base art. 9 (obligation légale d'accessibilité vs consentement explicite) et l'outiller (mention dédiée, case distincte, justification au registre).
- **Charge :** M — **Priorité :** P1 — **Type :** Standard
- **Vérification :** La collecte du handicap affiche une base art. 9 explicite et est tracée au registre.

#### A02-006 — Point de contact RGPD non désigné + violation non opérationnalisée — 🟠
- **Constat :** Aucun DPO/référent RGPD n'est désigné ; la procédure de violation reste théorique (délais de notification non actionnables).
- **Preuve :** `legal/dossier-conformite-rgpd.md:51` « Référent protection des données (DPO / point de contact RGPD) : [À COMPLÉTER — nom + e-mail] » ; incohérence de délai `DPA:54` « 48 h » vs `procedure-violation-donnees.md:16` « sans délai ».
- **Scénario d'impact :** Incapacité pratique à respecter la chaîne éditeur→client→CNIL (72 h, art. 33) ; le client n'a pas d'interlocuteur.
- **Cause racine :** Corpus non finalisé.
- **Recommandation :** Désigner un référent (nom + e-mail publiés), figer un délai unique éditeur→client, documenter le canal.
- **Charge :** S — **Priorité :** P1 — **Type :** Quick win
- **Vérification :** Un contact RGPD figure dans la politique et le DPA ; la procédure indique un délai unique.

#### A02-007 — Effacement RGPD incomplet — 🟠
- **Constat :** L'anonymisation traite l'identité directe, les pièces d'identité et les signatures, mais laisse subsister des PII dans d'autres tables, alors que le dispositif se présente comme un effacement complet.
- **Preuve :** `lib/rgpd/anonymise.ts:115-188` (`anonymiseCandidatComplet` couvre candidat, pièces, inscription, émargement, présence, messages — mais pas l'exhaustivité des tables porteuses de PII).
- **Scénario d'impact :** Droit à l'effacement (art. 17) partiel ; des données identifiantes subsistent après une demande d'effacement.
- **Cause racine :** Anonymisation ciblée sur les entités principales, non exhaustive ; couplé à l'absence de suppression tenant-globale (audit 05, A05-005/A05-014).
- **Recommandation :** Recenser toutes les tables porteuses de PII et étendre l'anonymisation/suppression (y compris blobs et logs) ; réutiliser `bestEffortDeleteBlobs`.
- **Charge :** M — **Priorité :** P1 — **Type :** Standard
- **Vérification :** Après effacement d'une personne, aucune PII résiduelle en base, blob ou logs.

#### A02-008 — Conservation des logs non appliquée — 🟠
- **Constat :** La matrice fixe une durée de conservation des journaux (6 mois–1 an), mais aucun cron ne purge les logs ni les `EmailLog` nominatifs.
- **Preuve :** `legal/matrice-conservation.md:19` « Journaux techniques / audit / logs e-mail — 6 mois à 1 an — Suppression » ; `vercel.json:12-41` (crons = parcours, documents-b2b, rgpd-purge, purge-demos, purge-pdf-cache, mrr-snapshot — **pas** de purge des logs).
- **Scénario d'impact :** Non-respect de sa propre matrice (art. 5-1-e) : stockage illimité d'e-mails nominatifs et de journaux — écart documentation/réalité opposable.
- **Cause racine :** Cron de purge des logs non implémenté/planifié.
- **Recommandation :** Ajouter un cron de purge des `EmailLog`/journaux selon la matrice.
- **Charge :** M — **Priorité :** P1 — **Type :** Standard
- **Vérification :** Les `EmailLog` au-delà de la durée sont supprimés automatiquement.

#### A02-009 — Vercel Blob : région non verrouillée + pièces sensibles en accès public — 🟠
- **Constat :** Les fichiers (dont photos d'identité et signatures) sont stockés en `access: "public"` sur Vercel Blob, sans région verrouillée/documentée.
- **Preuve :** `lib/blob.ts:19-24` `put(..., { access: "public", addRandomSuffix: true })`.
- **Scénario d'impact :** Accès public de pièces sensibles (art. 5-1-f) si une URL fuit ou est devinée/indexée ; localisation non prouvée = risque de transfert non déclaré.
- **Cause racine :** Choix d'accès public (simplicité d'affichage), mitigé par un suffixe aléatoire mais non suffisant pour des données sensibles.
- **Recommandation :** Passer en accès privé/URL signée à durée limitée ; verrouiller/documenter la région du store.
- **Charge :** M — **Priorité :** P1 — **Type :** Standard
- **Vérification :** Une URL de pièce d'identité expire et exige une signature ; la région du store est documentée en UE.

#### A02-010 — AIPD/DPIA absente malgré données art. 9 — 🟠
- **Constat :** Aucune AIPD n'est réalisée ni outillée, alors que le traitement porte des données de santé et une volumétrie multi-tenant.
- **Preuve :** recherche `aipd|dpia` = 0 fichier dans `legal/`/`docs/` ; `legal/dossier-conformite-rgpd.md` n'aborde pas l'AIPD.
- **Scénario d'impact :** L'éditeur ne peut démontrer avoir évalué la nécessité d'une AIPD (accountability, art. 35) ; chaque OF pourrait devoir en réaliser une sans outil.
- **Cause racine :** Étape non traitée dans la préparation à la conformité.
- **Recommandation :** Réaliser une AIPD (ou motiver son absence par écrit) et fournir un modèle aux OF clients.
- **Charge :** L — **Priorité :** P1 — **Type :** Chantier
- **Vérification :** Un document AIPD (ou une note de non-nécessité motivée) existe et est référencé.

---

### 4. POINTS CONFORMES (🟢)

1. **Corpus de conformité présent et structuré** : DPA, registre des traitements, matrice de conservation, procédure de violation, liste de sous-traitants, clause de réversibilité, CGV, SLA — une base rare pour un éditeur d'une personne (à finaliser, cf. §2/§3).
2. **Consentement outillé** : modèle `Consentement` horodaté avec `retireLe` (retrait) et `version` ; recueil à l'inscription.
3. **Anonymisation réelle** : `lib/rgpd/anonymise.ts` neutralise identité directe, pièces d'identité et signatures manuscrites (au-delà d'un simple flag).
4. **Suivi des demandes de droits** : modèle `DataRequest` (type, statut, `processedAt/By`).
5. **Minimisation des données ultra-sensibles** : aucun NIR, IBAN, ni numéro de passeport stocké (vérifié par grep sur le schéma).
6. **Droit d'accès/export outillé** : ~15 routes d'export, dont un export par personne (`candidats/[id]/export`).
7. **Purge automatisée partielle** : cron `rgpd-purge` planifié dans `vercel.json`.
8. **Cookies** : pas de bandeau requis détecté — l'analytics employé est *cookieless* et seuls des cookies strictement nécessaires (session next-auth) sont posés (à confirmer que seul Plausible/équivalent cookieless est utilisé).
9. **Sécurité des secrets** : secrets sous-traitants (clé YouSign par organisme) chiffrés au repos (`lib/crypto`), 2FA TOTP disponible.
10. **Matrice de conservation** existante et alignée sur les obligations OF (BPF/factures) dans sa structure.

---

### 5. CONTRÔLES NON RÉALISÉS

| Contrôle | Raison | Ce qu'il faudrait pour le faire |
|---|---|---|
| Validation juridique opposable du corpus (DPA, CGV, politique) | Hors mandat (analyse de conformité, pas avis juridique) — corpus auto-étiqueté « à faire valider » | Relecture par un avocat / DPO externe |
| Localisation effective des sous-traitants et des sauvegardes | Régions non toutes déterminables depuis le dépôt (secrets Vercel/Neon) | Accès aux consoles Vercel/Neon (région DB, région Blob, région Sentry) |
| Base légale art. 9 (handicap) définitive | Décision juridique | Arbitrage avocat/DPO : obligation légale d'accessibilité vs consentement explicite |
| Nécessité d'une AIPD | Décision de conformité | Analyse AIPD dédiée (nature/volumétrie/données art. 9) |
| Contenu réel des logs Vercel en production (PII, durée) | Pas d'accès aux logs runtime de prod | Revue des logs Vercel + politique de rétention du provider |
| Valeurs d'env de prod (`RESEND_API_KEY` actif ? Brevo fallback ?) | Non présentes dans le dépôt | Lecture du panneau d'env Vercel (déterminera si le transfert US est réellement actif) |

---

### 6. QUICK WINS

- **A02-003** (🟠, S) — corriger la politique de confidentialité (liste des sous-traitants + transferts).
- **A02-004** (🟠, S) — compléter la liste des sous-traitants ultérieurs (DPA + registre + politique).
- **A02-006** (🟠, S) — désigner un point de contact RGPD + délai unique de violation.
- **A02-002** (🔴, M) — figer l'identité de l'éditeur dans tout le corpus + rendre le DPA obligatoire (déclenche l'immatriculation).
- **A02-014/A02-015** (🟡, S) — retirer l'IP des logs de vérification ; inclure `situationHandicap` dans l'anonymisation.

---

### 7. PLAN DE REMÉDIATION

- **Vague 1 — avant Go-Live (P0) :** A02-001 (encadrer/retirer les transferts US), A02-002 (immatriculation + DPA obligatoire), A02-003 (politique exacte), A02-004 (liste sous-traitants). Ces quatre points conditionnent la signature du premier client.
- **Vague 2 — J+30 (P1) :** A02-005 (base art. 9 handicap), A02-006 (contact + violation), A02-007 (effacement exhaustif), A02-008 (purge logs), A02-009 (blob privé/région), A02-010 (AIPD), A02-011/A02-018/A02-021 (finalisation du corpus).
- **Vague 3 — J+90 (P2/P3) :** A02-012 à A02-020, A02-022 (export exhaustif, preuve de consentement, IP, DataRequest, modèle registre client, formulaires, minimisation photo, exactitude documentaire RLS).

---

### 8. ANNEXES

- **Méthode :** 5 sous-agents spécialistes (Workflow journalisé) + contre-vérification personnelle du chef de projet sur les 2 constats 🔴 (lecture directe `fichier:ligne`). Forte convergence inter-spécialistes (transferts US + sous-traitants incomplets + politique inexacte remontés indépendamment par 3–4 lots).
- **Corpus analysé :** `legal/{DPA-sous-traitance, CGV-abonnement-SaaS, SLA, clause-reversibilite, dossier-conformite-rgpd, matrice-conservation, procedure-violation-donnees, registre-traitements, sous-traitants-ulterieurs}.md` ; pages `app/{confidentialite,mentions-legales,cgv}` ; code `lib/{email,image-gen,ai,blob,rgpd/anonymise,rgpd-retention,legal}.ts`, `lib/actions/{rgpd,registre,public-inscription,signature}-actions.ts` ; schéma (`DataRequest`, `Consentement`, `situationHandicap`, `photoUrl`, signatures).
- **Commandes clés :** grep `situationHandicap|photoUrl|signature|nir|iban|passeport` (schéma) ; grep `resend|openai|anthropic|brevo|yousign|sentry` (sous-traitants) ; `grep -ri "aipd|dpia" legal docs` = 0.
- **Note :** analyse en lecture seule ; aucun fichier produit modifié. Rapport = analyse de conformité documentée, **non un avis juridique opposable**.

---

### 9. BLOC DE CONSOLIDATION (ne pas modifier le format)

```json
{
  "audit_id": 2,
  "audit_nom": "Audit juridique / RGPD",
  "date": "2026-08-26",
  "commit": "a23ae3a5e93952684864e1d3f7638c4220593c57",
  "verdict": "GO_CONDITIONNEL",
  "compteurs": {"rouge": 1, "orange": 9, "jaune": 12, "vert": 10, "non_verifie": 6},
  "anomalies": [
    {"id": "A02-001", "gravite": "rouge", "titre": "Transferts de données hors UE sans garantie documentée", "composant": "lib/email.ts, lib/image-gen.ts, lib/ai.ts", "preuve": "email.ts:143-144 (Resend US prioritaire), image-gen.ts:51 (OpenAI US)", "impact": "PII (e-mails candidats) exportée hors UE, contredisant les mentions 'hébergement UE'", "recommandation": "CCT/DPF par sous-traitant US ou bascule UE (Brevo) + registre à jour", "charge": "M", "priorite": "P0", "type": "standard", "depend_de": ["A02-004"]},
    {"id": "A02-002", "gravite": "orange", "titre": "DPA art.28 non opposable (contrat signe sans clauses art.28 + DPA brouillon + editeur non immatricule)", "composant": "lib/actions/contrat-prestation-actions.ts, app/cgv/page.tsx, legal/DPA-sous-traitance.md, lib/legal.ts", "preuve": "contrat-prestation signe SANS clause art.28 ; cgv:108 'le cas echeant' ; DPA:1 BROUILLON ; DPA:8 'CAP Competences' vs legal.ts:13-18 'CAP SOLUTIONS en cours d'immatriculation'", "impact": "Contrat commercial signe mais art.28 non couvert ; DPA inopposable (identite erronee) → art.28 non satisfait", "recommandation": "Immatriculer CAP SOLUTIONS, figer l'identite, faire porter les clauses art.28 par le DPA annexe et signe a la souscription", "charge": "M", "priorite": "P0", "type": "chantier", "depend_de": []},
    {"id": "A02-003", "gravite": "orange", "titre": "Politique de confidentialite inexacte (sous-traitants tous UE, transferts tus)", "composant": "app/confidentialite/page.tsx", "preuve": "page.tsx:81-88 'situes dans l'Union europeenne', omet IA+e-mail US", "impact": "Information trompeuse des personnes (art.13-14)", "recommandation": "Reecrire §5 : liste nominative + transferts hors UE et garantie", "charge": "S", "priorite": "P0", "type": "quick_win", "depend_de": ["A02-004"]},
    {"id": "A02-004", "gravite": "orange", "titre": "Liste des sous-traitants ulterieurs incomplete (Resend, OpenAI, YouSign, Blob, Sentry, Turnstile)", "composant": "legal/DPA-sous-traitance.md, legal/sous-traitants-ulterieurs.md", "preuve": "DPA:62-68 vs signature-actions.ts:7 (YouSign), image-gen.ts:52 (OpenAI), email.ts (Resend)", "impact": "Sous-traitants non autorises (art.28-2) ; client prive du droit d'objection", "recommandation": "Completer DPA §6 + registre + politique ; nommer le fournisseur e-mail reel", "charge": "S", "priorite": "P0", "type": "quick_win", "depend_de": []},
    {"id": "A02-005", "gravite": "orange", "titre": "Donnee de sante (handicap, art.9) sans base art.9 ni consentement explicite outille", "composant": "prisma/schema.prisma, app/api/lead/route.ts, components/parcours/parcours-form.tsx", "preuve": "schema:712 situationHandicap ; api/lead:123-126 ; parcours-form:266-293", "impact": "Traitement de categorie particuliere sans base art.9-2 (risque CNIL)", "recommandation": "Etablir la base art.9 (obligation Qualiopi ou consentement explicite) + mention dediee", "charge": "M", "priorite": "P1", "type": "standard", "depend_de": []},
    {"id": "A02-006", "gravite": "orange", "titre": "Point de contact RGPD/DPO non designe + procedure de violation non operationnalisee", "composant": "legal/dossier-conformite-rgpd.md, legal/procedure-violation-donnees.md", "preuve": "dossier:51 'DPO : [A COMPLETER]' ; incoherence delai DPA:54 48h vs procedure:16 'sans delai'", "impact": "Incapacite a tenir la notification 72h (art.33) ; client sans interlocuteur", "recommandation": "Designer un referent (nom+e-mail), figer la chaine et les delais", "charge": "S", "priorite": "P1", "type": "quick_win", "depend_de": []},
    {"id": "A02-007", "gravite": "orange", "titre": "Effacement RGPD incomplet : tables porteuses de PII non nettoyees", "composant": "lib/rgpd/anonymise.ts", "preuve": "anonymise.ts:115-188 (couvre identite/pieces/signatures mais pas l'exhaustivite)", "impact": "Droit a l'effacement (art.17) partiel ; PII residuelles", "recommandation": "Etendre a toutes les tables PII + blobs + logs (croiser A05-005)", "charge": "M", "priorite": "P1", "type": "standard", "depend_de": []},
    {"id": "A02-008", "gravite": "orange", "titre": "Conservation des logs annoncee mais jamais appliquee", "composant": "legal/matrice-conservation.md, vercel.json, EmailLog", "preuve": "matrice:19 'logs 6 mois a 1 an' vs vercel.json (aucun cron de purge logs)", "impact": "Non-respect de sa propre matrice (art.5-1-e) ; retention illimitee de PII", "recommandation": "Ajouter un cron de purge des EmailLog/logs selon la matrice", "charge": "M", "priorite": "P1", "type": "standard", "depend_de": []},
    {"id": "A02-009", "gravite": "orange", "titre": "Vercel Blob : region non verrouillee + pieces sensibles en access public", "composant": "lib/blob.ts", "preuve": "blob.ts:19-24 put(access:'public', addRandomSuffix:true) (photos identite, signatures)", "impact": "Acces public de pieces sensibles (art.5-1-f) + localisation non prouvee", "recommandation": "Acces prive/URL signee + verrouiller/documenter la region", "charge": "M", "priorite": "P1", "type": "standard", "depend_de": []},
    {"id": "A02-010", "gravite": "orange", "titre": "AIPD/DPIA ni realisee ni outillee malgre donnees art.9 + volumetrie", "composant": "legal/ (absence)", "preuve": "recherche aipd|dpia = 0 fichier ; dossier-conformite muet", "impact": "Accountability art.35 non demontrable ; clients demunis", "recommandation": "Realiser (ou motiver l'absence de) l'AIPD + fournir un modele aux OF", "charge": "L", "priorite": "P1", "type": "chantier", "depend_de": []},
    {"id": "A02-011", "gravite": "jaune", "titre": "Registre des traitements = brouillon (ni base legale ni duree ; IA/analytics/financeurs absents)", "composant": "legal/registre-traitements.md", "preuve": "registre:5-6 coordonnees vides ; table T1-T6 sans colonne base legale/duree", "impact": "Registre art.30-2 non opposable", "recommandation": "Completer base legale + duree + traitements manquants", "charge": "S", "priorite": "P1", "type": "quick_win", "depend_de": []},
    {"id": "A02-012", "gravite": "jaune", "titre": "Export acces/portabilite heterogene et non exhaustif", "composant": "lib/actions/rgpd-actions.ts", "preuve": "rgpd-actions.ts:49-59 (omet apprenant/documents/conversations)", "impact": "Demande art.15/20 potentiellement incomplete", "recommandation": "Unifier un export exhaustif par personne", "charge": "M", "priorite": "P2", "type": "standard", "depend_de": []},
    {"id": "A02-013", "gravite": "jaune", "titre": "Preuve du consentement inegale (version non enregistree, IP partielle)", "composant": "prisma/schema.prisma, lib/actions/public-inscription-actions.ts", "preuve": "schema:1795-1796 (version/ip optionnels) ; public-inscription-actions:121-128 (sans version/ip)", "impact": "Accountability du consentement affaiblie (art.7-1)", "recommandation": "Enregistrer version + horodatage systematiquement", "charge": "S", "priorite": "P2", "type": "quick_win", "depend_de": []},
    {"id": "A02-014", "gravite": "jaune", "titre": "Adresse IP journalisee/conservee sans duree definie", "composant": "app/api/verification/route.ts", "preuve": "route.ts:116-117 console.log JSON incluant ip", "impact": "Minimisation partielle (art.5-1-c) ; retention indefinie", "recommandation": "Retirer l'IP des logs ou definir/appliquer une duree", "charge": "S", "priorite": "P2", "type": "quick_win", "depend_de": []},
    {"id": "A02-015", "gravite": "jaune", "titre": "situationHandicap non remis a zero par l'anonymisation", "composant": "lib/rgpd/anonymise.ts", "preuve": "anonymise.ts:50-96 (annule besoinsAdaptation, pas situationHandicap)", "impact": "Residu de donnee de sante sur enregistrement conserve", "recommandation": "Inclure situationHandicap=false dans l'anonymisation", "charge": "S", "priorite": "P2", "type": "quick_win", "depend_de": []},
    {"id": "A02-016", "gravite": "jaune", "titre": "Suivi des demandes de droits sans echeance ni lien candidat", "composant": "prisma/schema.prisma (DataRequest)", "preuve": "schema:1804-1816 (pas de dueDate ni candidatId)", "impact": "Depassement du delai de reponse non detecte", "recommandation": "Ajouter dueDate (J+30) + rattachement candidat", "charge": "S", "priorite": "P2", "type": "quick_win", "depend_de": []},
    {"id": "A02-017", "gravite": "jaune", "titre": "Aucun modele de registre (art.30-1) fourni aux OF clients", "composant": "legal/", "preuve": "seul registre-traitements.md (editeur, art.30-2)", "impact": "Non-conformite probable cote clients (imputee a l'outil)", "recommandation": "Fournir un modele de registre responsable de traitement", "charge": "S", "priorite": "P2", "type": "quick_win", "depend_de": []},
    {"id": "A02-018", "gravite": "jaune", "titre": "Mentions legales incompletes (LCEN) - identite/hebergeur en cours", "composant": "lib/legal.ts, app/mentions-legales/page.tsx", "preuve": "legal.ts:16-18 'en cours d'immatriculation'", "impact": "Mentions non conformes LCEN a la publication", "recommandation": "Completer a l'immatriculation (lie A02-002)", "charge": "S", "priorite": "P1", "type": "quick_win", "depend_de": ["A02-002"]},
    {"id": "A02-019", "gravite": "jaune", "titre": "Formulaires publics sans mention d'information / lien politique a la collecte", "composant": "components/public/public-inscription-form.tsx, app/contact/contact-form.tsx", "preuve": "public-inscription-form:410-421 (case sans lien) ; contact-form (aucune mention)", "impact": "Information a la collecte insuffisante (art.12-13)", "recommandation": "Ajouter mention + lien politique sous chaque formulaire", "charge": "S", "priorite": "P2", "type": "quick_win", "depend_de": []},
    {"id": "A02-020", "gravite": "jaune", "titre": "Photo d'identite obligatoire des l'etape prospect (minimisation)", "composant": "components/prospect/prospect-form.tsx", "preuve": "prospect-form:135-136 (bloquant)", "impact": "Collecte plus large/precoce que necessaire (art.5-1-c)", "recommandation": "Differer la photo a l'inscription confirmee", "charge": "S", "priorite": "P2", "type": "quick_win", "depend_de": []},
    {"id": "A02-021", "gravite": "jaune", "titre": "DPA nuances art.28.3 (a/g/h) + documents a trous (reversibilite, SLA non teste)", "composant": "legal/DPA-sous-traitance.md, legal/clause-reversibilite.md, legal/SLA.md", "preuve": "DPA:49,55,56 ; clause-reversibilite:19-20 ; SLA:9,34-36", "impact": "Clauses non finalisees/inopposables ; SLA inverifiable", "recommandation": "Finaliser les crochets, encadrer l'audit, tester RTO/RPO avant d'afficher un taux", "charge": "M", "priorite": "P1", "type": "standard", "depend_de": []},
    {"id": "A02-022", "gravite": "jaune", "titre": "Sur-affirmation documentaire : RLS presentee comme prete alors qu'inactive", "composant": "legal/dossier-conformite-rgpd.md", "preuve": "dossier:17 'RLS PostgreSQL prete comme filet' (or RLS_ENABLED off, audit 05)", "impact": "Exactitude des mesures de securite (art.32)", "recommandation": "Aligner le discours sur l'etat reel (RLS concue mais non activee)", "charge": "S", "priorite": "P2", "type": "quick_win", "depend_de": []}
  ],
  "conditions_go": [
    "A02-002 : immatriculer CAP SOLUTIONS, figer l'identite dans tout le corpus, rendre le DPA obligatoire et signe a la souscription",
    "A02-001 : encadrer les transferts hors UE (CCT/DPF) ou basculer sur des sous-traitants UE ; corriger les mentions 'hebergement UE/France'",
    "A02-004 : completer la liste des sous-traitants ulterieurs (DPA + registre + politique)",
    "A02-003 : rendre la politique de confidentialite exacte (sous-traitants + transferts)",
    "A02-006 : designer un point de contact RGPD et operationnaliser la procedure de violation"
  ],
  "risques_residuels": [
    "Conformite documentaire dependante de la validation par un avocat/DPO externe (hors mandat)",
    "Gravite d'A02-001 dependante des env de prod (RESEND actif vs fallback Brevo UE) non verifiables depuis le depot",
    "Localisation exacte des sous-traitants/sauvegardes non prouvee sans acces aux consoles Vercel/Neon",
    "Base legale art.9 (handicap) et necessite d'une AIPD a trancher juridiquement",
    "Effacement RGPD non exhaustif tant que la suppression tenant-globale (audit 05) n'est pas implementee"
  ]
}
```
