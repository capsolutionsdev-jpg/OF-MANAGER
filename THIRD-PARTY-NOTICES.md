# Mentions de licences tierces (open source) — OF Manager

OF Manager s'appuie sur des composants open source. Ce fichier satisfait aux obligations
d'**attribution** des licences permissives (MIT, ISC, BSD, Apache-2.0) et documente les cas
particuliers (dual-licence, LGPL, polices). Il est destiné à être publié (page « Licences »
de l'application ou lien en pied de page) puisque le bundle client et les polices
auto-hébergées sont livrés au navigateur.

> Établi le 2026-08-15 à partir de `package.json` + des champs `license` des paquets installés.
> Chaque bibliothèque reste soumise à sa propre licence ; les textes complets sont disponibles
> dans `node_modules/<paquet>/LICENSE`.

## Bibliothèques principales (runtime) et leurs licences

| Bibliothèque | Licence |
|---|---|
| next, react, react-dom | MIT — © Vercel, Inc. / © Meta Platforms, Inc. |
| next-auth | ISC — © Balázs Orbán & contributeurs |
| @prisma/client | Apache-2.0 — © Prisma Data, Inc. |
| @anthropic-ai/sdk | MIT — © Anthropic |
| @sentry/nextjs | MIT — © Functional Software, Inc. (Sentry) |
| stripe | MIT — © Stripe, Inc. |
| firebase-admin | Apache-2.0 — © Google Inc. |
| @vercel/blob | Apache-2.0 — © Vercel, Inc. |
| @upstash/redis | MIT — © Upstash |
| puppeteer-core | Apache-2.0 — © Google Inc. |
| @sparticuz/chromium | MIT — © Sparticuz |
| @turbodocx/html-to-docx | MIT — © TurboDocx |
| pdf-lib | MIT — © Andrew Dillon |
| bcryptjs | BSD-3-Clause — © Daniel Wirtz |
| qrcode | MIT — © Ryan Day |
| zod | MIT — © Colin McDonnell |
| date-fns | MIT — © Sasha Koss & contributeurs |
| lucide-react | ISC — © Lucide Contributors |
| class-variance-authority | Apache-2.0 — © Joe Bell |
| clsx, tailwind-merge, sonner, next-themes, tw-animate-css, react-hook-form, @hookform/resolvers, @base-ui/react | MIT |
| shadcn/ui (composants copiés dans `src/components/ui`) | MIT — © shadcn |

## Cas particuliers (documentés)

- **jszip** — double licence **`(MIT OR GPL-3.0-or-later)`**. OF Manager **élit la licence MIT** pour ce
  composant (utilisé pour les exports ZIP / dossier Qualiopi). Aucune obligation GPL ne s'applique.
- **sharp** (optimisation d'images, via Next.js) — inclut un binding natif de **libvips** sous
  **`LGPL-3.0-or-later`**. La bibliothèque n'est ni modifiée ni redistribuée en tant que binaire aux
  utilisateurs (exploitation SaaS) ; les obligations LGPL sont satisfaites. Attribution ci-présente.
- **Polices de caractères** (auto-hébergées via `next/font`, livrées au navigateur) : Inter, Geist Mono,
  Plus Jakarta Sans, Sora, Manrope, DM Sans, Archivo — toutes sous **SIL Open Font License 1.1 (OFL)**.
  La notice OFL doit accompagner les fichiers de police redistribués.
- Outils de **build / dev** (non livrés au runtime) : `@axe-core/playwright`, `axe-core`, `lightningcss`
  sont sous **MPL-2.0** (copyleft par fichier) ; non modifiés et non distribués → aucune obligation.

## Verdict de conformité
La composition de licences est **compatible avec une exploitation SaaS commerciale fermée** : l'arbre
runtime est entièrement permissif (MIT / ISC / Apache-2.0 / BSD) une fois la branche MIT de `jszip`
élue, le seul copyleft runtime étant le binding LGPL de libvips (conforme en SaaS). Aucune licence
AGPL ni GPL « pure ».

*Ce document est une synthèse technique d'attribution ; il ne constitue pas un avis juridique.*
