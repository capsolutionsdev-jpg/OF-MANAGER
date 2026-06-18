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
  ]),
  {
    rules: {
      // Règle cosmétique très bruyante : les apostrophes typographiques (d'accès,
      // l'organisme…) s'affichent parfaitement en React. On la désactive pour ne
      // pas polluer le CI avec des « faux » problèmes de contenu rédactionnel.
      "react/no-unescaped-entities": "off",
    },
  },
]);

export default eslintConfig;
