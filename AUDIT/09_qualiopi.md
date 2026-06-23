# 09 — Expert / auditeur QUALIOPI (section centrale)

> Fiche d'audit (Livrable 2). Constats sourcés. **Aucune correction appliquée.**
> Analyse à l'aune du Référentiel National Qualité (RNQ). La **numérotation exacte
> des indicateurs** doit être recoupée avec la version du RNQ en vigueur (voir QLP-02).

## Expert / auditeur QUALIOPI

### 1. Périmètre analysé
- Référentiel embarqué : [src/lib/qualiopi-indicateurs.ts](../src/lib/qualiopi-indicateurs.ts) (7 critères, 32 indicateurs).
- Modèles : `QualiopiIndicateur`, `QualiopiPreuve`, `Audit`, `Reclamation`, `VeilleEntree`, `Partenaire` ([schema.prisma:1038-1645](../prisma/schema.prisma)).
- Pages : `(app)/qualiopi/`, `qualiopi/reclamations`, `qualiopi/veille`, `qualiopi/partenaires`.
- Preuves transverses : émargement signé, évaluations (positionnement/satisfaction/suivi 6 mois), positionnement, accessibilité (`referentHandicap*`, `situationHandicap`).

### 2. Constats — traçabilité des preuves vs angles morts

| ID | Description | Fichier:ligne | Sévérité | Impact |
|----|-------------|---------------|----------|--------|
| QLP-01 | **Indicateurs Qualiopi non multi-tenant** : `@@unique([numero])` global ⇒ un seul jeu d'indicateurs pour toute la base, le 2ᵉ OF ne peut pas suivre les siens. | [schema.prisma:1052](../prisma/schema.prisma) | **Critique** | Module Qualiopi inexploitable au-delà du 1ᵉʳ organisme (renvoi DB-02). |
| QLP-02 | **Numérotation des indicateurs à recouper avec le RNQ en vigueur.** Les libellés de `qualiopi-indicateurs.ts` et les commentaires du schéma (`VeilleType`) présentent un **décalage** (ex. veille légale/métiers/pédago : indicateurs 23/24/25 dans le schéma vs 24/25/26 dans les libellés). | [qualiopi-indicateurs.ts:39-44](../src/lib/qualiopi-indicateurs.ts) vs [schema.prisma:1610-1614](../prisma/schema.prisma) | Majeure | Confusion de mappage preuve↔indicateur lors de l'audit de certification. |
| QLP-03 | **Indicateurs de résultats (ind. 2-3) : production/diffusion à confirmer.** Les données existent (résultats de certification, suivi 6 mois) mais leur **calcul agrégé et leur diffusion publique** ne sont pas attestés côté plateforme. | `lib/suivi6mois.ts`, `(app)/bpf/` *(à confirmer)* | Majeure | Angle mort sur un point clé du critère 1 (renvoi MOA-05). |
| QLP-04 | **Diffusion publique de l'information (ind. 1)** : tarifs, délais d'accès, accessibilité, prérequis — modélisés (`Formation.delaiAcces`, `conditionsAcces`, `prerequis`) mais leur **publication** dépend de la vitrine (hors dépôt). À tracer comme dépendance. | [schema.prisma:558-573](../prisma/schema.prisma) | Mineure | Preuve d'information publique non auto-portée par l'outil. |

### 3. Points forts Qualiopi constatés (traçabilité réelle)
- **Critère 3 (accueil/suivi/évaluation)** : positionnement, convocation, émargement **électronique horodaté & signé**, évaluations à chaud/froid, **suivi à 6 mois** → preuves générées et datées. Très bon.
- **Critère 7 (réclamations)** : `Reclamation` avec **AR (objectif 5 j) et réponse (objectif 15 j)**, analyse/actions correctives → conforme à l'esprit ind. 31-32.
- **Critère 6 (environnement pro)** : registres **veille** (légale/métiers/pédago), **partenaires** (handicap/réseau) → ind. 24-27.
- **Accessibilité (ind. 29)** : `referentHandicapNom/Contact`, `situationHandicap`, `besoinsAdaptation` → prise en compte PSH outillée.
- **Preuves** : `QualiopiPreuve` (fichiers) + `Audit` (interne/externe/surveillance) → dossier de preuve centralisé.

### 4. AVIS DU SPÉCIALISTE (avis Qualiopi)
**La plateforme FACILITE clairement l'audit de certification — c'est un de ses points forts — à condition de corriger QLP-01 et de fiabiliser le mappage des indicateurs.** L'outil ne se contente pas d'un suivi déclaratif : il **produit et date les preuves** (émargements signés, évaluations, suivi 6 mois, registres réclamations/veille/partenaires, preuves jointes), ce qui répond à l'exigence centrale du RNQ (« être en mesure de produire la preuve »). C'est au-dessus de ce qu'on voit habituellement.

Deux angles morts à lever : **(1)** le bug multi-tenant des indicateurs (QLP-01) rend le module inutilisable pour un 2ᵉ OF — bloquant pour un SaaS ; **(2)** le **décalage de numérotation** (QLP-02) et la **diffusion des indicateurs de résultats** (QLP-03) doivent être fiabilisés, car un auditeur vérifie précisément le lien preuve↔indicateur et les taux publiés. Une fois ces points traités, la plateforme constitue un **vrai atout en audit Qualiopi** plutôt qu'une source d'angles morts documentaires.

### 5. AMÉLIORATIONS À AJOUTER
1. **Tableau de bord Qualiopi par indicateur** : statut + preuves rattachées + alertes d'échéance (AR/réponse réclamations, dates de veille).
2. **Export du dossier d'audit** (zip PDF par critère/indicateur) prêt à présenter à l'auditeur.
3. **Calcul automatique des indicateurs de résultats** (réussite, satisfaction, insertion à 6 mois) + page publique de diffusion.
4. **Modèle de RNQ versionné** (référentiel à jour, mappage indicateur↔preuves paramétrable).
5. **Rappels d'amélioration continue** (ind. 32) : plan d'actions issu des réclamations/audits, avec suivi.
