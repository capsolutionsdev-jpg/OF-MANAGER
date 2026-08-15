# Design System "Mouss" — OF Manager Console

**Nom :** Mouss  
**Créé :** 2026-08-15  
**Statut :** Actif (déployé sur feat/dashboard-redesign-etape1)

## Vision

Refonte complète de la console OF Manager combinant une barre latérale **dark navy** (contrôle/stabilité) avec un contenu **clair et aéré** (lisibilité/productivité). Inspiré par les meilleures pratiques de design B2B moderne.

---

## Palette de couleurs

### Marque & Accents
- **Primary (Brand)** : `#1A5FD4` (bleu vif) — CTA, accents, état actif
- **Primary-light** : `#4D9FFF` (bleu clair) — accents secondaires, hover
- **Navy (Dark)** : `#0D1B3E` (navy très foncé) — sidebar, fondus profonds
- **Surface-light** : `#F4F7FC` (bleu très clair) — card bg, sections alternatives

### Texte & Contraste (Sidebar Dark)
- **Text-light** : `#eaf0ff` (bleu très clair) — texte sidebar, labels actifs
- **Text-muted** : `#a8b9d1` (gris-bleu) — texte inactif sidebar
- **Text-subtle** : `#7a8aa3` (gris-bleu sombre) — headers groupe, texte tertiaire

### Bordures & Dividers (Sidebar Dark)
- **Border-dark** : `#1f2d47` (navy moyen) — séparateurs sidebar, borders
- **Hover-bg** : `#1f3a6f` (navy éclairci) — état hover items, state actif

### Intention
- **Success** : `#10B981` (vert) — validations, badges CPF/Qualiopi
- **Warning** : `#EA580C` (orange) — alertes, SSIAP certaines, status urgent
- **Destructive** : `#ef4444` (rouge) — actions dangereuses, erreurs
- **Emerald / Amber / Rose / Violet** : Teintes pour KPI cards (sparklines, icônes colorées)

---

## Architecture Composants

### Sidebar (Left Rail, Desktop ≥ lg)
**Dimensions :** 240px fixed  
**Background :** `#0D1B3E` (navy)  
**Texte :** `#eaf0ff` (bleu clair)  

