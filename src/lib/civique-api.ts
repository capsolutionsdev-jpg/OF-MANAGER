// =============================================================
//  API E-LEARNING EXAMEN CIVIQUE — helpers d'intégration vitrine.
//  Le site vitrine (cap-language-academy) consomme ces endpoints :
//   • auth     : valide un candidat via (email + civicToken)
//   • state    : lit / écrit l'état complet de progression
//  Les COMPTES sont créés par la plateforme (champ Candidat.civicToken).
//  Mappe les énumérations vitrine (minuscule) ↔ Prisma (majuscule).
// =============================================================

import { randomBytes } from "crypto";
import { prisma, prismaBase, txWithOrg } from "@/lib/prisma";
import { CivicMention, CivicModuleStatut, CivicPath, Prisma } from "@prisma/client";
import { nextRef, maxSuffix } from "@/lib/numerotation";
import { sendEmail } from "@/lib/email";
import {
  emailShell,
  emailHeading,
  emailParagraph,
  emailBox,
  emailButton,
  emailSignoff,
  esc,
  NAVY,
  MUTED,
} from "@/lib/email-templates";

const VITRINE_BASE = process.env.VITRINE_URL ?? "https://ofmanager.info";
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

/**
 * Résout l'organisme cible des endpoints PUBLICS de la prépa civique.
 * Sécurité multi-tenant (audit A05-002) : l'organisme n'est JAMAIS pris
 * librement dans le corps de la requête (sinon écriture PII cross-tenant dans le
 * CRM d'un tenant arbitraire). Il provient de l'env `CIVIC_ORGANISME_ID`. Pour
 * un déploiement multi-vitrine, l'env `CIVIC_ORGANISME_IDS` (liste séparée par
 * des virgules) autorise un id fourni par l'appelant UNIQUEMENT s'il figure dans
 * cette liste blanche. Sinon → null (l'appelant reçoit « organisme non configuré »).
 */
export function resolveCivicOrganismeId(requested?: string | null): string | null {
  const pinned = process.env.CIVIC_ORGANISME_ID?.trim();
  if (pinned) return pinned;
  const allow = (process.env.CIVIC_ORGANISME_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const req = (requested ?? "").trim();
  return req && allow.includes(req) ? req : null;
}

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
    select: {
      id: true,
      prenom: true,
      email: true,
      organismeId: true,
      civicAccessUntil: true,
      civicAccessStatut: true,
    },
  });
  if (!c) return null;
  // Compte suspendu ou désactivé depuis le back-office → accès refusé.
  if (c.civicAccessStatut !== "ACTIF") return null;
  // Compte désactivé après la date de fin d'accès (≈ 30 jours).
  if (c.civicAccessUntil && c.civicAccessUntil.getTime() < Date.now()) return null;
  return { id: c.id, prenom: c.prenom, email: c.email, organismeId: c.organismeId };
}

/** Durée d'accès e-learning accordée à chaque inscription (30 jours). */
export const CIVIC_ACCESS_DAYS = 30;
export function civicAccessUntil(): Date {
  return new Date(Date.now() + CIVIC_ACCESS_DAYS * 24 * 60 * 60 * 1000);
}

/** Mentions (formations) accessibles au candidat — minuscule.
 *  Union des mentions accordées au compte (`civicMentions`, création manuelle)
 *  et des mentions payées (`CivicPaiement`, en ligne ou physique). */
export async function entitledMentions(candidatId: string): Promise<string[]> {
  const [cand, ps] = await Promise.all([
    prisma.candidat.findUnique({
      where: { id: candidatId },
      select: { civicMentions: true },
    }),
    prisma.civicPaiement.findMany({
      where: { candidatId, statut: "paye" },
      select: { mention: true },
    }),
  ]);
  const set = new Set<string>();
  for (const m of cand?.civicMentions ?? []) set.add(MENTION_FROM_DB[m]);
  for (const p of ps) set.add(MENTION_FROM_DB[p.mention]);
  return [...set];
}

