// Assistant IA (module avancé). Utilise le SDK officiel Anthropic (Claude).
// En l'absence de clé ANTHROPIC_API_KEY, le module fonctionne en MODE DÉMO :
// aucune requête n'est émise et un message d'invitation à configurer est renvoyé.

import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";

// Modèle IA : par DÉFAUT Haiku (le moins cher : ~5× moins que Opus pour la
// rédaction d'e-mails, résumés, qualification de leads — largement suffisant).
// Surchargeable par l'env `AI_MODEL` sans redéploiement (ex. Sonnet pour des
// tâches plus complexes). Optimisation de coût — cf. étude des coûts.
const MODEL = process.env.AI_MODEL || "claude-haiku-4-5-20251001";

export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Résout la clé Claude : clé propre à l'OF si renseignée, sinon clé globale. */
async function resolveAiKey(organismeId?: string | null): Promise<string | undefined> {
  if (organismeId) {
    const o = await prisma.organisme.findUnique({
      where: { id: organismeId },
      select: { anthropicApiKey: true },
    });
    if (o?.anthropicApiKey) return decryptSecret(o.anthropicApiKey) ?? undefined;
  }
  return process.env.ANTHROPIC_API_KEY;
}

export type AiResult = { ok: true; text: string } | { ok: false; error: string };

export async function aiComplete(params: {
  system?: string;
  prompt: string;
  maxTokens?: number;
  organismeId?: string | null;
}): Promise<AiResult> {
  const apiKey = await resolveAiKey(params.organismeId);
  if (!apiKey) {
    return {
      ok: false,
      error:
        "Assistant IA non configuré : ajoutez la clé ANTHROPIC_API_KEY à l'environnement pour activer la génération.",
    };
  }
  try {
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: params.maxTokens ?? 1500,
      system: params.system,
      messages: [{ role: "user", content: params.prompt }],
    });
    const text = res.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n")
      .trim();
    return { ok: true, text };
  } catch (e) {
    // Ne PAS exposer l'erreur brute du fournisseur au client (fuite d'infos /
    // messages techniques). On journalise et on renvoie un message générique.
    console.error("[ai] échec de génération:", e);
    return { ok: false, error: "L'assistant IA est momentanément indisponible. Réessayez dans quelques instants." };
  }
}
