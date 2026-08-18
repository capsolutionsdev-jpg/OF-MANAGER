// Métadonnées des réseaux sociaux pris en charge par le module Communication.
// Module SANS dépendance runtime serveur (seul un `import type`, effacé à la
// compilation) → importable côté CLIENT (onglets, badges) ET côté serveur
// (génération IA). `social-content.ts` le réexporte pour compat.

import type { SocialPlatform } from "@prisma/client";

export type PlatformMeta = {
  enum: SocialPlatform;
  json: string; // clé attendue dans le JSON de l'IA
  label: string;
  guidance: string; // consigne de rédaction envoyée au modèle
  maxChars: number;
  color: string; // couleur de marque (accent d'onglet/badge)
};

export const SOCIAL_PLATFORMS: PlatformMeta[] = [
  { enum: "LINKEDIN", json: "linkedin", label: "LinkedIn", guidance: "ton professionnel, orienté SEO, 300–400 mots, 3–5 hashtags", maxChars: 3000, color: "#0A66C2" },
  { enum: "FACEBOOK", json: "facebook", label: "Facebook", guidance: "accessible et engageant, 100–200 mots, 2–4 hashtags", maxChars: 2000, color: "#1877F2" },
  { enum: "INSTAGRAM", json: "instagram", label: "Instagram", guidance: "émotionnel et visuel, 80–150 mots, 8–15 hashtags", maxChars: 2200, color: "#E4405F" },
  { enum: "X", json: "x", label: "X (Twitter)", guidance: "percutant et concis, MOINS de 280 caractères au total (hashtags compris), 1–3 hashtags", maxChars: 280, color: "#0F172A" },
  { enum: "TIKTOK", json: "tiktok", label: "TikTok", guidance: "dynamique et tendance, script court de 100–200 mots, 3–6 hashtags", maxChars: 2200, color: "#FE2C55" },
  { enum: "YOUTUBE", json: "youtube", label: "YouTube", guidance: "description de vidéo informative et détaillée, 200–400 mots, 3–6 hashtags", maxChars: 5000, color: "#FF0000" },
  { enum: "WHATSAPP", json: "whatsapp", label: "WhatsApp", guidance: "amical et court, 50–100 mots, sans hashtags", maxChars: 1000, color: "#25D366" },
];

export const platformByJson = (json: string) => SOCIAL_PLATFORMS.find((p) => p.json === json);
export const platformByEnum = (e: SocialPlatform) => SOCIAL_PLATFORMS.find((p) => p.enum === e);