// ---------- Facturation ----------
/** Prochain numéro de document, CIV-AAAA-NNNN (facture) ou AVOIR-AAAA-NNNN.
 * Numérotation ATOMIQUE (compteur NumeroSequence), auto-amorcée depuis
 * l'historique → anti-doublon / anti-trou même en cas d'émissions concurrentes. */
export async function nextFactureNumero(
  organismeId: string,
  kind: "FACTURE" | "AVOIR" = "FACTURE",
): Promise<string> {
  const base = kind === "AVOIR" ? "AVOIR" : "CIV";
  const year = new Date().getFullYear();
  return nextRef(organismeId, base, async () => {
    const rows = await prisma.civicFacture.findMany({
      where: { organismeId, numero: { startsWith: `${base}-${year}-` } },
      select: { numero: true },
    });
    return maxSuffix(rows.map((r) => r.numero));
  });
}

/** Émet un avoir (montants négatifs) pour le remboursement d'un paiement,
 *  référençant la facture d'origine. Idempotent (un seul avoir par facture). */
export async function createCivicAvoir(paiementId: string): Promise<void> {
  const origine = await prisma.civicFacture.findUnique({ where: { paiementId } });
  if (!origine || origine.type !== "FACTURE") return;
  const already = await prisma.civicFacture.findFirst({
    where: { factureOrigineId: origine.id, type: "AVOIR" },
    select: { id: true },
  });
  if (already) return;
  const data = {
    organismeId: origine.organismeId,
    type: "AVOIR" as const,
    candidatId: origine.candidatId,
    factureOrigineId: origine.id,
    mention: origine.mention,
    clientNom: origine.clientNom,
    clientEmail: origine.clientEmail,
    clientAdresse: origine.clientAdresse,
    montantHtCents: -origine.montantHtCents,
    tvaPct: origine.tvaPct,
    tvaCents: -origine.tvaCents,
    montantTtcCents: -origine.montantTtcCents,
    methode: origine.methode,
    exonereTva: origine.exonereTva,
  };
  for (let i = 0; i < 3; i++) {
    try {
      await prisma.civicFacture.create({
        data: { ...data, numero: await nextFactureNumero(origine.organismeId ?? "", "AVOIR") },
      });
      return;
    } catch {
      if (i === 2) throw new Error("Numérotation avoir impossible.");
    }
  }
}

/** Crée la facture numérotée d'un paiement s'il n'en a pas déjà une (idempotent).
 *  TVA 0 % par défaut (formation exonérée art. 261-4-4° du CGI). */
