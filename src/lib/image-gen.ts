// Génération d'images IA (optionnelle) pour les visuels réseaux sociaux.
// Provider par défaut : OpenAI Images (gpt-image-1). Clé au niveau PLATEFORME
// (`IMAGE_API_KEY`, repli `OPENAI_API_KEY`) → inactif proprement si non
// configurée. Provider isolé ici : en changer (Stability, Replicate…) = ne
// toucher que ce fichier. (Une clé par OF pourra s'ajouter plus tard, façon
// `anthropicApiKey`.)

import "server-only";

export type ImageResult =
  | { ok: true; dataUri: string }
  | { ok: false; error: string; needsKey?: boolean };

// Formats de carte → tailles supportées par gpt-image-1.
const SIZE_BY_FORMAT: Record<string, string> = {
  carre: "1024x1024",
  paysage: "1536x1024",
  story: "1024x1536",
};

/** La génération d'images IA est-elle activée (clé plateforme présente) ? */
export function imageIaConfigured(): boolean {
  return Boolean(process.env.IMAGE_API_KEY || process.env.OPENAI_API_KEY);
}

/** Génère une image à partir d'un prompt. Renvoie une data-URI PNG. */
export async function genererImageIA(opts: {
  prompt: string;
  format?: string;
}): Promise<ImageResult> {
  const key = process.env.IMAGE_API_KEY || process.env.OPENAI_API_KEY;
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