#### Éléments
1. **SidebarBrand** (h-14)
   - Logo tenant ou nom
   - Badge "Manager" (#1f2d47 bg, #a8b9d1 text)
   - Border-bottom: #1f2d47

2. **SidebarNav** (flex-1 overflow-y-auto)
   - Groupes repliables (localStorage persistant)
   - Items actifs : #1f3a6f bg + #4D9FFF text
   - Items inactifs : #a8b9d1 text → hover #eaf0ff + #1f2d47 hover bg
   - Group headers : #7a8aa3 text → hover #eaf0ff

3. **Help Card** (mt-auto)
   - Bg: #1f2d47
   - HelpCircle icon: #4D9FFF
   - Border-top: #1f2d47
   - Hover: bg-#2a3a52

### Topbar (Horizontal Header)
**Hauteur :** 64px (min-h-16)  
**Background :** `var(--background)` (light, device-aware)  
**Border-bottom :** 1px var(--border)  
**Padding :** 1rem (md: 1.5rem)  

#### Layout
```
[Menu (mobile)] [Recherche Centrée FLEX-1 MAX-W-MD] [Actions Right]
```

#### Éléments
- **Menu button** (mobile < lg, ghost variant)
- **Recherche** (hidden sm:flex, flex-1 max-w-md lg:mx-auto)
  - Bg: var(--muted)
  - Border: 1px var(--border)
  - Focus: ring-2 ring-primary/50
  - Rounded: xl
- **Séparateur** (hidden sm:block, h-5 bg-border)
- **Icônes d'action** (focus mode, theme toggle, notifications)
- **Avatar + Dropdown** (align-end)

### Dashboard Content (Main Grid)
**Padding :** 1.5rem (md: 2rem)  
**Background :** var(--background) (clair)  

#### Row 1 — Header + KPIs
- Header + "À traiter" card (col-span-1fr | sticky top-0)
- KPI cards grid (sm:grid-cols-2 xl:grid-cols-4)
  - **KpiCardV2 Components**
    - Tints: violet, emerald, amber, blue, rose
    - Icône colorée (#bg-tint-100 / dark:bg-tint-500/10)
    - Sparkline déterministe (seed-based, pas d'hydration mismatch)
    - Trend indicator (TrendingUp/Down coloré)

#### Row 2 — Widgets (1 col | 1 col | 1 col)
- Remplissage donut
- Consommation donut
- Prochaines sessions list

#### Row 3 — Contenu Principal (2 col | 1 col)
- Cette semaine (large)
- Activité récente (sidebar)

#### Row 4 — Relance (conditional, if items > 0)
- À relancer (col-span-full)

---

## Typographie

- **Display (Titres grands)** : Poppins, semibold/bold, tracking-tight
- **Heading (Titres sections)** : Poppins, semibold, tracking-tight
- **Body (Corps)** : Inter, regular, line-height-1.5
- **Small (Captions)** : Inter, text-xs/sm, muted-foreground

### Sizes
- h1 : text-3xl
- h2 : text-2xl
- h3 : text-xl
- p : text-sm / text-base
- small : text-xs

---

## Composants Clés

### KpiCardV2
```tsx
<KpiCardV2
  label="Candidats"
  value={1247}
  icon={Users}
  tint="violet"
  trend="+12% ce mois-ci"
  seed={1}
/>
```
- **Tints :** violet | emerald | amber | blue | rose
- **Trend :** string + trendDown boolean (vert/rose)
- **Seed :** déterministe sparkline

### Button
- **Variant :** primary (brand blue) | ghost (transparent hover) | outline
- **Size :** sm (32px) | md (40px) | lg (44px)
- **Touch target ≥ 48px** sur mobile

### Card
- **Bg :** var(--card)
- **Border :** 1px var(--border)
- **Rounded :** lg / xl (cartes dashboard)
- **Shadow :** hover:shadow-md (subtil)

### Badge
- **Success (vert)** : "Ouverte"
- **Warning (amber)** : "Complète"

---

## État Focus & Accessibilité (WCAG 2.1 AA)

### Focus Visible
- Ring: 2px ring-primary/50 (autour inputs/buttons)
- Offset: ring-offset-2
- Focus order: naturel (DOM order)

### Skip Link
- `sr-only` (invisible par défaut)
- `focus:not-sr-only` apparaît au Tab
- Saute vers `#main-content`

### Keyboard Navigation
- Sidebar: Tab → items, Enter active
- Dropdown: Arrow keys + Enter
- Modals: Trap focus (Esc close)

---

## Responsive Breakpoints

- **xs** : < 640px (mobile)
  - Sidebar: tiroir (SheetContent side="left")
  - Topbar: loup mobile, pas de recherche
  - Dashboard: 1-col, full-width cards

- **sm** : ≥ 640px (tablet)
  - Recherche visible (flex)
  - KPI: grid-cols-2
  - Cards: 2-col layout

- **lg** : ≥ 1024px (desktop)
  - Sidebar: rail fixed 240px
  - Recherche: centrée (lg:mx-auto)
  - KPI: grid-cols-4
  - Full layout 3+ col

- **xl** : ≥ 1280px
  - Padding augmenté
  - Colonnes plus larges

---

## Animations

### Transition Standard
- Duration: 150-200ms
- Easing: ease-in-out (Tailwind default)
- Properties: colors, bg, shadow, transform

### Hover States
- Cards: shadow-md (subtil)
- Links: text color shift
- Buttons: bg/text color invert

### Focus Mode
- Rétrécit la sidebar (future itération)
- Masque certains UI (future itération)

### prefers-reduced-motion
- Toutes animations désactivées
- Transitions figées (immédiat)
- Sparklines: pas d'animation (SVG statique)

---

## Palette Complète Tailwind Customisée

```ts
// tailwind.config.ts
colors: {
  primary: '#1A5FD4',        // bleu vif
  'primary-light': '#4D9FFF',
  navy: '#0D1B3E',            // sidebar
  foreground: 'var(--foreground)',
  background: 'var(--background)',
  card: 'var(--card)',
  muted: 'var(--muted)',
  border: 'var(--border)',
  success: '#10B981',
  warning: '#EA580C',
  destructive: '#ef4444',
}
```

---

## Exemples de Pages Redessinées

### ✅ Dashboard (`/dashboard`)
- Étape 1: Contenu (7840e68)
- Étape 2: Sidebar (8f67a7f)
- Étape 3: Topbar (5ef5e71)

### 🔄 À venir (autres pages console)
- Sessions
- Candidats
- Formations
- Fiches session
- Formateurs
- Clients pro
- Devis/Factures
- Leads/CRM
- Qualiopi/BPF
- Site vitrine cockpit

---

## Directives de Maintenance

### Quand modifier le thème Mouss
1. **Couleurs** : Mettre à jour la palette Tailwind + CSS variables
2. **Typo** : Modifier font sizes dans tailwind.config.ts
3. **Espacements** : Ajuster padding/margin via Tailwind (pas de hardcodes)
4. **Composants** : Créer/updated dans `src/components/ui/` avec le style Mouss

### Quand ajouter une nouvelle page
1. Copier le layout du dashboard (sidebar + topbar)
2. Appliquer les couleurs Mouss (primary, navy, success, etc.)
3. Valider focus/keyboard avec une11y audit
4. Snapshot du design dans ce fichier

---

## Notes d'Implémentation

- **CSS Variables :** Gérées par next-themes (light/dark mode)
- **Tailwind v4** : @apply obsolète, utiliser className directement
- **Responsive-first** : Mobile default, augmenter sur sm/lg/xl
- **Accessibility-first** : sr-only, aria-*, role=*, focus visible
- **Performance** : Sparklines SVG déterministes (pas de hydration mismatch)

---

**Status :** Actif & maintenu  
**Dernière update :** 2026-08-15  
**Branche :** feat/dashboard-redesign-etape1  
**PR :** https://github.com/infocapcomp-dotcom/cap-competence-manager/compare/main...feat/dashboard-redesign-etape1
