# Rapport d'anomalies — Lot P1 (sécurité & cœur métier)

> Campagne QA OFMANAGER. Périmètre P1 validé : cloisonnement multi-tenant, marque
> blanche, éligibilité documentaire, signature/tokens, auth & rôles, cœur métier
> (inscription, convention, émargement, certification, automatisations).
> Méthode : revue de code ciblée + suite Vitest. **Chaque fiche a un repro concret.**

## Synthèse

| État | Constat |
|---|---|
| ✅ **Solide** | **Cloisonnement multi-tenant** : `scopedPrisma` isole correctement (test 5/5 sur base réelle). Le motif « vérifier-puis-muter » (`findFirst {id, organismeId}` avant mutation) est appliqué avec discipline dans les actions tenant auditées. **Aucune fuite inter-tenant confirmée.** |
| ✅ **Corrigé** | **Cachet/signature marque blanche** : le correctif `EMPTY_IMAGE` est bien en place et substitué partout (build-pdf.ts). Pas de fuite du tampon CAP. |
| ✅ **Solide** | **Tokens publics** : 192 bits d'aléa (non énumérables) ; signature idempotente (anti-rejeu l.428). |
| ⚠️ **9 anomalies** | dont **1 P1** (marque blanche logo), **3 P2** (automatisations, surbooking, IDOR), **5 P3**. |

Baseline Vitest : **91 passés / 5 ignorés** (les 5 = suite isolation, activée manuellement et **verte 5/5** contre la base).

---

## BUG-OFM-001 — Le logo CAP s'affiche sur les documents d'un tenant sans logo
- **Module / Fonction** : Documents / génération PDF (marque blanche)
- **Sévérité** : Majeur · **Priorité** : P1
- **Environnement** : `C:\qa-of`, tous tenants, tout document PDF
- **Préconditions** : un organisme dont `logoUrl` est vide (cas du tenant `[QA]`, et de tout nouveau client tant qu'il n'a pas chargé son logo)
- **Étapes de repro** :
  1. Créer/utiliser un tenant sans `logoUrl` (ex. `[QA] Organisme Test`).
  2. Générer n'importe quel document (fiche d'inscription, attestation…).
- **Résultat attendu** : logo du tenant, ou à défaut **rien** (comme le cachet), jamais l'asset d'un autre organisme.
- **Résultat observé** : le **logo « CAP Compétences »** est embarqué dans le PDF.
- **Preuve / cause** : `src/lib/documents/build-pdf.ts:133` (et 256, 335, 395) — `const logo64 = org.logoUrl ?? \`data:image/png;base64,${logoBuf...}\`` où `logoBuf` = `public/cap-competences-logo.png`. Le cachet, lui, retombe correctement sur `EMPTY_IMAGE` (l.137). Incohérence : le logo n'a pas reçu le même traitement que le correctif cachet.
- **Correctif proposé** : `logo64 = org.logoUrl ?? EMPTY_IMAGE` (ou le texte `org.name`), et définir le logo CAP comme `logoUrl` du **tenant CAP** uniquement.
- **Fréquence** : systématique · **Statut** : Ouvert

## BUG-OFM-002 — Automatisation : un e-mail en échec est marqué « envoyé » et jamais renvoyé
- **Module / Fonction** : Automatisations / `runAutomations`
- **Sévérité** : Majeur · **Priorité** : P2
- **Préconditions** : envoi e-mail qui échoue (SMTP KO, quota, adresse invalide) pendant le cron
- **Étapes de repro** :
  1. Une inscription signée éligible à la convocation, avec envoi e-mail en échec.
  2. Lancer les automatisations.
  3. Relancer les automatisations plus tard (envoi réparé).
- **Résultat attendu** : tant que l'envoi n'a pas réussi, il est retenté au run suivant.
- **Résultat observé** : le jalon (`convocationSentAt`, `rappelSentAt`, `attestationEntreeSentAt`, `satisfactionSentAt`, `docsFinSentAt`…) est posé **inconditionnellement**, même sur échec → **jamais retenté**. L'`EmailLog` reste `EN_ATTENTE` et **aucun mécanisme ne le reprend** (aucune requête ne relit les `EN_ATTENTE`).
- **Preuve / cause** : `src/lib/automation-engine.ts` — `logAndSend` retourne `res.sent` mais la valeur est **ignorée** ; `prisma.inscription.update({ data: { convocationSentAt: new Date() } })` suit sans condition (idem pour chaque événement).
- **Correctif proposé** : ne poser le jalon que si `sent === true` (ou ajouter un balayage de reprise des `EmailLog.EN_ATTENTE`).
- **Fréquence** : systématique sur échec · **Statut** : Ouvert

