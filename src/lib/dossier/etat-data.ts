import "server-only";
import { getTenantDb, type TenantDb } from "@/lib/tenant";
import { mergeDossier, dossierProgress, type PieceDeposee, type PieceEtat, type DossierProgress } from "@/lib/dossier/etat";

// État des dossiers administratifs, bâti sur l'existant (PieceJointe du candidat).
// Scopé côté appelant (entreprise / candidat connecté).

export type DossierInscription = {
  inscriptionId: string;
  candidat: string;
  formation: string;
  etats: PieceEtat[];
  progress: DossierProgress;
};

type InscriptionLite = {
  id: string;
  candidatId: string;
  candidat: { nom: string; prenom: string };
  session: { formation: { titre: string; piecesAttendues: unknown } | null } | null;
};

async function assemble(db: TenantDb, inscriptions: InscriptionLite[]): Promise<DossierInscription[]> {
  const candidatIds = [...new Set(inscriptions.map((i) => i.candidatId))];
  const pieces = candidatIds.length
    ? await db.pieceJointe.findMany({
        where: { candidatId: { in: candidatIds } },
        select: { id: true, candidatId: true, label: true, url: true, statut: true, motifRefus: true },
        orderBy: { createdAt: "desc" },
      })
    : [];
  // Dernière pièce par (candidatId, label) — l'ordre desc garde la plus récente.
  const derniere = new Map<string, (typeof pieces)[number]>();
  for (const p of pieces) {
    const k = `${p.candidatId}|${p.label}`;
    if (!derniere.has(k)) derniere.set(k, p);
  }

  return inscriptions.map((i) => {
    const attendues = (i.session?.formation?.piecesAttendues as string[] | null) ?? [];
    const deposees: PieceDeposee[] = attendues
      .map((label) => derniere.get(`${i.candidatId}|${label}`))
      .filter((p): p is (typeof pieces)[number] => Boolean(p))
      .map((p) => ({ id: p.id, label: p.label, url: p.url, statut: p.statut as PieceDeposee["statut"], motifRefus: p.motifRefus }));
    const etats = mergeDossier(attendues, deposees);
    return {
      inscriptionId: i.id,
      candidat: `${i.candidat.prenom} ${i.candidat.nom}`.trim(),
      formation: i.session?.formation?.titre ?? "",
      etats,
      progress: dossierProgress(etats),
    };
  });
}

const SELECT = {
  id: true,
  candidatId: true,
  candidat: { select: { nom: true, prenom: true } },
  session: { select: { formation: { select: { titre: true, piecesAttendues: true } } } },
} as const;

/** Dossiers des salariés d'une entreprise — UNIQUEMENT après convention signée. */
export async function getEntrepriseDossiers(entrepriseId: string): Promise<DossierInscription[]> {
  const db = await getTenantDb();
  const inscriptions = await db.inscription.findMany({
    where: { entrepriseId, statut: { not: "ANNULEE" }, conventionGroupe: { signatureStatut: "SIGNEE" } },
    select: SELECT,
    orderBy: { createdAt: "desc" },
  });
  return assemble(db, inscriptions);
}

/** Dossiers du candidat connecté — ses inscriptions actives. */
export async function getCandidatCompteDossiers(candidatId: string): Promise<DossierInscription[]> {
  const db = await getTenantDb();
  const inscriptions = await db.inscription.findMany({
    where: { candidatId, statut: { not: "ANNULEE" } },
    select: SELECT,
    orderBy: { createdAt: "desc" },
  });
  return assemble(db, inscriptions);
}
