# Dossier de conformité RGPD — OFManager

> Document de synthèse **présentable à vos clients (OF)** et à un auditeur. Montre comment OFManager protège les données des organismes de formation et de leurs stagiaires. **À faire valider par un juriste/DPO avant diffusion.**

## 1. Rôles et responsabilités
- **Vos clients (OF)** = **responsables de traitement** : ils décident des finalités et des données de leurs stagiaires.
- **OFManager (éditeur)** = **sous-traitant** (RGPD art. 28) : traite les données **sur instruction** du client, formalisée par un **contrat de sous-traitance (DPA)**.
- **Sous-traitants ultérieurs** : Neon, Vercel, Upstash, e-mail (Brevo)… → cf. `sous-traitants-ulterieurs.md`.

## 2. Cadre contractuel
- **DPA (art. 28)** signé avec chaque client : `DPA-sous-traitance.md`.
- **Registre des traitements** (sous-traitant, art. 30-2) : `registre-traitements.md`.
- **Réversibilité** (restitution/suppression en fin de contrat) : `clause-reversibilite.md`.
- **CGV/abonnement + SLA** : `CGV-abonnement-SaaS.md`, `SLA.md`.

## 3. Mesures de sécurité (RGPD art. 32) — en place dans OFManager
- **Cloisonnement multi-tenant** : chaque requête est automatiquement filtrée par organisme (`getTenantDb`) ; **RLS PostgreSQL** prête au niveau base comme filet.
- **Contrôle d'accès** : rôles et permissions fins ; **révocation de session immédiate** au changement de droits.
- **Authentification** : mots de passe **bcrypt** (≥ 8 caractères), **double authentification (TOTP)** disponible, **rate-limiting** anti-brute-force.
- **Chiffrement** : HTTPS partout ; **chiffrement des secrets** stockés (clés API tenant) ; signatures électroniques horodatées.
- **Traçabilité** : **journal d'audit** des actions sensibles (qui, quoi, quand).
- **Hébergement UE** : Neon `eu-central-1` (Francfort) ; fournisseurs à confirmer/épingler en UE.
- **Sauvegardes** : PITR (Neon) ; plan de reprise documenté (`../docs/PRA-SAUVEGARDE.md`).

## 4. Droits des personnes — outillés
| Droit | Comment |
|---|---|
| **Accès / portabilité** | Export complet des données de l'organisme (`/administration/export`, JSON ouvert) ; export par candidat |
| **Rectification** | Édition des fiches candidat / entreprise / profil |
| **Effacement / « droit à l'oubli »** | **Anonymisation** candidat (`rgpd-actions`) — efface l'identité, conserve les pièces à valeur probante rendues anonymes |
| **Limitation / opposition** | Gestion des statuts + consentements |
| **Consentement** | Recueil et **preuve** enregistrés (modèle `Consentement`) |

## 5. Conservation des données
Durées différenciées conciliant RGPD, Qualiopi et obligations fiscales → `matrice-conservation.md`. Principe : **anonymiser** les preuves plutôt que supprimer ; durée paramétrable par organisme (`dureeConservationMois`).

## 6. Violations de données
Procédure de notification **sans délai au client**, assistance à la notification CNIL (72 h) et registre des violations → `procedure-violation-donnees.md`.

## 7. Où en est la conformité (transparence)
**En place** ✅ : cloisonnement applicatif, export/portabilité, anonymisation, sécurité (bcrypt/2FA/rate-limit/audit), hébergement UE (base), corpus contractuel rédigé, matrice de conservation.
**À finaliser** ⏳ (avant vente large) :
- [ ] Faire **valider par un juriste** et **signer** le DPA avec chaque client.
- [ ] **Activer la RLS** en production (filet base) — `../docs/RLS-ACTIVATION.md`.
- [ ] Compléter l'**environnement de prod** : `SECRETS_ENCRYPTION_KEY`, etc. — `../docs/PROD-ENV-CHECKLIST.md`.
- [ ] Récupérer/archiver les **DPA des sous-traitants** + confirmer les régions UE.
- [ ] Désigner un **DPO / référent** et créer le **registre des violations**.
- [ ] (Recommandé) **pentest externe**.

## 8. Contact
Référent protection des données (DPO / point de contact RGPD) : **[À COMPLÉTER — nom + e-mail]**.

---
*OFManager est édité par CAP SOLUTIONS. Ce dossier décrit les mesures techniques et organisationnelles ; il ne se substitue pas au DPA contractuel signé avec chaque client.*
