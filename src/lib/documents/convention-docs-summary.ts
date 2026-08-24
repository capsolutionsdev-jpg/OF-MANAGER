import "server-only";
import type { TenantDb } from "@/lib/tenant";
import { ETAPE_CONVENTION, ETAPE_ENTREE } from "@/lib/documents/publish";

// Récapitulatif des documents PUBLIÉS (DocumentGenere) par convention de groupe,
// pour la fiche client-pro : compteurs par étape + satisfactions entreprise
// (déposées ou en attente). Réutilise les constantes d'étapes de publish.ts.

const CONV = new Set<string>(ETAPE_CONVENTION as string[]);
const ENTREE = new Set<string>(ETAPE_ENTREE as string[]);

export type SatisfactionDoc = { id: string; fileUrl: string | null; retournee: boolean; nom: string };
export type ConventionDocsSummary = {
  counts: { convention: number; entree: number; fin: number; total: number };
  satisfactions: SatisfactionDoc[];
};

function emptySummary(): ConventionDocsSummary {
  return { counts: { convention: 0, entree: 0, fin: 0, total: 0 }, satisfactions: [] };
}

/** Résumé des documents publiés par convention (clé = conventionId). */
export async function getConventionsDocsSummary(
  db: TenantDb,
  conventionIds: string[],
): Promise<Map<string, ConventionDocsSummary>> {
  const out = new Map<string, ConventionDocsSummary>();
  for (const id of conventionIds) out.set(id, emptySummary());
  if (conventionIds.length === 0) return out;

  const docs = await db.documentGenere.findMany({
    where: { inscription: { conventionId: { in: conventionIds } } },
    select: {
      id: true,
      type: true,
      fileUrl: true,
      variablesJson: true,
      inscription: { select: { conventionId: true, candidat: { select: { nom: true, prenom: true } } } },
    },
  });

  for (const d of docs) {
    const cid = d.inscription?.conventionId;
    if (!cid) continue;
    const s = out.get(cid);
    if (!s) continue;
    s.counts.total++;
    if (CONV.has(d.type)) s.counts.convention++;
    else if (ENTREE.has(d.type)) s.counts.entree++;
    else s.counts.fin++;

    if (d.type === "SATISFACTION_ENTREPRISE") {
      const v = d.variablesJson;
      const retournee = !!(v && typeof v === "object" && !Array.isArray(v) && (v as Record<string, unknown>).retourne === true);
      const c = d.inscription?.candidat;
      s.satisfactions.push({ id: d.id, fileUrl: d.fileUrl, retournee, nom: `${c?.prenom ?? ""} ${c?.nom ?? ""}`.trim() });
    }
  }
  return out;
}
