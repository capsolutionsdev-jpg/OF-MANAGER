import type { getTenantDb } from "@/lib/tenant";
import type { FecFacture, FecPaiement, FecCharge } from "@/lib/compta/fec";

type Db = Awaited<ReturnType<typeof getTenantDb>>;

const nomCandidat = (c: { nom: string; prenom: string | null } | null | undefined) =>
  c ? `${c.prenom ?? ""} ${c.nom}`.trim() : null;

/**
 * Rassemble les écritures d'un exercice (factures, encaissements, charges) au
 * format attendu par `buildFec`. Partagé par l'export FEC et l'export CSV
 * multi-logiciels, pour garantir des écritures identiques.
 */
export async function collectFecInput(
  db: Db,
  year: number,
): Promise<{ factures: FecFacture[]; paiements: FecPaiement[]; charges: FecCharge[] }> {
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);

  const [facturesRaw, paiementsRaw, chargesRaw] = await Promise.all([
    db.facture.findMany({
      where: { dateEmission: { gte: start, lt: end }, statut: { in: ["ENVOYEE", "PAYEE", "PARTIELLE", "AVOIR"] } },
      select: {
        reference: true, dateEmission: true, montantHT: true, montantTTC: true, statut: true,
        entreprise: { select: { id: true, raisonSociale: true } },
        inscription: { select: { candidat: { select: { id: true, nom: true, prenom: true } } } },
      },
    }),
    db.paiement.findMany({
      where: { date: { gte: start, lt: end } },
      select: {
        date: true, montant: true, mode: true, reference: true,
        facture: { select: { reference: true, entreprise: { select: { id: true, raisonSociale: true } } } },
        inscription: { select: { candidat: { select: { id: true, nom: true, prenom: true } } } },
      },
    }),
    db.depenseCentre.findMany({
      where: { date: { gte: start, lt: end } },
      select: { date: true, categorie: true, categorieAutre: true, libelle: true, montantCents: true, numeroPiece: true },
    }),
  ]);

  const factures: FecFacture[] = facturesRaw.map((f) => {
    const ent = f.entreprise;
    const cand = f.inscription?.candidat;
    return {
      reference: f.reference,
      dateEmission: f.dateEmission,
      montantHT: Number(f.montantHT),
      montantTTC: Number(f.montantTTC),
      statut: f.statut,
      clientId: ent?.id ?? cand?.id ?? null,
      clientNom: ent?.raisonSociale ?? nomCandidat(cand),
    };
  });

  const paiements: FecPaiement[] = paiementsRaw.map((p) => {
    const ent = p.facture?.entreprise;
    const cand = p.inscription?.candidat;
    return {
      date: p.date,
      montant: Number(p.montant),
      mode: p.mode,
      reference: p.reference,
      factureRef: p.facture?.reference ?? null,
      clientId: ent?.id ?? cand?.id ?? null,
      clientNom: ent?.raisonSociale ?? nomCandidat(cand),
    };
  });

  const charges: FecCharge[] = chargesRaw.map((c) => ({
    date: c.date,
    montant: c.montantCents / 100,
    categorie: c.categorie,
    categorieAutre: c.categorieAutre,
    libelle: c.libelle,
    numeroPiece: c.numeroPiece,
  }));

  return { factures, paiements, charges };
}
