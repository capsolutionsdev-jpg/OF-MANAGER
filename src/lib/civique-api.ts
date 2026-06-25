// =============================================================
//  API E-LEARNING EXAMEN CIVIQUE — helpers d'intégration vitrine.
//  Le site vitrine (cap-language-academy) consomme ces endpoints :
//   • auth     : valide un candidat via (email + civicToken)
//   • state    : lit / écrit l'état complet de progression
//  Les COMPTES sont créés par la plateforme (champ Candidat.civicToken).
//  Mappe les énumérations vitrine (minuscule) ↔ Prisma (majuscule).
// =============================================================

import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { CivicMention, CivicModuleStatut, CivicPath, Prisma } from "@prisma/client";
import { sendEmail } from "@/lib/email";

const VITRINE_BASE = process.env.VITRINE_URL ?? "https://capacademy.fr";
const MENTION_NOM_LISIBLE: Record<CivicMention, string> = {
  CSP: "Carte de séjour pluriannuelle (CSP)",
  CR: "Carte de résident (CR)",
  NATURALISATION: "Naturalisation",
};

// ---------- CORS (le vitrine est sur un autre domaine) ----------
export const civicCors: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

// ---------- Mappings énumérations ----------
const MENTION_TO_DB: Record<string, CivicMention> = {
  csp: CivicMention.CSP,
  cr: CivicMention.CR,
  naturalisation: CivicMention.NATURALISATION,
};
const MENTION_FROM_DB: Record<CivicMention, string> = {
  CSP: "csp",
  CR: "cr",
  NATURALISATION: "naturalisation",
};
const PATH_TO_DB: Record<string, CivicPath> = {
  expert: CivicPath.EXPERT,
  standard: CivicPath.STANDARD,
  renforce: CivicPath.RENFORCE,
  accompagnement: CivicPath.ACCOMPAGNEMENT,
};
const PATH_FROM_DB: Record<CivicPath, string> = {
  EXPERT: "expert",
  STANDARD: "standard",
  RENFORCE: "renforce",
  ACCOMPAGNEMENT: "accompagnement",
};
const STATUT_TO_DB: Record<string, CivicModuleStatut> = {
  not_started: CivicModuleStatut.NOT_STARTED,
  in_progress: CivicModuleStatut.IN_PROGRESS,
  completed: CivicModuleStatut.COMPLETED,
};
const STATUT_FROM_DB: Record<CivicModuleStatut, string> = {
  NOT_STARTED: "not_started",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
};

// ---------- Authentification candidat (par civicToken) ----------
export type CivicCandidat = {
  id: string;
  prenom: string;
  email: string;
  organismeId: string | null;
};

/** Lit le Bearer token et renvoie le candidat correspondant, ou null. */
export async function getCandidatFromToken(req: Request): Promise<CivicCandidat | null> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;
  const c = await prisma.candidat.findUnique({
    where: { civicToken: token },
    select: { id: true, prenom: true, email: true, organismeId: true },
  });
  return c;
}

// ---------- Types de l'état échangé avec le vitrine ----------
type Asmt = {
  languageScore: number;
  civicsScore: number;
  langNiveau: string;
  recommendedPath: string;
  date: number;
};
type Prog = {
  moduleId: string;
  startDate: number;
  endDate?: number;
  score: number;
  attempts: number;
  timeSpent: number;
  completionRate: number;
  status: string;
};
type Weak = {
  theme: string;
  sousTheme: string;
  errorCount: number;
  lastSeen: number;
  masteryLevel: number;
};
type Mock = {
  score: number;
  total: number;
  bonnes: number;
  successProbability: number;
  date: number;
};
export type CivicState = {
  assessment: Record<string, Asmt>;
  progress: Record<string, Prog>;
  weaknesses: Weak[];
  mockExams: Record<string, Mock[]>;
};

