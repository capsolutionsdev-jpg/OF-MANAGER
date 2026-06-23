# 08 — Business Analyst / MOA formation

> Fiche d'audit (Livrable 2). Constats sourcés. **Aucune correction appliquée.**

## Business Analyst / MOA formation

### 1. Périmètre analysé
- Cycle commercial → pédagogique → comptable : modèles `Candidat`/`Inscription`/`Session`/`Convention`/`Contrat`/`Devis`/`Facture`/`Paiement` ([prisma/schema.prisma](../prisma/schema.prisma)).
- Facturation/financement : [devis-actions.ts](../src/lib/actions/devis-actions.ts), `Inscription.financementType`, `Organisme.assujettiTva`.
- Émargement & évaluations : `Seance`/`Presence`/`EmargementSignature`, `Evaluation` (positionnement → satisfaction → suivi 6 mois).
- BPF : `src/app/(app)/bpf/`.

### 2. Constats — adéquation aux processus d'un OF

| ID | Description | Fichier:ligne | Sévérité | Impact |
|----|-------------|---------------|----------|--------|
| MOA-01 | **Numérotation de factures non conforme** : génération par `count()` (trous possibles si suppression, remise à zéro annuelle) — l'art. 242 nonies A CGI impose une **séquence chronologique continue sans rupture**. | [devis-actions.ts:34-36](../src/lib/actions/devis-actions.ts) | **Critique** | Risque fiscal ; rejet en contrôle/financeur (renvoi BCK-01). |
| MOA-02 | **TVA non pilotée par l'exonération OF.** Beaucoup d'OF sont exonérés (art. 261-4-4° CGI) ; le champ `assujettiTva` existe mais le calcul applique 20 % par défaut sans mention d'exonération. | [devis-actions.ts:30-31](../src/lib/actions/devis-actions.ts), [schema.prisma:77](../prisma/schema.prisma) | Majeure | Factures fausses (TVA indue) ; non-conformité (renvoi BCK-04). |
| MOA-03 | **Devis « accepté » = statut PAYEE** : confusion entre acceptation commerciale (bon pour accord) et encaissement. | [devis-actions.ts:100](../src/lib/actions/devis-actions.ts) | Majeure | Pilotage financier faussé (CA/encaissé). |
| MOA-04 | **Immuabilité des factures émises à confirmer.** Le cycle `FactureStatut` permet des changements de statut ; rien ne garantit qu'une facture **émise** ne peut plus être modifiée (correction par avoir uniquement). L'avoir existe (`avoirParentId`) — bon point — mais l'immuabilité n'est pas verrouillée. | [schema.prisma:1206-1233](../prisma/schema.prisma) | Majeure | Risque comptable/légal (modification a posteriori). |
| MOA-05 | **Indicateurs de résultats (taux de réussite/insertion)**. Les données existent (`resultatCertification`, `suivi6moisJson`) mais leur **agrégation/diffusion** (BPF + indicateurs Qualiopi 2-3) reste à confirmer dans les pages dédiées. | `(app)/bpf/`, `lib/suivi6mois.ts` | Mineure (à confirmer) | Reporting réglementaire potentiellement incomplet (renvoi `09`). |

### 3. Corrections proposées
- **MOA-01** : séquence de facture atomique, continue, **sans suppression** (annulation = avoir). Verrou applicatif + contrainte base par OF/exercice.
- **MOA-02** : calcul TVA conditionné par `assujettiTva` (0 % + mention « TVA non applicable, art. 261-4-4° du CGI ») ; option taux par ligne.
- **MOA-03** : séparer cycle devis (accepté/refusé) et cycle facture (émise/payée) — cf. BCK-02.
- **MOA-04** : geler les factures `ENVOYEE`/`PAYEE` (interdiction de modification du montant/lignes ; corrections via avoir).
- **MOA-05** : vérifier et compléter les agrégats BPF + indicateurs de résultats diffusables.

### 4. AVIS DU SPÉCIALISTE
**Couverture métier impressionnante et fidèle au quotidien d'un OF — la valeur produit est réelle.** L'outil modélise très correctement la chaîne complète : prospect → positionnement → inscription → convention (B2B) / contrat (B2C) → sessions → émargement signé → évaluations à chaud/froid → suivi à 6 mois → facturation → BPF, avec une distinction convention/contrat juste et un émargement électronique horodaté/signé solide (preuve de réalisation). Les **réserves portent sur la comptabilité réglementaire** : numérotation des factures (MOA-01, critique), TVA/exonération (MOA-02), sémantique devis↔facture (MOA-03) et immuabilité des factures (MOA-04). Ce sont des **non-conformités fiscales** à corriger avant d'émettre de vrais documents, mais elles n'invalident pas la conception d'ensemble. **Le métier est bien compris ; il faut fiabiliser la facturation légale.**

### 5. AMÉLIORATIONS À AJOUTER
1. **Sous-traitance OPCO / subrogation de paiement** outillée de bout en bout (financeur paie directement l'OF).
2. **Génération du BPF** assistée (pré-remplissage Cerfa 10443) à partir des données.
3. **Échéanciers de paiement** (acomptes CPF/OPCO) et relances automatiques.
4. **Catalogue conforme** (fiche programme = mentions obligatoires) exportable, réutilisable sur la vitrine.
