import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import { exportResponse } from "@/lib/export";
import { buildSheet } from "@/lib/export-xlsx";
import type { CivicMention } from "@prisma/client";

export const runtime = "nodejs";

const STAFF = ["SUPERADMIN", "ADMIN", "RESPONSABLE_FORMATION"];

const MENTION_SHORT: Record<CivicMention, string> = {
  CSP: "CSP",
  CR: "CR",
  NATURALISATION: "NAT",
};
const STATUT_LABEL: Record<string, string> = {
  ACTIF: "Actif",
  SUSPENDU: "Suspendu",
  DESACTIVE: "Désactivé",
};
const fdate = (d: Date | null) => (d ? d.toLocaleDateString("fr-FR") : "");

// Export pédagogique des élèves civiques + résultats (CSV / Excel / PDF).
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || !STAFF.includes(session.user.role as string)) {
    return new Response("Non autorisé", { status: 401 });
  }
  const db = await getTenantDb();
  const now = Date.now();
  const rows = await db.candidat.findMany({
    where: { OR: [{ civicToken: { not: null } }, { civicMentions: { isEmpty: false } }] },
    select: {
      nom: true,
      prenom: true,
      email: true,
      telephone: true,
      createdAt: true,
      civicAccessStatut: true,
      civicAccessUntil: true,
      civicMentions: true,
      civicMockExams: { select: { score: true, successProbability: true, date: true }, orderBy: { date: "desc" } },
      civicProgress: { select: { completionRate: true, statut: true, timeSpent: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const data = rows.map((c) => {
    const prog = c.civicProgress;
    const progression = prog.length
      ? Math.round(prog.reduce((a, p) => a + p.completionRate, 0) / prog.length)
      : 0;
    const modulesFaits = prog.filter((p) => p.statut === "COMPLETED").length;
    const bestMock = c.civicMockExams.length ? Math.max(...c.civicMockExams.map((m) => m.score)) : null;
    const proba = c.civicMockExams.length ? c.civicMockExams[0].successProbability : null;
    const minutes = Math.round(prog.reduce((a, p) => a + p.timeSpent, 0) / 60);
    const expired = !!(c.civicAccessUntil && c.civicAccessUntil.getTime() < now);
    return {
      nom: c.nom,
      prenom: c.prenom,
      email: c.email,
      telephone: c.telephone ?? "",
      mentions: c.civicMentions.map((m) => MENTION_SHORT[m]).join(", "),
      statut: expired && c.civicAccessStatut === "ACTIF" ? "Expiré" : STATUT_LABEL[c.civicAccessStatut] ?? c.civicAccessStatut,
      finAcces: fdate(c.civicAccessUntil),
      progression,
      modulesFaits,
      bestMock,
      proba,
      minutes,
      createdAt: fdate(c.createdAt),
    };
  });

  const sheet = buildSheet("Élèves civiques", data, [
    { header: "Nom", value: (r) => r.nom },
    { header: "Prénom", value: (r) => r.prenom },
    { header: "E-mail", value: (r) => r.email },
    { header: "Téléphone", value: (r) => r.telephone },
    { header: "Formation(s)", value: (r) => r.mentions },
    { header: "Statut", value: (r) => r.statut },
    { header: "Fin d'accès", value: (r) => r.finAcces },
    { header: "Progression (%)", value: (r) => r.progression },
    { header: "Modules terminés", value: (r) => r.modulesFaits },
    { header: "Meilleur examen blanc (%)", value: (r) => (r.bestMock === null ? "" : r.bestMock) },
    { header: "Probabilité réussite (%)", value: (r) => (r.proba === null ? "" : r.proba) },
    { header: "Temps de travail (min)", value: (r) => r.minutes },
    { header: "Créé le", value: (r) => r.createdAt },
  ]);

  return exportResponse({
    req,
    basename: "eleves-civiques",
    title: "Export pédagogique — Préparation examen civique",
    sheets: [sheet],
  });
}
