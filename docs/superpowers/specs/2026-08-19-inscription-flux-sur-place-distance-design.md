# Refonte du flux d'inscription — « Commencer une inscription » (sur place / à distance)

> Spec courte. Fonctionnalité **tenant-agnostique** : s'applique à TOUS les organismes de
> la plateforme (pas de code spécifique à un tenant, pas de feature-flag). Livraison par lots.
> Date : 2026-08-19.

## 1. Contexte & objectif

Aujourd'hui, « Nouveau candidat » ouvre un formulaire unique qui crée un `Candidat`
(et, si une session est choisie, une `Inscription` en `EN_ATTENTE`). On veut transformer
ce point d'entrée en **démarrage d'inscription** avec deux parcours distincts :

- **Sur place** : le staff saisit le dossier avec le candidat présent, puis peut
  **confirmer l'inscription à une session** avec **consultation des documents contractuels
  puis signature** (souris / doigt / tablette). Sinon → inscription **en attente**.
- **À distance** : le staff saisit juste **nom + prénom + e-mail** et envoie une invitation ;
  le candidat **complète son dossier + signe** en ligne et arrive comme **nouveau prospect**
  (procédure habituelle).

## 2. Décisions verrouillées

| Sujet | Décision |
|---|---|
| À distance — périmètre | Le candidat remplit **le dossier complet** en autonomie + signe. |
| Sur place — preuve de signature | Génération d'un **bulletin d'inscription signé (PDF horodaté)** archivé sur la fiche. |
| Sur place — condition de confirmation | **Session requise** + **alerte non bloquante** si pièces/prérequis manquants. |
| À distance — modèle | **Prospect d'abord** : token + signature sur `Candidat`, page publique `/pre-inscription/[token]`, résultat = **nouveau prospect** ; session/contrat définitif ensuite via le parcours normal. |
| Aspect juridique (sur place) | **Consultation obligatoire** du contrat/convention + règlement intérieur + CGV, case « J'ai lu et j'accepte » **horodatée**, AVANT d'activer la signature. |
| Procédé | Spec courte → lots (1 branche + 1 lien de merge par lot). |

## 3. Point d'entrée & sélecteur de mode

- Renommer **« Nouveau candidat » → « Commencer une inscription »** partout où le bouton
  apparaît (tableau de bord, liste `/candidats`, CRM, fiche client pro).
- La page `/candidats/nouveau` ouvre d'abord un **sélecteur de mode** (2 cartes :
  *Sur place* / *À distance*), au lieu d'un formulaire géant à conditions.
  Isolation : un composant par mode, plus clair et plus maintenable.

## 4. Flux A — Sur place

1. **Formulaire complet** (inchangé) : identité, pro, financement, **formation + session**,
   prérequis conditionnels CNAPS/SSIAP (déjà en place), handicap.
2. **Bloc de confirmation** en fin de formulaire :
   - **Non confirmé** → `createCandidat` (+ `Inscription` `EN_ATTENTE` si session choisie —
     *comportement actuel*). Le dossier atterrit dans **« À traiter / En attente »** du
     tableau de bord, avec une action **« Confirmer & signer »** disponible plus tard.
   - **Confirmer l'inscription à la session {X}** (exige une session) :
     a. **Consultation des documents** : contrat **ou** convention (selon profil B2C/B2B,
        règle `families.ts`) + **règlement intérieur** + **CGV**, rendus en PDF via
        `buildSingleDocPdf`. Case **« J'ai lu et j'accepte »** → horodatage.
     b. **Signature** : composant `<SignaturePad>` (extrait de `ContratSignPad`,
        pointer events, `touch-none`, mode tablette/kiosque possible).
     c. À la validation : `Inscription` = **VALIDEE** ; `signatureDataUrl`, `signatureIp`,
        `signedAt`, **`signedParNom`** (collaborateur témoin) ; **bulletin d'inscription
        signé (PDF)** + **certificat de signature** archivés (`buildInscriptionPdf`,
        `signedOnly`) ; effets post-signature partagés (copie signée + convocation,
        provisioning e-learning, notif staff) ; **alerte non bloquante** si pièces
        réglementaires manquantes (CNAPS, médical…).
3. **Refactor** : extraire de `signDocuments` un helper commun
   `finalizeSignedInscription(inscriptionId, { signatureDataUrl, ip, signedParNom? })`
   partagé entre la signature à distance (existant) et la signature sur place (nouveau).

## 5. Flux B — À distance (prospect d'abord)