// ---------- Sérialisation : DB → état vitrine ----------
export async function serializeState(candidatId: string): Promise<CivicState> {
  const [assessments, progress, weaknesses, mocks] = await Promise.all([
    prisma.civicAssessment.findMany({ where: { candidatId } }),
    prisma.civicProgress.findMany({ where: { candidatId } }),
    prisma.civicWeakness.findMany({ where: { candidatId } }),
    prisma.civicMockExam.findMany({ where: { candidatId }, orderBy: { date: "asc" } }),
  ]);

  const state: CivicState = { assessment: {}, progress: {}, weaknesses: [], mockExams: {} };

  for (const a of assessments) {
    state.assessment[MENTION_FROM_DB[a.mention]] = {
      languageScore: a.languageScore,
      civicsScore: a.civicsScore,
      langNiveau: a.langNiveau,
      recommendedPath: PATH_FROM_DB[a.recommendedPath],
      date: a.date.getTime(),
    };
  }
  for (const p of progress) {
    state.progress[p.moduleId] = {
      moduleId: p.moduleId,
      startDate: p.startDate.getTime(),
      endDate: p.endDate?.getTime(),
      score: p.score,
      attempts: p.attempts,
      timeSpent: p.timeSpent,
      completionRate: p.completionRate,
      status: STATUT_FROM_DB[p.statut],
    };
  }
  state.weaknesses = weaknesses.map((w) => ({
    theme: w.theme,
    sousTheme: w.sousTheme,
    errorCount: w.errorCount,
    lastSeen: w.lastSeen.getTime(),
    masteryLevel: w.masteryLevel,
  }));
  for (const m of mocks) {
    const key = MENTION_FROM_DB[m.mention];
    (state.mockExams[key] ??= []).push({
      score: m.score,
      total: m.total,
      bonnes: m.bonnes,
      successProbability: m.successProbability,
      date: m.date.getTime(),
    });
  }
  return state;
}

// ---------- Persistance : état vitrine → DB (write-through complet) ----------
export async function applyState(
  candidat: CivicCandidat,
  state: Partial<CivicState>,
): Promise<void> {
  const candidatId = candidat.id;
  const organismeId = candidat.organismeId;
  const ops: Prisma.PrismaPromise<unknown>[] = [];

  // Assessments : upsert par (candidatId, mention).
  for (const [mention, a] of Object.entries(state.assessment ?? {})) {
    const m = MENTION_TO_DB[mention];
    if (!m || !a) continue;
    const data = {
      languageScore: a.languageScore,
      civicsScore: a.civicsScore,
      langNiveau: a.langNiveau,
      recommendedPath: PATH_TO_DB[a.recommendedPath] ?? CivicPath.STANDARD,
      date: new Date(a.date),
    };
    ops.push(
      prisma.civicAssessment.upsert({
        where: { candidatId_mention: { candidatId, mention: m } },
        create: { candidatId, organismeId, mention: m, ...data },
        update: data,
      }),
    );
  }

  // Progress : upsert par (candidatId, moduleId).
  for (const [moduleId, p] of Object.entries(state.progress ?? {})) {
    if (!p) continue;
    const data = {
      startDate: new Date(p.startDate),
      endDate: p.endDate ? new Date(p.endDate) : null,
      score: p.score,
      attempts: p.attempts,
      timeSpent: p.timeSpent,
      completionRate: p.completionRate,
      statut: STATUT_TO_DB[p.status] ?? CivicModuleStatut.IN_PROGRESS,
    };
    ops.push(
      prisma.civicProgress.upsert({
        where: { candidatId_moduleId: { candidatId, moduleId } },
        create: { candidatId, organismeId, moduleId, ...data },
        update: data,
      }),
    );
  }

  // Weaknesses & mock exams : remplacement complet (l'état envoyé fait foi).
  if (state.weaknesses) {
    ops.push(prisma.civicWeakness.deleteMany({ where: { candidatId } }));
    if (state.weaknesses.length) {
      ops.push(
        prisma.civicWeakness.createMany({
          data: state.weaknesses.map((w) => ({
            candidatId,
            organismeId,
            theme: w.theme,
            sousTheme: w.sousTheme,
            errorCount: w.errorCount,
            lastSeen: new Date(w.lastSeen),
            masteryLevel: w.masteryLevel,
          })),
        }),
      );
    }
  }
  if (state.mockExams) {
    const rows = Object.entries(state.mockExams).flatMap(([mention, list]) => {
      const m = MENTION_TO_DB[mention];
      if (!m) return [];
      return (list ?? []).map((e) => ({
        candidatId,
        organismeId,
        mention: m,
        score: e.score,
        total: e.total,
        bonnes: e.bonnes,
        successProbability: e.successProbability,
        date: new Date(e.date),
      }));
    });
    ops.push(prisma.civicMockExam.deleteMany({ where: { candidatId } }));
    if (rows.length) ops.push(prisma.civicMockExam.createMany({ data: rows }));
  }

  await prisma.$transaction(ops);
}

