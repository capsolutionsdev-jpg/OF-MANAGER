import { prisma } from "@/lib/prisma";

// Seuil d'affichage : on ne publie un taux de réussite que s'il repose sur un
// nombre minimal de candidats évalués (évite un « 100 % sur 1 candidat »
// trompeur ; cohérent avec l'exigence Qualiopi de fiabilité des indicateurs).
export const MIN_EVALUES = 3;

export type TauxReussite = { taux: number; nbEvalues: number };

/**
 * Taux de réussite par formation (certifiés / présentés à l'examen).
 * - « présentés » = inscriptions dont le résultat est CERTIFIE ou AJOURNE
 *   (on exclut NON_EVALUE = pas encore passé, et ABANDON = n'a pas composé).
 * - Renvoie une entrée UNIQUEMENT si nbEvalues >= MIN_EVALUES.
 *
 * `formationId` optionnel = ne calcule que pour cette formation (fiche unique).
 */
export async function getTauxReussite(opts: {
  organismeId?: string;
  formationId?: string;
}): Promise<Map<string, TauxReussite>> {
  const { organismeId, formationId } = opts;

  const rows = await prisma.inscription.findMany({
    where: {
      resultatCertification: { in: ["CERTIFIE", "AJOURNE"] },
      session: {
        ...(formationId ? { formationId } : {}),
        ...(organismeId ? { formation: { organismeId } } : {}),
      },
    },
    select: {
      resultatCertification: true,
      session: { select: { formationId: true } },
    },
  });

  const agg = new Map<string, { certifies: number; presentes: number }>();
  for (const r of rows) {
    const fid = r.session.formationId;
    const a = agg.get(fid) ?? { certifies: 0, presentes: 0 };
    a.presentes += 1;
    if (r.resultatCertification === "CERTIFIE") a.certifies += 1;
    agg.set(fid, a);
  }

  const out = new Map<string, TauxReussite>();
  for (const [fid, a] of agg) {
    if (a.presentes >= MIN_EVALUES) {
      out.set(fid, {
        taux: Math.round((a.certifies / a.presentes) * 100),
        nbEvalues: a.presentes,
      });
    }
  }
  return out;
}
