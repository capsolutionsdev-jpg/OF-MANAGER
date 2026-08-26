> ⚠️ **BROUILLON — à compléter et valider (DPO/juriste).** Registre de l'**Éditeur** (CAP SOLUTIONS) au titre de son activité de **sous-traitant** (art. 30.2 RGPD), pour le service OFManager. Le Client tient son propre registre en tant que responsable de traitement.

# Registre des activités de traitement — CAP SOLUTIONS (sous-traitant, OFManager)

**Responsable du registre :** [nom / DPO éventuel] — [contact].
**Dernière mise à jour :** [date].

## 1. Coordonnées

- **Sous-traitant** : CAP SOLUTIONS, SIREN [n°], [adresse], [contact DPO/référent RGPD].
- **Responsables de traitement (clients)** : organismes de formation abonnés (liste tenue à jour côté commercial/facturation).

## 2. Catégories de traitements réalisés pour le compte des clients

| # | Traitement | Finalité | Catégories de personnes | Catégories de données |
|---|---|---|---|---|
| T1 | CRM / prospects-candidats | Gestion commerciale et inscriptions | Prospects, candidats | Identité, coordonnées, situation pro, financement |
| T2 | Suivi pédagogique | Réalisation et preuve des formations | Apprenants, formateurs | Positionnement, émargements, évaluations, satisfaction, signatures |
| T3 | Facturation | Devis, factures, paiements, BPF | Clients, entreprises, financeurs | Données de facturation, montants, modes de paiement |
| T4 | E-learning | Accès aux cours en ligne | Apprenants | Compte, progression, résultats |
| T5 | Comptes utilisateurs | Authentification, droits | Collaborateurs de l'OF | Identifiants, rôle, journaux, IP |
| T6 | Support & hébergement | Exploitation du service | Toutes | Données techniques, logs |

## 3. Destinataires / sous-traitants ultérieurs

Vercel (hébergement), Neon (base de données), Upstash (cache/rate-limit), [fournisseur e-mail], Stripe (paiement abonnement). Détail et localisation : `DPA-sous-traitance.md`, § 6.

## 4. Transferts hors UE

`[Aucun / le cas échéant : préciser garanties — clauses contractuelles types.]` Objectif : hébergement **UE** verrouillé.

## 5. Durées de conservation

Cf. `clause-reversibilite.md`, § 4 (factures 10 ans ; preuves Qualiopi ; suppression/anonymisation des autres données à l'issue de la réversibilité).

## 6. Mesures de sécurité

Cf. `DPA-sous-traitance.md`, § 7 (cloisonnement multi-tenant, chiffrement, bcrypt, 2FA, contrôle d'accès, journalisation, sauvegardes).

## 7. Violations de données

Registre interne des violations tenu par l'Éditeur ; notification au(x) client(s) sous 48 h (cf. DPA § 8).

---

**Modèle indicatif — à adapter à la structure et à faire relire par un DPO/juriste.**
