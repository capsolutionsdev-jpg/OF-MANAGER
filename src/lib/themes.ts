// Système d'habillage des espaces clients (multi-tenant).
//
// Deux dimensions, combinables :
//   1) DESIGN (peau)    : mode clair/sombre, surfaces (verre, relief, filets…),
//      police et arrondi. Stocké dans Organisme.design.
//   2) PALETTE (couleur): couleur d'accent principale. Stockée dans
//      Organisme.couleurPrimaire (hex).
//
// Tout est appliqué via des variables CSS injectées dans le layout (toutes les
// fonctionnalités restent identiques — seul l'habillage change) + un attribut
// `data-design` qui déclenche les effets de surface (cf. globals.css).
//
// Rétro-compat : si `design` est vide, on retombe sur l'ancien `themeVars`
// (palette de couleur seule, look historique).

export type Palette = {
  key: string;
  name: string;
  primary: string; // hex
  radius: string; // rem (legacy, utilisé par themeVars)
  desc: string;
};

export const DEFAULT_THEME_COLOR = "#2C53C0";

// Palettes de couleur (réutilisables par tous les designs).
export const THEMES: Palette[] = [
  { key: "bleu", name: "Bleu Cobalt", primary: "#2C53C0", radius: "0.8rem", desc: "Royal et rassurant (défaut)" },
  { key: "emeraude", name: "Émeraude", primary: "#059669", radius: "0.7rem", desc: "Frais et dynamique" },
  { key: "violet", name: "Violet Moderne", primary: "#7C3AED", radius: "0.9rem", desc: "Créatif, premium" },
  { key: "indigo", name: "Indigo Nuit", primary: "#4F46E5", radius: "0.5rem", desc: "Tech et sérieux" },
  { key: "turquoise", name: "Turquoise Doux", primary: "#0D9488", radius: "1.1rem", desc: "Doux, très arrondi" },
  { key: "orange", name: "Orange Chaleureux", primary: "#EA580C", radius: "0.7rem", desc: "Énergique, accueillant" },
  { key: "rose", name: "Rose Élégant", primary: "#E11D48", radius: "0.9rem", desc: "Moderne et affirmé" },
  { key: "ardoise", name: "Ardoise Pro", primary: "#475569", radius: "0.35rem", desc: "Sobre, institutionnel" },
  { key: "bordeaux", name: "Bordeaux Chic", primary: "#9F1239", radius: "0.5rem", desc: "Haut de gamme" },
  { key: "minimal", name: "Encre", primary: "#18181B", radius: "0.25rem", desc: "Épuré, contrasté" },
];
export const PALETTES = THEMES;

export const DEFAULT_THEME = "bleu";

// ── Designs (peaux) ─────────────────────────────────────────────────────────
export type Design = {
  key: string;
  name: string;
  desc: string;
  mode: "light" | "dark";
  fontSans: string;
  fontHeading: string;
  defaultColor: string; // palette par défaut conseillée
  // Tokens de surface (hors couleur d'accent, posée par la palette).
  vars: Record<string, string>;
};

// Familles référencées via les variables CSS générées par next/font (cf. layout).
const SANS = {
  sora: "var(--font-sora), system-ui, sans-serif",
  jakarta: "var(--font-plus-jakarta), system-ui, sans-serif",
  inter: "var(--font-inter), system-ui, sans-serif",
  manrope: "var(--font-manrope), system-ui, sans-serif",
  dm: "var(--font-dm-sans), system-ui, sans-serif",
  archivo: "var(--font-archivo), system-ui, sans-serif",
  space: "var(--font-space-grotesk), system-ui, sans-serif",
};
const SERIF = "var(--font-fraunces), Georgia, serif";
const BRICOLAGE = "var(--font-bricolage), system-ui, sans-serif";

