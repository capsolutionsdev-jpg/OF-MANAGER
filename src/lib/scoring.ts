import type { CrmStage } from "@prisma/client";

export type Segment = "chaud" | "tiede" | "froid";

export type ScoreInput = {
  email?: string | null;
  telephone?: string | null;
  financementType?: string | null;
  valeurEstimee?: number | null;
  crmStage: CrmStage;
  relanceDate?: Date | null;
  prospectFormCompletedAt?: Date | null;
  interactionsCount?: number;
  tags?: string[];
  createdAt: Date;
};

export type ScoreResult = { score: number; segment: Segment; reasons: string[] };

const STAGE_POINTS: Record<CrmStage, number> = {
  NOUVEAU: 5,
  QUALIFIE: 15,
  PROPOSITION: 25,
  NEGOCIATION: 35,
  GAGNE: 40,
  PERDU: 0,
};

export const SEGMENT_LABELS: Record<Segment, string> = {
  chaud: "Chaud",
  tiede: "Tiède",
  froid: "Froid",
};

export const SEGMENT_BADGE: Record<Segment, string> = {
  chaud: "bg-red-500/10 text-red-700",
  tiede: "bg-amber-500/10 text-amber-700",
  froid: "bg-blue-500/10 text-blue-700",
};

/**
 * Score d'engagement 0–100 d'un prospect, calculé à la volée à partir de
 * signaux existants (coordonnées, étape pipeline, relance, fiche signée,
 * interactions, valeur, fraîcheur). Aucune donnée persistée.
 */
export function scoreCandidat(c: ScoreInput): ScoreResult {
  let score = 0;
  const reasons: string[] = [];
  const now = Date.now();

  if (c.email) {
    score += 10;
    reasons.push("E-mail renseigné");
  }
  if (c.telephone) {
    score += 15;
    reasons.push("Téléphone renseigné");
  }
  if (c.financementType) {
    score += 10;
    reasons.push("Financement identifié");
  }

  const stagePts = STAGE_POINTS[c.crmStage];
  if (stagePts > 0) {
    score += stagePts;
    reasons.push(`Étape pipeline (+${stagePts})`);
  }

  const val = c.valeurEstimee ?? 0;
  if (val > 0) {
    const bonus = Math.min(15, 5 + Math.floor(val / 1000));
    score += bonus;
    reasons.push(`Opportunité valorisée (+${bonus})`);
  }

  if (c.prospectFormCompletedAt) {
    score += 15;
    reasons.push("Fiche prospect signée");
  }

  if (c.relanceDate && c.relanceDate.getTime() > now) {
    score += 8;
    reasons.push("Relance planifiée");
  }

  const inter = c.interactionsCount ?? 0;
  if (inter > 0) {
    const bonus = Math.min(15, inter * 3);
    score += bonus;
    reasons.push(`${inter} interaction(s) (+${bonus})`);
  }

  if ((c.tags?.length ?? 0) > 0) {
    score += 5;
    reasons.push("Segmenté (tags)");
  }

  const ageDays = (now - c.createdAt.getTime()) / 86_400_000;
  if (ageDays <= 7) {
    score += 10;
    reasons.push("Prospect récent");
  } else if (ageDays > 90) {
    score -= 10;
    reasons.push("Ancien (−10)");
  }

  score = Math.max(0, Math.min(100, score));
  const segment: Segment = score >= 60 ? "chaud" : score >= 30 ? "tiede" : "froid";
  return { score, segment, reasons };
}