export async function ensureCivicFactureFor(paiementId: string): Promise<void> {
  const existing = await prisma.civicFacture.findUnique({ where: { paiementId } });
  if (existing) return;
  const p = await prisma.civicPaiement.findUnique({
    where: { id: paiementId },
    select: {
      id: true,
      organismeId: true,
      candidatId: true,
      mention: true,
      montantCents: true,
      methode: true,
      statut: true,
      candidat: {
        select: { nom: true, prenom: true, email: true, adresse: true, ville: true, codePostal: true },
      },
    },
  });
  if (!p || p.statut !== "paye") return;
  const clientNom = `${p.candidat.prenom} ${p.candidat.nom}`.trim() || p.candidat.email;
  const clientAdresse =
    [p.candidat.adresse, [p.candidat.codePostal, p.candidat.ville].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join(", ") || null;
  const data = {
    organismeId: p.organismeId,
    candidatId: p.candidatId,
    paiementId: p.id,
    mention: p.mention,
    clientNom,
    clientEmail: p.candidat.email,
    clientAdresse,
    montantHtCents: p.montantCents,
    tvaPct: 0,
    tvaCents: 0,
    montantTtcCents: p.montantCents,
    methode: p.methode,
    exonereTva: true,
  };
  // Retry léger sur collision de numéro (concurrence faible).
  for (let i = 0; i < 3; i++) {
    try {
      await prisma.civicFacture.create({
        data: { ...data, numero: await nextFactureNumero(p.organismeId ?? "") },
      });
      return;
    } catch {
      if (i === 2) throw new Error("Numérotation facture impossible.");
    }
  }
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
      prismaBase.civicAssessment.upsert({
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
      prismaBase.civicProgress.upsert({
        where: { candidatId_moduleId: { candidatId, moduleId } },
        create: { candidatId, organismeId, moduleId, ...data },
        update: data,
      }),
    );
  }

  // Weaknesses & mock exams : remplacement complet (l'état envoyé fait foi).
  if (state.weaknesses) {
    ops.push(prismaBase.civicWeakness.deleteMany({ where: { candidatId } }));
    if (state.weaknesses.length) {
      ops.push(
        prismaBase.civicWeakness.createMany({
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
    ops.push(prismaBase.civicMockExam.deleteMany({ where: { candidatId } }));
    if (rows.length) ops.push(prismaBase.civicMockExam.createMany({ data: rows }));
  }

  await txWithOrg(organismeId ?? "BYPASS", ops);
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
  // La métadonnée peut contenir la mention en minuscule (clé vitrine) ou en
  // majuscule (valeur de l'enum déjà mappée par le checkout) → on normalise.
  const mention = MENTION_TO_DB[(meta.mention ?? "").toLowerCase()];
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

  // Provision du code d'accès + (ré)ouverture de l'accès pour 30 jours.
  // Le paiement (ré)active le compte et ajoute la mention payée à ses accès.
  let token = candidat.civicToken;
  if (!token) token = randomBytes(24).toString("base64url");
  await prisma.candidat.update({
    where: { id: candidat.id },
    data: {
      civicToken: token,
      civicAccessUntil: civicAccessUntil(),
      civicAccessStatut: "ACTIF",
      civicMentions: { push: mention },
    },
  });

  // Paiement (idempotent sur la session Stripe).
  const paiement = await prisma.civicPaiement.upsert({
    where: { stripeSessionId: args.sessionId },
    create: {
      organismeId,
      candidatId: candidat.id,
      mention,
      montantCents: args.amountTotal ?? 0,
      methode: "STRIPE",
      stripeSessionId: args.sessionId,
    },
    update: {},
  });

  // Facture numérotée (best-effort, idempotente sur le paiement).
  await ensureCivicFactureFor(paiement.id).catch(() => {});

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
    const connexionUrl = `${VITRINE_BASE}/cap-language-academy/examen-civique/connexion`;
    const html = emailShell({
      organisme: "CAP Compétences",
      representant: "L'équipe CAP Compétences",
      accent: "amber",
      body:
        emailHeading(`Merci pour votre inscription, ${esc(candidat.prenom || "")} 🎉`) +
        emailParagraph(
          `Bienvenue dans la <b>préparation à l'examen civique — ${esc(MENTION_NOM_LISIBLE[mention])}</b>. ` +
            `Votre paiement de <b>${esc(euros)} €</b> est confirmé (reçu disponible sur votre tableau de bord).`,
        ) +
        emailBox(
          `🔑 <b>Votre code d'accès</b> : <span style="font-family:monospace;font-size:16px;color:${NAVY};font-weight:bold">${esc(token)}</span><br>` +
            `<span style="color:${MUTED}">Conservez-le précieusement : il vous permet de retrouver votre progression sur tous vos appareils.</span>`,
          "amber",
        ) +
        emailParagraph(
          `Pour démarrer, connectez-vous avec votre e-mail (<b>${esc(candidat.email)}</b>) et ce code, onglet <b>« Code d'accès »</b>&nbsp;:`,
        ) +
        emailButton("Démarrer ma préparation →", connexionUrl) +
        emailSignoff("À bientôt,", "L'équipe CAP Compétences"),
    });
    await sendEmail({
      to: candidat.email,
      organismeId,
      subject: "🔓 Votre accès à la prépa examen civique est actif",
      html,
    });
  }

  return {
    candidatId: candidat.id,
    email: candidat.email,
    prenom: candidat.prenom,
    civicToken: token,
  };
}
