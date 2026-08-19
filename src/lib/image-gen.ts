// Génération d'images IA (optionnelle) pour les visuels réseaux sociaux.
// Provider par défaut : OpenAI Images (gpt-image-1). Clé résolue PAR ORGANISME
// (`Organisme.imageApiKey`, chiffrée) avec repli sur la config plateforme
// (`IMAGE_API_KEY` puis `OPENAI_API_KEY`). Provider isolé ici : en changer
// (Stability, Replicate…) = ne toucher que ce fichier.

import "server-only";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";

export type ImageResult =
  | { ok: true; dataUri: string }
  | { ok: false; error: string; needsKey?: boolean };

// Formats de carte → tailles supportées par gpt-image-1.
const SIZE_BY_FORMAT: Record<string, string> = {
  carre: "1024x1024",
  paysage: "1536x1024",
  story: "1024x1536",
};

/** Résout la clé d'images : propre à l'OF (chiffrée) sinon config plateforme. */
async function resolveImageKey(organismeId?: string | null): Promise<string | undefined> {
  if (organismeId) {
    const o = await prisma.organisme.findUnique({
      where: { id: organismeId },
      select: { imageApiKey: true },
    });
    if (o?.imageApiKey) return decryptSecret(o.imageApiKey) ?? undefined;
  }
  return process.env.IMAGE_API_KEY || process.env.OPENAI_API_KEY || undefined;
}

/** La génération d'images IA est-elle activée (clé propre à l'OF ou plateforme) ? */
export async function imageIaConfigured(organismeId?: string | null): Promise<boolean> {
  return Boolean(await resolveImageKey(organismeId));
}

/** Génère une image à partir d'un prompt. Renvoie une data-URI PNG. */
export async function genererImageIA(opts: {
  prompt: string;
  format?: string;
  organismeId?: string | null;
}): Promise<ImageResult> {
  const key = await resolveImageKey(opts.organismeId);
  if (!key) {
    return { ok: false, needsKey: true, error: "Aucune clé d'images IA configurée." };
  }
  const size = SIZE_BY_FORMAT[opts.format ?? "carre"] ?? "1024x1024";
  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ model: "gpt-image-1", prompt: opts.prompt, size, n: 1 }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return {
        ok: false,
        error: `Le service d'images a répondu ${res.status}. ${detail.slice(0, 180)}`.trim(),
      };
    }
    const json = (await res.json()) as { data?: Array<{ b64_json?: string }> };
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) return { ok: false, error: "Réponse du service d'images invalide (pas d'image)." };
    return { ok: true, dataUri: `data:image/png;base64,${b64}` };
  } catch (e) {
    return { ok: false, error: `Échec de l'appel au service d'images : ${String(e).slice(0, 150)}` };
  }
}