## BUG-OFM-003 — Surbooking : `nbPlaces` jamais contrôlé à l'inscription
- **Module / Fonction** : Sessions / Inscription (manuelle **et** convention groupée)
- **Sévérité** : Majeur · **Priorité** : P2
- **Préconditions** : une session avec `nbPlaces = N`
- **Étapes de repro** :
  1. Session à 10 places déjà pleine (10 inscrits).
  2. Inscrire un 11ᵉ candidat (ou une convention de 5 salariés).
- **Résultat attendu** : blocage ou avertissement explicite « session complète ».
- **Résultat observé** : l'inscription passe ; le dashboard affiche « 11/10 ».
- **Preuve / cause** : `nbPlaces` n'est utilisé que pour l'**affichage** (`dashboard/page.tsx`, `api/public/sessions/route.ts:46` calcule même `placesRestantes` mais rien ne bloque). Aucun contrôle dans `inscription-actions.ts` ni `convention-actions.ts`.
- **Correctif proposé** : contrôle de capacité (dur ou avec confirmation) avant `inscription.create`.
- **Fréquence** : systématique · **Statut** : Ouvert

## BUG-OFM-004 — IDOR/rôle : relance de parcours sans contrôle d'organisme ni de rôle
- **Module / Fonction** : Parcours / `relanceParcours`, `resendParcoursAction`
- **Sévérité** : Majeur · **Priorité** : P2 (barrière pratique : `inscriptionId` = cuid non énumérable)
- **Préconditions** : être connecté (n'importe quel rôle, y compris APPRENANT/FORMATEUR) ; connaître un `inscriptionId` d'un autre organisme
- **Étapes de repro** :
  1. Se connecter avec un compte quelconque.
  2. Invoquer `relanceParcours(inscriptionId)` avec l'id d'une inscription d'un **autre** organisme.
- **Résultat attendu** : refus (rôle insuffisant / ressource hors de mon organisme).
- **Résultat observé** : `startParcours` lit l'inscription en **prisma brut sans `organismeId`** et déclenche l'e-mail de parcours vers le candidat de l'autre organisme.
- **Preuve / cause** : `src/lib/actions/parcours-actions.ts:90-95` et `:98-106` ne vérifient que `session?.user` ; `startParcours` (`:33`) `prisma.inscription.findUnique({ where: { id } })` sans scope.
- **Correctif proposé** : `staffOrg()` (rôle + organisme) dans les wrappers ; scoper `startParcours` via `getTenantDb` ou `{ id, organismeId }`.
- **Fréquence** : systématique (si id connu) · **Statut** : Ouvert

## BUG-OFM-005 — Double envoi possible (check-then-act sans verrou)
- **Module / Fonction** : Automatisations / `runAutomations`
- **Sévérité** : Mineur · **Priorité** : P2 · **Confiance** : PLAUSIBLE
- **Préconditions** : deux exécutions concurrentes (cron quotidien + bouton manuel « lancer les automatisations », ou double-clic)
- **Étapes de repro** : déclencher `runAutomations` deux fois quasi-simultanément.
- **Résultat attendu** : un seul envoi par jalon.
- **Résultat observé (probable)** : les deux exécutions lisent `!sentAt = true` avant que l'une pose le jalon → **e-mail en double**.
- **Preuve / cause** : `automation-engine.ts` — lecture puis mise à jour non atomiques, aucun verrou/`updateMany` conditionnel.
- **Correctif proposé** : `updateMany({ where: { id, convocationSentAt: null }, data:{…} })` et n'envoyer que si `count === 1` ; ou verrou d'exécution du cron.
- **Statut** : À investiguer (repro dynamique)

## BUG-OFM-006 — Contrat vs convention décidé par le lien entreprise, pas par le financement
- **Module / Fonction** : Documents / éligibilité (`families.ts`)
- **Sévérité** : Mineur · **Priorité** : P3 · **Confiance** : SUSPECTÉ (règle métier à confirmer)
- **Préconditions** : candidat rattaché à une entreprise mais **financé en propre** (CPF, autofinancement)
- **Résultat attendu** : contrat de formation (particulier) si le stagiaire finance lui-même.
- **Résultat observé** : `hasEntreprise = true` → **convention** générée, pas de contrat.
- **Preuve / cause** : `src/lib/documents/families.ts:95-97,120` — `CONTRAT_FORMATION: !hasEntreprise`, `CONVENTION_*: hasEntreprise` ; `hasEntreprise` ne tient pas compte de `financementType`. Or vous aviez indiqué que le **type de financement** doit déterminer les documents.
- **Correctif proposé** : décider contrat/convention selon financement (ex. `financementType ∈ {ENTREPRISE, OPCO}` → convention ; sinon contrat), à valider.
- **Statut** : Ouvert (décision métier)

## BUG-OFM-007 — Convention groupée : pas de transaction ni de dédup des « nouveaux salariés »
- **Module / Fonction** : Clients pro / `createConventionEntreprise`
- **Sévérité** : Mineur · **Priorité** : P3
- **Constat** : (a) création candidats + convention + inscriptions **non atomique** (`convention-actions.ts:71-133`) → en cas d'échec partiel, convention/candidats orphelins ; (b) un « nouveau salarié » homonyme d'un candidat déjà en base crée un **doublon candidat** (aucun rapprochement sur nom/email).
- **Repro** : ajouter en « nouveau salarié » une personne déjà rattachée à l'entreprise → deux fiches candidat.
- **Correctif proposé** : `db.$transaction([...])` ; rapprochement candidat par email/nom avant création.
- **Statut** : Ouvert

## BUG-OFM-008 — Calcul jours ouvrés faux pour sessions non-contiguës (fallback contrat formateur)
- **Module / Fonction** : Documents / `businessDaysBetween` (contrat formateur)
- **Sévérité** : Mineur · **Priorité** : P3 (fallback : utilisé seulement si `formation.dureeJours` absent)
- **Repro** : session « 1 jour/semaine sur 5 semaines », `dureeJours` non renseigné → `businessDaysBetween(1er, dernier)` compte **25 jours** au lieu de 5 → total contrat = tarif × 25.
- **Preuve / cause** : `src/lib/documents/build-pdf.ts:67-79` compte tous les jours ouvrés de l'intervalle (et ignore les **jours fériés**).
- **Correctif proposé** : privilégier le nombre réel de séances (`session.seances`) ; à défaut, garder le fallback mais le signaler.
- **Statut** : Ouvert

## BUG-OFM-009 — Liens tokenisés sans expiration
- **Module / Fonction** : Parcours / tokens publics (`accessToken`, positionnement, français, satisfaction, suivi)
- **Sévérité** : Mineur · **Priorité** : P3
- **Constat** : les tokens n'ont **pas de date d'expiration** ; le message « Lien invalide ou expiré » est trompeur (aucune expiration réelle). Un lien fuité reste valable indéfiniment, y compris l'accès aux documents (`/parcours/[token]/documents`).
- **Preuve** : `src/lib/token.ts` (pas de TTL) ; `parcours-actions.ts` / `dossier-actions.ts` cherchent par token sans vérifier d'échéance.
- **Correctif proposé** : ajouter un `tokenExpiresAt` (ex. 90 j) et le vérifier ; renouvellement à la relance.
- **Statut** : Ouvert

---

## Observation (hors fiche) — Couverture de test
- **OBS-1** : le garde-fou `prisma-direct-guard.test.ts` ne couvre que les **pages `(app)`**, pas les **server actions** (28 fichiers importent le client brut) ni les `route.ts`. La discipline actuelle est correcte, mais **une future action pourrait introduire une fuite d'isolation sans être détectée**. Recommandation : étendre le garde-fou aux actions, ou ajouter des tests d'intégration d'isolation par action sensible.

## Priorisation des correctifs (recommandation)
1. **P1 — BUG-001** (logo CAP) : correctif trivial, aligné sur le fix cachet, sensible (marque blanche).
2. **P2 — BUG-002** (e-mail échoué marqué envoyé) : impact conformité (convocations/attestations non reçues).
3. **P2 — BUG-004** (IDOR relance) puis **BUG-003** (surbooking).
4. **P3 / décisions métier** — BUG-006 (financement→docs), 005, 007, 008, 009.
