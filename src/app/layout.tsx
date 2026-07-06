import type { Metadata } from "next";
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://ofmanager.fr"),
  title: "OFManager — Logiciel des organismes de formation",
  description:
    "OFManager : le logiciel des organismes de formation (sécurité privée, incendie, secourisme, prévention) — conforme Qualiopi, à votre marque. Édité par CAP Compétences.",
  applicationName: "OFManager",
  openGraph: {
    type: "website",
    siteName: "OFManager",
    locale: "fr_FR",
    images: [{ url: "/ofmanager-logo.png", width: 1200, height: 630, alt: "OFManager" }],
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${fontVars} h-full antialiased`} suppressHydrationWarning>
      <head>
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
      </body>
    </html>
  );
}
