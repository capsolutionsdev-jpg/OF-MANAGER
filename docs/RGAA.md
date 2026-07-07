# Accessibilité RGAA / WCAG (UX-1 / QUA-2)

## Fait (première passe, dans le code)

- **Focus clavier visible** : contour net sur liens/boutons/éléments interactifs au `:focus-visible` (globals.css). Critère RGAA 10.7.
- **Mouvement réduit** : toutes les animations récentes respectent `prefers-reduced-motion` (globals.css). Critère RGAA 13.
- **Boutons-icônes** : les boutons sans texte des composants partagés portent un `aria-label`/`sr-only` (menu, thème, fermeture, actions). À compléter au fil des composants.
- **Langue** : `<html lang="fr">` (RGAA 8.3).
- **Contrastes** : thème clair conforme ; **mode sombre récent à revérifier** (cf. ci-dessous).

## À faire — passe outillée (nécessite un env authentifié : staging)

L'infra est présente (`@axe-core/playwright`). Exécuter axe sur les pages clés et corriger les violations :

```
npx playwright test        # écrire des specs axe par page clé
```

Pages prioritaires : login, dashboard, candidats, sessions, session (détail + validation), factures/devis, BPF, parcours candidat public (`/parcours/[token]`).

Points de vigilance connus :
- **Contraste du mode sombre** sur les pages à couleurs fixes (badges, graphiques SVG à couleurs codées en dur `#10b981`/`#f43f5e`).
- **Formulaires** : association `label`↔`input`, messages d'erreur reliés (`aria-describedby`).
- **Tableaux de données** : en-têtes `scope`.
- **Ordre des titres** (`h1→h2→h3`) par page.

## À faire — audit externe

Un **audit RGAA complet** (grille officielle, déclaration d'accessibilité, taux de conformité) par un prestataire spécialisé est requis pour la conformité formelle (vente à des acteurs recevant des financements publics). Le présent document couvre les correctifs techniques de premier niveau, pas la certification.
