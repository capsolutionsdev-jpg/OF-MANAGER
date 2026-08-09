import type { Metadata, Viewport } from "next";
import { SITE_URL } from "@/lib/site-url";
import {
  Geist_Mono,
  Inter,
  Plus_Jakarta_Sans,
  Sora,
  Manrope,
  DM_Sans,
  Archivo,
  Space_Grotesk,
  Fraunces,
  Bricolage_Grotesque,
} from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { RegisterSW } from "@/components/pwa/register-sw";

// Polices auto-hébergées via next/font (zéro <link> externe, zéro CLS).
// Chaque police expose une variable CSS consommée par lib/themes.ts (designs
// par tenant) et globals.css (thème par défaut « Sable & Cobalt »).
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const jakarta = Plus_Jakarta_Sans({ variable: "--font-plus-jakarta", subsets: ["latin"], display: "swap" });
const sora = Sora({ variable: "--font-sora", subsets: ["latin"], display: "swap" });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], display: "swap" });
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"], display: "swap" });
const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], display: "swap" });
const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"], display: "swap" });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], display: "swap" });
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], display: "swap" });

const fontVars = [
  geistMono.variable,
  inter.variable,
  jakarta.variable,
  sora.variable,
  manrope.variable,
  dmSans.variable,
  archivo.variable,
  spaceGrotesk.variable,
  fraunces.variable,
  bricolage.variable,
].join(" ");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "OFManager — Logiciel des organismes de formation",
  description:
    "OFManager : le logiciel des organismes de formation (sécurité privée, incendie, secourisme, prévention) — conforme Qualiopi, à votre marque. Édité par CAP Compétences.",
  applicationName: "OFManager",
  // PWA : rend l'app « app-like » sur iOS (Safari « Ajouter à l'écran d'accueil »).
  // Le manifeste (app/manifest.ts) couvre Android / desktop.
  appleWebApp: {
    capable: true,
    title: "OFManager",
    statusBarStyle: "default",
  },
  openGraph: {
    type: "website",
    siteName: "OFManager",
    locale: "fr_FR",
    // L'image OG est générée par app/opengraph-image.tsx (bannière 1200×630) —
    // le fichier-convention prime sur toute entrée `images` déclarée ici.
  },
  twitter: { card: "summary_large_image" },
};

// Viewport (Next 16 : export séparé). Couleur de barre système (thème mobile)
// + zoom autorisé pour l'accessibilité + rendu bord-à-bord (encoches).
export const viewport: Viewport = {
  themeColor: "#0D1B3E",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${fontVars} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Icône d'accueil iOS (apple-touch-icon) — complète le manifeste. */}
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        {/* Applique le thème mémorisé AVANT le premier rendu (aucun flash).
            Par défaut : mode clair ; sombre uniquement si choisi par l'utilisateur. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full">
        {children}
        <Toaster richColors position="top-right" />
        <RegisterSW />
      </body>
    </html>
  );
}