// ---------- Paiement en ligne : fulfillment (idempotent) ----------
export type CivicFulfillment = {
  candidatId: string;
  email: string;
  prenom: string;
  civicToken: string;
};

/**
 * Traite un paiement de prépa civique confirmé : crée/retrouve le candidat,
 * provisionne son code d'accès (civicToken) et enregistre le paiement.
 * Idempotent (rejouable par le webhook ET la page de succès) grâce à l'upsert
 * sur `stripeSessionId`. Renvoie null si la session n'est pas une prépa civique.
 */
export async function fulfillCivicCheckout(args: {
  sessionId: string;
  amountTotal: number | null;
  metadata: Record<string, string> | null;
}): Promise<CivicFulfillment | null> {
  const meta = args.metadata ?? {};
  if (meta.type !== "civique") return null;
  const organismeId = meta.organismeId || null;
  const email = (meta.email || "").toLowerCase();
  const prenom = meta.prenom || "";
  const mention = MENTION_TO_DB[meta.mention];
  if (!organismeId || !email || !mention) return null;

  // Candidat : retrouvé par (organisme, e-mail) ou créé.
  let candidat = await prisma.candidat.findFirst({
    where: { organismeId, email },
    select: { id: true, prenom: true, email: true, civicToken: true },
  });
  if (!candidat) {
    candidat = await prisma.candidat.create({
      data: { organismeId, email, prenom, nom: "", sourceConnaissance: "Site vitrine — prépa civique" },
      select: { id: true, prenom: true, email: true, civicToken: true },
    });
  }

  // Provision du code d'accès si absent.
  let token = candidat.civicToken;
  if (!token) {
    token = randomBytes(24).toString("base64url");
    await prisma.candidat.update({ where: { id: candidat.id }, data: { civicToken: token } });
  }

  // Paiement (idempotent sur la session Stripe).
  const paiement = await prisma.civicPaiement.upsert({
    where: { stripeSessionId: args.sessionId },
    create: {
      organismeId,
      candidatId: candidat.id,
      mention,
      montantCents: args.amountTotal ?? 0,
      stripeSessionId: args.sessionId,
    },
    update: {},
  });

  // E-mail (code d'accès + reçu) — ENVOI UNIQUE garanti par un claim atomique :
  // le webhook ET la page de succès appellent ce fulfillment plusieurs fois.
  const claim = await prisma.civicPaiement.updateMany({
    where: { id: paiement.id, emailSentAt: null },
    data: { emailSentAt: new Date() },
  });
  if (claim.count === 1) {
    const euros = ((args.amountTotal ?? 0) / 100).toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
    });
    await sendEmail({
      to: candidat.email,
      organismeId,
      subject: "Votre accès à la préparation à l'examen civique",
      body:
        `Bonjour ${candidat.prenom || ""},\n\n` +
        `Merci pour votre inscription à la préparation à l'examen civique — ${MENTION_NOM_LISIBLE[mention]}.\n` +
        `Votre paiement de ${euros} € est confirmé (reçu également disponible sur votre tableau de bord Stripe).\n\n` +
        `VOTRE CODE D'ACCÈS : ${token}\n\n` +
        `Pour démarrer votre parcours, connectez-vous avec votre e-mail (${candidat.email}) et ce code, ` +
        `onglet « Code d'accès » :\n${VITRINE_BASE}/cap-language-academy/examen-civique/connexion\n\n` +
        `Conservez ce code précieusement : il vous permet de retrouver votre progression sur tous vos appareils.\n\n` +
        `À bientôt,\nL'équipe CAP Compétences`,
    });
  }

  return {
    candidatId: candidat.id,
    email: candidat.email,
    prenom: candidat.prenom,
    civicToken: token,
  };
}
