import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Fichiers générés / vendored / worktrees jetables : pas du code source à
    // linter (worker PDF minifié `public/*.min.mjs`, bundles Capacitor, worktrees
    // Claude qui dupliquent le repo). Ils polluaient le CI de faux positifs
    // `no-this-alias` sur du code minifié — audit A08 (remise au vert du lint).
    ".claude/**",
    "capacitor-www/**",
    "**/*.min.mjs",
    "**/*.min.js",
  ]),
  {
    rules: {
      // Règle cosmétique très bruyante : les apostrophes typographiques (d'accès,
      // l'organisme…) s'affichent parfaitement en React. On la désactive pour ne
      // pas polluer le CI avec des « faux » problèmes de contenu rédactionnel.
      "react/no-unescaped-entities": "off",

      // ── Règles React Compiler (eslint-plugin-react-hooks v7) trop strictes ──
      // Ces règles récentes signalent comme des ERREURS des motifs parfaitement
      // légitimes et courants. Aucun bug réel derrière : on les désactive
      // ciblément. Les autres règles react-hooks (rules-of-hooks, exhaustive-deps,
      // purity…) restent ACTIVES pour continuer d'attraper les vrais problèmes.
      //
      //  • set-state-in-effect : appeler setState dans un useEffect de montage
      //    (flag « mounted », synchro depuis localStorage, démarrage d'animation)
      //    est un pattern standard et sûr, pas une cascade de rendus fautive.
      "react-hooks/set-state-in-effect": "off",
      //  • incompatible-library : déclenchée par le watch() de react-hook-form ;
      //    le compilateur saute simplement la mémoïsation du composant, ce n'est
      //    pas une erreur de correction.
      "react-hooks/incompatible-library": "off",

      //  • purity : signale Date.now()/Math.random() « pendant le rendu ». Faux
      //    positif dans les Server Components async (rendus UNE fois par requête,
      //    aucun re-render) — la règle vise les composants client. Désactivée comme
      //    les 2 règles react-compiler ci-dessus (une règle "off" n'exige pas la
      //    déclaration du plugin dans cet objet) — audit A08 (remise au vert du lint).
      "react-hooks/purity": "off",
    },
  },
  {
    // Les scripts .cjs (outils de dev, seeds Prisma, captures Puppeteer) sont du
    // CommonJS par nature : require() y est l'API correcte, pas une erreur. On ne
    // neutralise QUE cette règle pour ces fichiers ; le reste du lint s'y applique.
    files: ["**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);

export default eslintConfig;