export const DESIGNS: Design[] = [
  {
    key: "defaut",
    name: "Défaut — Sable & Cobalt",
    desc: "L'habillage standard : sable chaleureux, cobalt, titres Plus Jakarta.",
    mode: "light",
    fontSans: SANS.inter,
    fontHeading: SANS.jakarta,
    defaultColor: "#2C53C0",
    vars: {}, // utilise les valeurs de :root (globals.css)
  },
  {
    key: "aurora",
    name: "Aurora — Verre",
    desc: "Fond dégradé, panneaux en verre dépoli. Premium et lumineux.",
    mode: "dark",
    fontSans: SANS.sora,
    fontHeading: SANS.sora,
    defaultColor: "#7C3AED",
    vars: {
      "--background": "#070a14",
      "--foreground": "#eaf0ff",
      "--card": "#0f1424",
      "--card-foreground": "#eaf0ff",
      "--popover": "#0f1424",
      "--popover-foreground": "#eaf0ff",
      "--secondary": "#141a2e",
      "--secondary-foreground": "#eaf0ff",
      "--muted": "#141a2e",
      "--muted-foreground": "#9fb0d0",
      "--border": "#27304a",
      "--input": "#1c2436",
      "--radius": "1.2rem",
      "--sidebar": "#0f1424",
      "--sidebar-foreground": "#eaf0ff",
      "--sidebar-border": "#27304a",
    },
  },
  {
    key: "bento",
    name: "Bento",
    desc: "Tuiles modulaires, très arrondies, titres marqués. Ludique.",
    mode: "light",
    fontSans: SANS.jakarta,
    fontHeading: BRICOLAGE,
    defaultColor: "#1A5FD4",
    vars: {
      "--background": "#eceef3",
      "--foreground": "#11131a",
      "--card": "#ffffff",
      "--card-foreground": "#11131a",
      "--popover": "#ffffff",
      "--popover-foreground": "#11131a",
      "--secondary": "#e3e7f0",
      "--secondary-foreground": "#11131a",
      "--muted": "#eef1f6",
      "--muted-foreground": "#5a6480",
      "--border": "#e2e6ef",
      "--input": "#e2e6ef",
      "--radius": "1.4rem",
      "--sidebar": "#ffffff",
      "--sidebar-foreground": "#11131a",
      "--sidebar-border": "#e2e6ef",
    },
  },
  {
    key: "editorial",
    name: "Éditorial",
    desc: "Papier crème, titres serif, filets fins. Sobre et chic.",
    mode: "light",
    fontSans: SANS.inter,
    fontHeading: SERIF,
    defaultColor: "#9F1239",
    vars: {
      "--background": "#f5f2ea",
      "--foreground": "#191712",
      "--card": "#faf8f2",
      "--card-foreground": "#191712",
      "--popover": "#faf8f2",
      "--popover-foreground": "#191712",
      "--secondary": "#ece5d6",
      "--secondary-foreground": "#191712",
      "--muted": "#ece5d6",
      "--muted-foreground": "#7a736a",
      "--border": "#d6cfc1",
      "--input": "#d6cfc1",
      "--radius": "0.25rem",
      "--sidebar": "#faf8f2",
      "--sidebar-foreground": "#191712",
      "--sidebar-border": "#d6cfc1",
    },
  },
  {
    key: "linear",
    name: "Linear — Sombre",
    desc: "Outil productif, dense et compact, fond nuit.",
    mode: "dark",
    fontSans: SANS.inter,
    fontHeading: SANS.inter,
    defaultColor: "#4F46E5",
    vars: {
      "--background": "#0c0d12",
      "--foreground": "#c9ccd6",
      "--card": "#101218",
      "--card-foreground": "#ffffff",
      "--popover": "#101218",
      "--popover-foreground": "#ffffff",
      "--secondary": "#16181f",
      "--secondary-foreground": "#ffffff",
      "--muted": "#15161d",
      "--muted-foreground": "#6e7384",
      "--border": "#1c1e27",
      "--input": "#15161d",
      "--radius": "0.5rem",
      "--sidebar": "#0c0d12",
      "--sidebar-foreground": "#c9ccd6",
      "--sidebar-border": "#1c1e27",
    },
  },
  {
    key: "neumorphisme",
    name: "Néumorphisme",
    desc: "Reliefs extrudés, ombres douces, monochrome tactile.",
    mode: "light",
    fontSans: SANS.manrope,
    fontHeading: SANS.manrope,
    defaultColor: "#5B7CFA",
    vars: {
      "--background": "#e6e9ef",
      "--foreground": "#3b4256",
      "--card": "#e6e9ef", // identique au fond → relief par les ombres (globals.css)
      "--card-foreground": "#2b3146",
      "--popover": "#eef0f5",
      "--popover-foreground": "#2b3146",
      "--secondary": "#e0e3ea",
      "--secondary-foreground": "#2b3146",
      "--muted": "#dfe3ea",
      "--muted-foreground": "#838aa0",
      "--border": "#d3d8e2",
      "--input": "#dfe3ea",
      "--radius": "1.2rem",
      "--sidebar": "#e6e9ef",
      "--sidebar-foreground": "#3b4256",
      "--sidebar-border": "#d3d8e2",
    },
  },
  {
    key: "humaniste",
    name: "Humaniste",
    desc: "Crème chaud, grands titres serif, beaucoup d'air. Accueillant.",
    mode: "light",
    fontSans: SANS.dm,
    fontHeading: SERIF,
    defaultColor: "#EA580C",
    vars: {
      "--background": "#fbf6ee",
      "--foreground": "#3a352d",
      "--card": "#ffffff",
      "--card-foreground": "#2d2820",
      "--popover": "#ffffff",
      "--popover-foreground": "#2d2820",
      "--secondary": "#f3ede2",
      "--secondary-foreground": "#2d2820",
      "--muted": "#f3ede2",
      "--muted-foreground": "#7c7468",
      "--border": "#efe6d8",
      "--input": "#efe6d8",
      "--radius": "1.4rem",
      "--sidebar": "#ffffff",
      "--sidebar-foreground": "#2d2820",
      "--sidebar-border": "#efe6d8",
    },
  },
  {
    key: "enterprise",
    name: "Enterprise",
    desc: "Dense, filets nets, surfaces claires. Pour traiter beaucoup vite.",
    mode: "light",
    fontSans: SANS.inter,
    fontHeading: SANS.inter,
    defaultColor: "#2563EB",
    vars: {
      "--background": "#eef1f5",
      "--foreground": "#1f2733",
      "--card": "#ffffff",
      "--card-foreground": "#1f2733",
      "--popover": "#ffffff",
      "--popover-foreground": "#1f2733",
      "--secondary": "#e7ecf2",
      "--secondary-foreground": "#1f2733",
      "--muted": "#f7f9fc",
      "--muted-foreground": "#7a8597",
      "--border": "#d8dee7",
      "--input": "#d8dee7",
      "--radius": "0.4rem",
      "--sidebar": "#ffffff",
      "--sidebar-foreground": "#1f2733",
      "--sidebar-border": "#d8dee7",
    },
  },
  {
    key: "agenda",
    name: "Agenda",
    desc: "Vue calendrier, rail d'icônes sombre, panneau contextuel. Pour planifier.",
    mode: "light",
    fontSans: SANS.space,
    fontHeading: SANS.space,
    defaultColor: "#0D9488",
    vars: {
      "--background": "#eef1f6",
      "--foreground": "#15202e",
      "--card": "#ffffff",
      "--card-foreground": "#15202e",
      "--popover": "#ffffff",
      "--popover-foreground": "#15202e",
      "--secondary": "#f3f6fa",
      "--secondary-foreground": "#15202e",
      "--muted": "#f3f6fa",
      "--muted-foreground": "#5d6b7e",
      "--border": "#e2e8f1",
      "--input": "#d4dbe6",
      "--radius": "0.85rem",
      "--sidebar": "#0f1b2d",
      "--sidebar-foreground": "#cdd7e6",
      "--sidebar-border": "#1c2c44",
    },
  },
  {
    key: "mobile",
    name: "Mobile-first",
    desc: "Cartes arrondies sur fond dégradé doux, nav sombre. Look application.",
    mode: "light",
    fontSans: SANS.jakarta,
    fontHeading: SANS.jakarta,
    defaultColor: "#4F46E5",
    vars: {
      "--background": "#eef0ff",
      "--foreground": "#1f1b3a",
      "--card": "#ffffff",
      "--card-foreground": "#1f1b3a",
      "--popover": "#ffffff",
      "--popover-foreground": "#1f1b3a",
      "--secondary": "#e8ecff",
      "--secondary-foreground": "#1f1b3a",
      "--muted": "#eef0fb",
      "--muted-foreground": "#7a7f95",
      "--border": "#e3e3f4",
      "--input": "#e3e3f4",
      "--radius": "1.25rem",
      "--sidebar": "#1a1530",
      "--sidebar-foreground": "#cdc9ff",
      "--sidebar-border": "#2a2350",
    },
  },
  {
    key: "kanban",
    name: "Kanban",
    desc: "Pipeline en colonnes, cartes nettes. Pour suivre les flux d'un coup d'œil.",
    mode: "light",
    fontSans: SANS.archivo,
    fontHeading: SANS.archivo,
    defaultColor: "#1E6FE6",
    vars: {
      "--background": "#f4f6f9",
      "--foreground": "#1a2230",
      "--card": "#ffffff",
      "--card-foreground": "#1a2230",
      "--popover": "#ffffff",
      "--popover-foreground": "#1a2230",
      "--secondary": "#eaeef3",
      "--secondary-foreground": "#1a2230",
      "--muted": "#eef1f5",
      "--muted-foreground": "#5b6675",
      "--border": "#e3e8ef",
      "--input": "#dde3ec",
      "--radius": "0.7rem",
      "--sidebar": "#ffffff",
      "--sidebar-foreground": "#1a2230",
      "--sidebar-border": "#e3e8ef",
    },
  },
];

