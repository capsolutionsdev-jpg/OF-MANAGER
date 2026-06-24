import { NextResponse } from "next/server";
import { aiComplete } from "@/lib/ai";
import { civicCors, getCandidatFromToken } from "@/lib/civique-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM =
  "Tu es un tuteur pédagogique bienveillant, spécialisé en Français Langue Étrangère (FLE) et en préparation à l'examen civique français (valeurs, institutions, droits et devoirs, histoire, vie quotidienne). " +
  "Tu écris en français clair, en phrases courtes, adapté au niveau du candidat. Tu n'inventes jamais de texte de loi ni de fait : si une information manque, tu le dis simplement. Tu es encourageant et concret.";

const LANGUE_NOM: Record<string, string> = {
  ar: "arabe",
  en: "anglais",
  es: "espagnol",
  pt: "portugais",
  fr: "français",
};

type Body = {
  action?: "expliquer" | "reformuler" | "traduire" | "exercices" | "coach";
  niveau?: string;
  // expliquer
  enonce?: string;
  options?: string[];
  bonneIndex?: number;
  choixIndex?: number;
  // reformuler / traduire / coach
  texte?: string;
  langue?: string;
  message?: string;
  contexte?: string;
  // exercices
  theme?: string;
  sousThemes?: string[];
  n?: number;
};

function buildPrompt(b: Body): { prompt: string; maxTokens: number; json?: boolean } | null {
  const niveau = b.niveau ?? "standard";
  switch (b.action) {
    case "expliquer": {
      if (!b.enonce || !b.options || b.bonneIndex == null) return null;
      const opts = b.options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join("\n");
      const bonne = String.fromCharCode(65 + b.bonneIndex);
      const choix = b.choixIndex != null && b.choixIndex >= 0 ? String.fromCharCode(65 + b.choixIndex) : null;
      return {
        maxTokens: 400,
        prompt:
          `Question d'examen civique :\n${b.enonce}\n${opts}\n\nBonne réponse : ${bonne}.` +
          (choix && choix !== bonne ? ` Le candidat a répondu : ${choix}.` : "") +
          `\n\nExplique simplement pourquoi la bonne réponse est correcte` +
          (choix && choix !== bonne ? ", et pourquoi la réponse du candidat est fausse" : "") +
          `. Niveau de français du candidat : ${niveau}. Réponds en 3 ou 4 phrases courtes.`,
      };
    }
    case "reformuler":
      if (!b.texte) return null;
      return {
        maxTokens: 500,
        prompt: `Reformule le texte suivant en français très simple (phrases courtes, vocabulaire facile, une idée par phrase). Garde le sens exact.\n\n« ${b.texte} »`,
      };
    case "traduire": {
      if (!b.texte) return null;
      const nom = LANGUE_NOM[b.langue ?? ""] ?? b.langue ?? "anglais";
      return {
        maxTokens: 500,
        prompt: `Traduis le texte suivant en ${nom}. Donne uniquement la traduction, sans commentaire.\n\n« ${b.texte} »`,
      };
    }
    case "coach":
      if (!b.message) return null;
      return {
        maxTokens: 500,
        prompt:
          `Le candidat te pose cette question pendant sa révision :\n« ${b.message} »\n` +
          (b.contexte ? `Contexte : ${b.contexte}\n` : "") +
          `Réponds comme un coach de révision : français simple, encourageant, concret, 3 à 5 phrases.`,
      };
    case "exercices": {
      if (!b.theme) return null;
      const n = Math.min(Math.max(b.n ?? 5, 1), 10);
      const st = b.sousThemes?.length ? ` (sous-thèmes : ${b.sousThemes.join(", ")})` : "";
      return {
        maxTokens: 1500,
        json: true,
        prompt:
          `Génère ${n} questions de QCM pour l'examen civique français sur le thème « ${b.theme} »${st}, niveau ${niveau}. ` +
          `Chaque question a exactement 4 options et une seule bonne réponse. ` +
          `Réponds UNIQUEMENT par un tableau JSON valide, sans texte autour, au format : ` +
          `[{"enonce": string, "options": [string, string, string, string], "reponse": number (index 0-3), "explication": string}].`,
      };
    }
    default:
      return null;
  }
}

// POST /api/civique/ai — assistant pédagogique (RAG par injection de contexte).
// Réservé aux candidats provisionnés (Bearer civicToken) pour maîtriser le coût.
export async function POST(req: Request) {
  const candidat = await getCandidatFromToken(req);
  if (!candidat) {
    return NextResponse.json({ error: "Accès réservé aux candidats inscrits." }, { status: 401, headers: civicCors });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400, headers: civicCors });
  }

  const built = buildPrompt(body);
  if (!built) {
    return NextResponse.json({ error: "Action ou paramètres invalides." }, { status: 400, headers: civicCors });
  }

  const res = await aiComplete({
    system: SYSTEM,
    prompt: built.prompt,
    maxTokens: built.maxTokens,
    organismeId: candidat.organismeId,
  });
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: 502, headers: civicCors });
  }

  // Exercices : on tente de parser le JSON renvoyé par le modèle.
  if (built.json) {
    try {
      const start = res.text.indexOf("[");
      const end = res.text.lastIndexOf("]");
      const exercices = JSON.parse(res.text.slice(start, end + 1));
      return NextResponse.json({ exercices }, { headers: civicCors });
    } catch {
      return NextResponse.json({ error: "Génération illisible, réessayez." }, { status: 502, headers: civicCors });
    }
  }

  return NextResponse.json({ text: res.text }, { headers: civicCors });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: civicCors });
}
