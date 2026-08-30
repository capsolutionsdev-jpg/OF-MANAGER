// src/lib/factures/a-facturer.ts
// Sessions TERMINÉES avec des participants pas encore facturés (aucune facture émise) —
// alimente la carte « À facturer » de la comptabilité, qui renvoie vers la page session
// (où se génèrent les proformas). Reste dû calculé via montantDu (règle A06-022).
import { getTenantDb } from "@/lib/tenant";
import { montantDu } from "@/lib/comptabilite/montant-du";

export type SessionAFacturer = {
  id: string;
  formationTitre: string;
  dateFin: Date;
  nbAFacturer: number;
  totalEstime: number;
};

export async function loadSessionsAFacturer(limit = 50): Promise<SessionAFacturer[]> {
  const db = await getTenantDb();
  const sessions = await db.session.findMany({
    where: { dateFin: { lt: new Date() } },
    orderBy: { dateFin: "desc" },
    take: 200,
    select: {
      id: true,
      dateFin: true,
      formation: { select: { titre: true } },
      inscriptions: {
        where: { statut: { not: "ANNULEE" } },
        select: { montant: true, factures: { select: { montantTTC: true } } },
      },
    },
  });

  const out: SessionAFacturer[] = [];
  for (const s of sessions) {
    let nb = 0;
    let total = 0;
    for (const i of s.inscriptions) {
      // « À facturer » = aucune facture encore émise pour cette inscription.
      if (i.factures.length > 0) continue;
      nb += 1;
      total += montantDu(i.montant != null ? Number(i.montant) : null, 0);
    }
    if (nb > 0) {
      out.push({ id: s.id, formationTitre: s.formation.titre, dateFin: s.dateFin, nbAFacturer: nb, totalEstime: total });
    }
  }
  return out.slice(0, limit);
}