export const DEFAULT_DESIGN = "defaut";

export function getDesign(key?: string | null): Design | null {
  if (!key) return null;
  return DESIGNS.find((d) => d.key === key) ?? null;
}

export function getPalette(key?: string | null): Palette | null {
  if (!key) return null;
  return THEMES.find((t) => t.key === key) ?? null;
}

export function getTheme(key?: string | null): Palette | null {
  return getPalette(key);
}

/**
 * Variables CSS d'un organisme à partir de son DESIGN + sa couleur de palette.
 * Si le design est inconnu/vide → repli legacy `themeVars`.
 */
export function designVars(
  designKey?: string | null,
  couleurPrimaire?: string | null,
): Record<string, string> {
  const d = getDesign(designKey);
  if (!d || d.key === "defaut") {
    // Défaut : palette + arrondi sur les surfaces de :root, police inchangée.
    return themeVars(null, couleurPrimaire);
  }
  const primary = couleurPrimaire?.trim() || d.defaultColor;
  const isDark = d.mode === "dark";
  const accent = isDark
    ? `color-mix(in oklab, ${primary} 28%, ${d.vars["--card"]})`
    : `color-mix(in oklab, ${primary} 14%, white)`;
  const accentFg = isDark ? d.vars["--foreground"] : primary;
  return {
    ...d.vars,
    "--primary": primary,
    "--primary-foreground": "#ffffff",
    "--ring": primary,
    "--chart-1": primary,
    "--sidebar-primary": primary,
    "--sidebar-primary-foreground": "#ffffff",
    "--sidebar-ring": primary,
    "--accent": accent,
    "--accent-foreground": accentFg,
    "--sidebar-accent": accent,
    "--sidebar-accent-foreground": accentFg,
    "--font-sans": d.fontSans,
    "--font-heading": d.fontHeading,
  };
}

/**
 * (Legacy) Variables CSS « palette seule » sur les surfaces de :root.
 * Utilisé quand aucun design n'est choisi (compat des tenants existants).
 */
export function themeVars(
  themeKey?: string | null,
  couleurPrimaire?: string | null,
): Record<string, string> {
  const t = getPalette(themeKey);
  const primary = t ? t.primary : couleurPrimaire?.trim() || DEFAULT_THEME_COLOR;
  const radius = t ? t.radius : "0.8rem";
  return {
    "--primary": primary,
    "--primary-foreground": "#ffffff",
    "--ring": primary,
    "--sidebar-primary": primary,
    "--sidebar-ring": primary,
    "--chart-1": primary,
    "--accent": `color-mix(in oklab, ${primary} 14%, white)`,
    "--accent-foreground": primary,
    "--sidebar-accent": `color-mix(in oklab, ${primary} 14%, white)`,
    "--sidebar-accent-foreground": primary,
    "--radius": radius,
  };
}
