# Mise en service d'un nouvel organisme (onboarding)

Procédure pour livrer un **produit fini** à un nouveau client OF depuis la console éditeur (compte `SUPERADMIN`). Durée type : 15–30 min une fois les informations collectées.

## 0. Collecter les informations (avant)

Envoyer au client la fiche d'intégration : [`Fiche-integration-organisme.docx`](Fiche-integration-organisme.docx). À récupérer :

- **Identité** : raison sociale, SIRET, NDA (n° de déclaration d'activité), adresse, e-mail, téléphone.
- **Représentant légal** : nom + qualité (gérant, directeur…).
- **Qualiopi** : n° de certificat, certificateur.
- **Marque** : logo (PNG fond transparent), couleur principale, cachet + signature scannés.
- **Documents** : pour le règlement intérieur et les CGV — utiliser **notre modèle** ou **le document du client** (fourni).
- **Expéditeur e-mail** : nom + adresse d'envoi (+ clé Brevo si envoi réel souhaité).
- **Formule choisie** + modules avancés éventuels (cf. `TARIFS-et-offres.md`).

## 1. Créer l'organisme + le compte gérant

Console → `/console` → **Nouvel organisme**.

- Renseigne nom + crée le compte **gérant** (ADMIN) : e-mail + mot de passe provisoire.
- À la création, les **fonctionnalités « Cœur »** sont activées par défaut ; les modules avancés sont OFF.

## 2. Configurer l'organisme

Console → ouvrir l'organisme (`/console/[id]`).

1. **Identité** : SIRET, NDA, adresse, e-mail, téléphone, représentant + qualité, Qualiopi.
2. **Design** : choisir un des **10 thèmes** (ou couleur personnalisée). Aperçu sur `/console/designs`.
3. **Branding** : charger le **logo**, le **cachet**, la **signature** (PNG ; redimensionnés automatiquement).
4. **Documents personnalisés** : pour chaque document surchargeable (règlement intérieur, CGV), choisir *notre modèle* ou *charger le document du client*.
5. **Fonctionnalités** : cocher selon la **formule** (Essentiel / Pro / Premium) et les **options** vendues. Le menu et les accès s'ajustent automatiquement (et le blocage par URL se met à jour à la prochaine connexion du client).
6. **Statut** : Actif.

## 3. Sous-domaine (marque sur la page de connexion)

- Renseigner le **sous-domaine** de l'OF (ex. `monof`). La page `/login` affiche alors son nom, son logo et ses couleurs.
- Faire pointer `monof.<domaine>` vers l'application (DNS / Vercel).
- Test local : `monof.localhost:3100/login`.

## 4. Modules avancés nécessitant une configuration

| Module | À configurer |
|---|---|
| **Assistant IA** | Variable d'environnement `ANTHROPIC_API_KEY` (globale aujourd'hui ; per-OF possible — cf. évolutions). Sans clé : mode démo. |
| **SMS & séquences** | Clé Brevo (`Organisme.brevoApiKey` ou `BREVO_API_KEY`). Sans clé : SMS journalisés en mode démo. |
| **Automatisations / e-mails** | `Organisme.brevoApiKey` + expéditeur, sinon repli sur la config globale. |
| **Espace client entreprise** | Rien à configurer : le lien tokenisé se génère depuis `/portail-client`. |

## 5. Comptes collaborateurs (côté client)

Le **gérant** crée ses collaborateurs depuis `/administration` :

- Rôles : Responsable formation, Assistant administratif, Formateur, Apprenant.
- Pour les rôles « staff », cocher les **sections autorisées** (CRM, candidats, compta, Qualiopi…). Chacun ne voit que son périmètre.

## 6. Remise & démarrage

- Transmettre l'URL (sous-domaine), l'identifiant gérant et le mot de passe provisoire (à changer à la 1re connexion via `/mon-compte`).
- Proposer une **démo sur ses données** + une session de **formation** de l'équipe.
- Vérifier un parcours complet : créer une formation → une session → un candidat → générer un document → envoyer une convocation.

## Rappels techniques (éditeur)

- Données **cloisonnées par `organismeId`** (multi-tenant). La console (`SUPERADMIN`) est le seul espace transverse.
- Schéma : `prisma db push` (jamais `migrate dev` — risque de reset Neon).
- Sécurité multi-tenant : voir `SECURITE-multi-tenant.md`.
