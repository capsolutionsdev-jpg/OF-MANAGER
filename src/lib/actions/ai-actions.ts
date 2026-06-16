"use server";

import { requireSection } from "@/lib/section-guard";
import { getTenantDb } from "@/lib/tenant";
import { getCurrentOrganisme } from "@/lib/org";
import { aiComplete, type AiResult } from "@/lib/ai";
import { CRM_STAGE_LABELS } from "@/lib/validators/crm";

export type AiMode = "relance" | "qualification" | "resume" | "libre";

const SYSTEMS: Record<AiMode, string> = {
  relance:
    "Tu es l'assistant commercial d'un organisme de formation professionnelle français. Tu rédiges des e-mails de relance commerciale : polis, chaleureux, concis (120 mots max), en français, prêts à envoyer. N'invente pas d'informations ; n'utilise pas de crochets de remplacement inutiles.",
  qualification:
    "Tu es l'assistant commercial d'un organisme de formation professionnelle français. Tu qualifies un prospect : tu donnes en 4-6 puces le niveau de maturité, les points forts/risques, et l'action commerciale suivante recommandée. Sois concret et bref.",
  resume:
    "Tu es l'assistant d'un organisme de formation. Tu résumes l'historique d'un prospect en quelques lignes claires et actionnables, en français.",
  libre:
    "Tu es l'assistant d'un organisme de formation professionnelle français. Tu réponds de façon utile, concise et professionnelle, en français.",
};

/** Construit le contexte d'un candidat pour l'IA (cloisonné par tenant). */
async function candidatContext(candidatId: string): Promise<string> {
  const db = await getTenantDb();
  const c = await db.candidat.findUnique({
    where: { id: candidatId },
    select: {
      prenom: true,
      nom: true,
      email: true,
      telephone: true,
      crmStage: true,
      sourceConnaissance: true,
      financementType: true,
      formationSouhaitee: { select: { titre: true } },
      interactionsCandidat: {
        orderBy: { date: "desc" },
        take: 5,
        select: { type: true, sujet: true, contenu: true, date: true },
      },
    },
  });
  if (!c) return "";
  const lines = [
    `Prospect : ${c.prenom} ${c.nom}`,
    c.formationSouhaitee?.titre ? `Formation souhaitée : ${c.formationSouhaitee.titre}` : "",
    `Étape pipeline : ${CRM_STAGE_LABELS[c.crmStage]}`,
    c.financementType ? `Financement : ${c.financementType}` : "",
    c.sourceConnaissance ? `Source : ${c.sourceConnaissance}` : "",
    c.interactionsCandidat.length
      ? `Derniers échanges :\n${c.interactionsCandidat
          .map((i) => `- ${i.date.toLocaleDateString("fr-FR")} ${i.type}: ${i.sujet ?? ""} ${i.contenu ?? ""}`.trim())
          .join("\n")}`
      : "Aucun échange enregistré.",
  ].filter(Boolean);
  return lines.join("\n");
}

/** Action unique de l'assistant : génère un texte selon le mode + le contexte. */
export async function runAssistant(formData: FormData): Promise<AiResult> {
  await requireSection("ia");

  const mode = (String(formData.get("mode") ?? "libre")) as AiMode;
  const instruction = String(formData.get("instruction") ?? "").trim();
  const candidatId = String(formData.get("candidatId") ?? "").trim();

  // Marque de l'OF pour personnaliser la signature des e-mails.
  const org = await getCurrentOrganisme();
  const orgName = org?.nom ?? "notre organisme de formation";

  let context = "";
  if (candidatId) context = await candidatContext(candidatId);

  const system = SYSTEMS[mode] ?? SYSTEMS.libre;
  let prompt = "";
  if (mode === "relance") {
    prompt = `Rédige un e-mail de relance pour ce prospect, signé au nom de « ${orgName} ».\n\n${context}\n\n${instruction ? `Consigne : ${instruction}` : ""}`;
  } else if (mode === "qualification") {
    prompt = `Qualifie ce prospect et propose la prochaine action commerciale.\n\n${context}\n\n${instruction ? `Consigne : ${instruction}` : ""}`;
  } else if (mode === "resume") {
    prompt = `Résume la situation de ce prospect.\n\n${context}`;
  } else {
    prompt = `${instruction}${context ? `\n\nContexte prospect :\n${context}` : ""}`;
  }

  if (!prompt.trim()) return { ok: false, error: "Indiquez une consigne ou choisissez un prospect." };

  return aiComplete({ system, prompt, maxTokens: 1200 });
}