1. **Mini-formulaire** : nom, prénom, e-mail (+ **formation d'intérêt facultative**).
   Bouton **« Envoyer l'e-mail d'inscription »**.
2. Action `envoyerInvitationPreInscription` : crée `Candidat` (`NOUVEAU`) + un
   **token de pré-inscription** (durée de vie limitée) + envoie l'e-mail d'invitation
   (gabarit `email-templates`).
3. Page publique **`/pre-inscription/[token]`** (réutilise le formulaire du parcours
   candidat + `docs-lire` minimal + `<SignaturePad>`) :
   - le candidat **complète le dossier complet** (mêmes champs que `submitParcoursForm`) ;
   - **consentement RGPD** + **signature d'une pré-inscription / expression de besoin**
     (pas de contrat de formation à ce stade : ni session ni prix définis — c'est
     juridiquement correct, le contrat/CGV se signent plus tard une fois qualifié) ;
   - génère l'**expression de besoin signée (PDF)** archivée sur la fiche
     (patron `generateFicheExpressionBesoinPdf` déjà existant).
4. **Notification staff « nouveau prospect »** (procédure habituelle, `sendPushToOrgStaff`
   + interaction visible sur la fiche). **Suivi de statut** sur la fiche candidat
   (*invitation envoyée → complété → signé*) + **relance** possible.
5. Ensuite (hors nouveauté, déjà construit) : le staff qualifie le prospect, choisit une
   session → le **parcours normal** (`startParcours` → contrat signé) prend le relais.

## 6. Inventaire du réutilisable (ne pas reconstruire)

| Besoin | Existant réutilisé |
|---|---|
| Signature souris/doigt/tablette | `components/contrat/contrat-sign-pad.tsx` → extraire `<SignaturePad>` |
| Consultation docs avant signature | `markDocsLus`, `components/parcours/docs-lire.tsx`, `buildSingleDocPdf` |
| Docs contractuels (contrat/convention/règlement/CGV) | `lib/documents/templates.ts` + `families.ts` (règle B2C/B2B) |
| PDF dossier signé + certificat | `buildInscriptionPdf({ signedOnly })`, `certificat-signature.ts` |
| Complétion dossier à distance | `submitParcoursForm`, `components/parcours/parcours-form.tsx` |
| Signature à distance + effets | `signDocuments` (à factoriser) |
| Notif staff | `lib/push.sendPushToOrgStaff`, pipeline prospect |
| Rattachement session `EN_ATTENTE` | `createCandidat` + `createInscription` (déjà là) |
| Expression de besoin PDF | `generateFicheExpressionBesoin` |

## 7. Changements de modèle de données

Uniquement pour le **Lot 2** (à distance / prospect d'abord). Ajouts sur `Candidat` :

```prisma
preInscriptionToken            String?   @unique  // lien public /pre-inscription/[token]
preInscriptionSentAt           DateTime?
preInscriptionExpiresAt        DateTime?          // durée de vie limitée
preInscriptionFormCompletedAt  DateTime?
preInscriptionSignedAt         DateTime?
preInscriptionSignatureIp      String?
preInscriptionSignatureDataUrl String?   @db.Text // PNG de la signature manuscrite
```

Lots 0 et 1 : **aucune migration** (réutilisent les champs `Inscription` existants :
`statut`, `signatureDataUrl`, `signatureIp`, `signedAt`, `signedParNom`, `docsSignes`).
Déploiement de la migration Lot 2 : `prisma db push` (jamais `migrate dev`).

## 8. Multi-tenant & sécurité

- Toutes les actions passent par `getTenantDb()` / gardes staff même-organisme
  (cf. `assertStaffOwnsInscription`) → cloisonnement tenant, pas d'IDOR.
- La page publique `/pre-inscription/[token]` résout le candidat **par token** (comme
  `/parcours/[token]`), avec durée de vie limitée ; aucune énumération.
- Aucune donnée sensible en query string ; signatures horodatées + IP pour la preuve.

## 9. Découpage en lots (1 branche + 1 lien de merge chacun)

- **Lot 0 — Socle** *(cette branche, sans migration)* : renommage
  « Commencer une inscription » partout + **sélecteur de mode** (Sur place / À distance)
  au-dessus du formulaire ; « à distance » affiche pour l'instant le mini-form non branché
  (placeholder désactivé) ou est masqué jusqu'au Lot 2 — à trancher au Lot 0.
- **Lot 1 — Sur place** *(sans migration)* : bloc de confirmation + consultation
  contrat/règlement/CGV + `<SignaturePad>` + action `confirmerInscriptionSurPlace`
  (Inscription VALIDEE + signature + bulletin PDF + effets partagés + alerte pièces) +
  bouton « Confirmer & signer » depuis « À traiter ».
- **Lot 2 — À distance** *(migration requise)* : champs `Candidat`, mini-form + action
  d'invitation, page publique `/pre-inscription/[token]`, signature + expression de besoin
  PDF, notif « nouveau prospect », suivi de statut + relance.

## 10. Hors périmètre / différé

- Signature électronique qualifiée externe (YouSign) : reste en signature interne
  (cf. `YOUSIGN_IMPLEMENTED=false`).
- Paiement en ligne à l'inscription.
- Le contrat définitif à distance reste le **parcours normal** post-qualification (déjà construit).
