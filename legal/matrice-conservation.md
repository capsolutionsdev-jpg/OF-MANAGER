# Matrice de conservation des données (RGPD ⇄ Qualiopi ⇄ obligations légales)

> **À faire valider par un juriste.** Concilie la **minimisation RGPD** (art. 5-1-e), les **preuves Qualiopi** (RNQ) et les **obligations légales/fiscales** de conservation. Principe directeur : **anonymiser plutôt que supprimer** les pièces à valeur probante.

Rôles : l'**OF client = responsable de traitement** ; l'**éditeur (OFManager) = sous-traitant** appliquant ces durées pour son compte. La durée de conservation par organisme est paramétrable (`Organisme.dureeConservationMois`).

| Catégorie de données | Base légale | Durée en **base active** | Puis **archivage** | À l'échéance |
|---|---|---|---|---|
| **Prospect / lead** (candidat non inscrit) | Intérêt légitime / consentement | 3 ans après le dernier contact | — | **Suppression** ou anonymisation |
| **Candidat inscrit — état civil, coordonnées** | Exécution du contrat de formation | Durée de la formation + suivi | Jusqu'à prescription | Anonymisation |
| **Dossier de formation** (convention, convocation, émargement, évaluations, attestations) | Obligation légale (Qualiopi/RNQ, financeurs) | Formation + **3 ans** min. (indicateurs, contrôles OPCO/DREETS) | Jusqu'à 6 ans si financement public | **Anonymiser** (valeur probante) — ne pas supprimer |
| **Feuilles d'émargement / présence** | Preuve Qualiopi + financeur | 3 ans (contrôles) | — | Anonymisation |
| **Résultats / certifications / diplômes** | Obligation certificateur | Durée exigée par le certificateur (souvent illimitée pour la traçabilité du titre) | — | Conservation (preuve du titre) |
| **Factures, devis, paiements** | Obligation comptable/fiscale (art. L123-22 C. com. / L102 B LPF) | **10 ans** | — | Suppression après 10 ans |
| **Données de financement** (CPF, OPCO, France Travail) | Obligation légale financeur | Selon le financeur (souvent 3–10 ans) | — | Suppression/anonymisation |
| **Comptes utilisateurs (staff, apprenants)** | Exécution du contrat | Durée de la relation + suppression à la clôture | — | Suppression |
| **Pièces d'identité / justificatifs déposés** | Vérification d'éligibilité | **Le temps strictement nécessaire** puis suppression | — | Suppression |
| **Consentements** | Preuve du consentement | Durée du traitement + 3 ans | — | Suppression |
| **Journaux techniques / audit / logs e-mail** | Sécurité (art. 32) | 6 mois à 1 an | — | Suppression |
| **Enquêtes de satisfaction** | Qualiopi (ind. 30–31) | 3 ans | — | Anonymisation |
| **Suivi à 6 mois** | Qualiopi (ind. 11) | 3 ans | — | Anonymisation |

## Points d'attention (contradiction RGPD ⇄ Qualiopi ⇄ fisc)
- **Ne jamais** supprimer purement une facture avant 10 ans, ni une preuve Qualiopi avant les délais de contrôle → **anonymiser** les données personnelles rattachées tout en gardant la pièce probante.
- Le module RGPD de la plateforme **anonymise** un candidat (remplace les données personnelles, conserve les pièces à valeur probante rendues anonymes) plutôt que de supprimer — conforme à cette matrice.
- La **purge automatique** doit respecter `dureeConservationMois` par organisme et **exclure** les données sous obligation légale non échue.

## Mise en œuvre dans OFManager
- Anonymisation candidat : `lib/actions/rgpd-actions.ts` (`anonymiseCandidat`) — conserve les preuves, efface l'identité.
- Durée paramétrable : `Organisme.dureeConservationMois`.
- Export/portabilité : `/administration/export` (JSON complet).
- Droits des personnes (accès/rectification/effacement/portabilité) : outillés côté fiche candidat + espace candidat.
