# Parcours T3P — Taxi / VTC (examen CMA)

> Module « Parcours examen Taxi / VTC (T3P) » — feature opt-in `parcours-t3p`
> (console SUPERADMIN → organisme → fonctionnalités). Suivi complet du parcours
> d'accès aux professions du transport public particulier de personnes,
> de la vérification des prérequis jusqu'à la carte professionnelle.

## Références réglementaires

- Art. R.3120-6 à R.3120-9 du code des transports (conditions d'accès, casier).
- Arrêté du 6 avril 2017 (organisation de l'examen T3P, frais réévalués chaque 1er janvier).
- Règlement d'examen CMA France : admissibilité (théorie) puis admission (pratique).

## Les 11 étapes suivies par la console

| # | Étape | Règle clé |
|---|-------|-----------|
| 1 | Prérequis & dossier administratif | Permis B ≥ 3 ans (2 ans conduite accompagnée), casier compatible, avis médical (médecin agréé, cerfa 14880), PSC1 (taxi). Expression du besoin + financement (Qualiopi ind. 4). |
| 2 | Inscription à l'examen (CMA) | En ligne, CMA régionale ; clôture ~3 semaines avant l'épreuve. |
| 3 | Paiement des frais d'examen | 241 € en 2026 (168 € passerelle « mobilité ») ; non remboursables ; ajourné ⇒ nouveaux frais. |
| 4 | Convocation examen théorique | Reçue de la CMA — à archiver dans les pièces du candidat. |
| 5 | Formation théorique | Session OF : émargements, positionnement, évaluations (Qualiopi ind. 9-11). |
| 6 | Résultat théorique (admissibilité) | Admis si ≥ 10/20 sans note éliminatoire. La date de publication démarre les délais réglementaires. |
| 7 | Convocation examen pratique | Candidats admissibles uniquement ; la CMA organise sous 2 mois. |
| 8 | Formation pratique | Mise en situation (conduite, relation client, facturation). |
| 9 | Examen pratique (admission) | 3 présentations maximum. |
| 10 | Résultat pratique | Admis ⇒ parcours « Réussi » + synchro certification de l'inscription (BPF / taux de réussite). |
| 11 | Carte professionnelle | Demande préfecture via Démarches Simplifiées. |

**Délais surveillés automatiquement** (alertes dans la console) :
- ancienneté du permis B insuffisante (date d'éligibilité affichée) ;
- délai d'**1 an** après l'admissibilité pour réussir l'admission (alerte < 90 j, dépassement) ;
- **3 présentations max** à l'épreuve pratique (compteur, blocage de la 4ᵉ).

## Où ça se passe dans la console

- **Fiche candidat → onglet « Parcours T3P »** : chronologie des 11 étapes,
  saisie par étape, épreuves (une ligne par présentation), alertes. L'onglet
  apparaît pour les candidats Taxi/VTC (parcours ouvert, inscription ou
  formation souhaitée T3P).
- **Menu « Parcours T3P »** (groupe Formation) : pilotage global — tous les
  parcours, étape courante, alertes triées par gravité, filtres métier/statut.
- **Ouverture automatique** : inscrire un candidat sur une session dont la
  formation contient « VTC » ou « Taxi » ouvre (ou rattache) son parcours.
  Ouverture manuelle possible depuis l'onglet (dont passerelle « mobilité »).

## Modèle de données

- `ParcoursT3P` (1 par candidat et par métier) : champs d'étapes datés,
  inscription liée (synchro certification), statut EN_COURS / REUSSI / ABANDONNE.
- `T3PEpreuve` (n par parcours) : type THEORIE/PRATIQUE, n° de présentation,
  convocation, date, résultat, note.
- Multi-tenant : `organismeId` injecté par `getTenantDb` ; politiques RLS
  ajoutées dans `docs/rls-setup.sql` (tables `ParcoursT3P`, `T3PEpreuve`).

## Qualiopi — correspondances

- **Ind. 4** (analyse du besoin) : expression du besoin + financement à l'étape 1.
- **Ind. 9-11** (suivi, évaluation) : sessions liées (émargements, positionnement, évaluations).
- **Ind. 2 / BPF** : résultat pratique admis ⇒ `resultatCertification = CERTIFIE` sur l'inscription.
- **Traçabilité** : chaque création/modification est journalisée (`AuditLog`).

## Déploiement

1. `npx prisma db push` (nouvelles tables + enums).
2. Activer la fonctionnalité `parcours-t3p` sur l'organisme (console SUPERADMIN).
3. Si RLS actif : rejouer `docs/rls-setup.sql` (idempotent).
