# 03 — Développeur frontend / UX

> Fiche d'audit (Livrable 2). Constats sourcés. **Aucune correction appliquée.**
> Certains points UX nécessitent une vérification visuelle (signalée « à confirmer »)
> plutôt que d'être affirmés depuis le code seul.

## Développeur frontend / UX

### 1. Périmètre analysé
- Coquille applicative : `src/app/(app)/layout.tsx`, `loading.tsx`, `error.tsx`, navigation [src/lib/navigation.ts](../src/lib/navigation.ts).
- Workflows clés : CRM (`(app)/crm`, `crm/pipeline`, `kanban`), candidats, sessions/émargement (`sessions/[id]/emargement`), formulaires publics tokenisés (`prospect`, `signer`, `emarger`, `satisfaction`…).
- Stack UI : React 19 + Tailwind 4 + shadcn/base-ui + react-hook-form + Zod + sonner (toasts) ; thème par tenant (`lib/themes.ts`, `data-design`).
- Accessibilité : test e2e [e2e/a11y.spec.ts](../e2e/a11y.spec.ts) (axe-core).

### 2. Constats — ergonomie, accessibilité, cohérence

| ID | Description | Fichier:ligne | Sévérité | Impact |
|----|-------------|---------------|----------|--------|
| FRT-01 | **Feedback d'erreur incomplet sur les `formData`-actions** : plusieurs actions retournent `void` et ne remontent rien en cas d'échec (cf. BCK-03) → l'utilisateur ne voit ni succès ni erreur explicite. | [devis-actions.ts:59-72](../src/lib/actions/devis-actions.ts) | Majeure | Friction : action sans confirmation, perte de confiance. |
| FRT-02 | **Rafraîchissement par `revalidatePath` global** plutôt qu'optimiste : chaque mutation recharge la page/section, pas de mise à jour locale instantanée. | `src/lib/actions/*` (usage `revalidatePath`) | Mineure | Sensation de lenteur sur les listes denses (CRM, sessions). |
| FRT-03 | **Cohérence de marque à vérifier** : le produit est rebrandé « OFManager » mais des libellés/titres « CAP Compétence Manager » peuvent subsister (métadonnées, onglets). | `src/app/login/*`, `layout.tsx` *(à confirmer)* | Mineure | Incohérence de marque perçue. |
| FRT-04 | **Couverture a11y partielle** : un seul parcours testé par axe (login `@compat`). Les écrans denses (pipeline Kanban, tableaux, émargement, formulaires longs) ne sont pas couverts — contraste, focus, labels, navigation clavier à valider. | [e2e/a11y.spec.ts](../e2e/a11y.spec.ts) | Majeure | Risque d'inaccessibilité (or l'accessibilité est aussi un enjeu Qualiopi ind. 9/29 côté bénéficiaires). |
| FRT-05 | **Formulaires publics tokenisés (signature manuscrite)** : ergonomie mobile et gestion d'erreurs (lien expiré, double soumission) à vérifier — `acceptDevis` gère le « déjà accepté », mais le pattern n'est pas garanti partout. | `src/app/(signer|emarger|satisfaction|prospect)/[token]/` | Mineure | Abandons sur mobile, double-signature. |

### 3. Corrections proposées
- **FRT-01** : convertir les `formData`-actions en retours typés + afficher un toast (`sonner`) succès/erreur systématique (`useActionState`).
- **FRT-04** : étendre les tests axe aux écrans critiques (CRM pipeline, tableau candidats, émargement, formulaires de parcours) ; corriger contrastes/labels relevés.
- **FRT-03** : audit de marque (rechercher les libellés legacy) et harmonisation des `metadata.title`.
- **FRT-02** : passer les listes très sollicitées en mises à jour optimistes (`useOptimistic`).

### 4. AVIS DU SPÉCIALISTE
**Base UI moderne et homogène, dette UX concentrée sur le feedback et l'accessibilité.** La stack est saine (design tokens par tenant, composants shadcn, RHF+Zod, toasts), et un travail responsive/a11y a été amorcé. Les points à traiter sont **le retour utilisateur des actions** (FRT-01, lié au backend) et **la couverture accessibilité** (FRT-04), d'autant plus sensible que l'accessibilité touche aussi la conformité Qualiopi côté bénéficiaires. Rien de bloquant structurellement ; ce sont des finitions de qualité produit. **Une revue visuelle écran par écran est recommandée** pour confirmer ces points (le code seul ne suffit pas à juger l'ergonomie réelle).

### 5. AMÉLIORATIONS À AJOUTER
1. **Bibliothèque de patterns** (états vides, chargement squelette, erreurs, confirmations destructives) homogène.
2. **Mode mobile** soigné pour les formulaires de signature/émargement (usage terrain réel).
3. **Raccourcis/▸ recherche globale** (palette de commandes) pour les power-users gestionnaires.
4. **Tableaux** : tri/filtre/colonnes persistants, pagination serveur pour les gros volumes.
