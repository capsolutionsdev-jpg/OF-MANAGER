import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import { orgConfigFor } from "@/lib/org-identity";
import { buildFec, serializeFec, fecFilename } from "@/lib/compta/fec";

export const runtime = "nodejs";
const STAFF = ["SUPERADMIN", "ADMIN", "RESPONSABLE_FORMATION"];

/**
 * Export FEC d'un exercice : /tresorerie/export/fec?year=2026
 * Réservé au personnel comptable, cloisonné par organisme.
 */
export async function GET(req: Request) {
  const session = await auth();
  const organismeId = session?.user?.organismeId;
  if (!session?.user || !STAFF.includes(session.user.role as string)) {
    return new Response("Non autorisé", { status: 401 });
  }

  const url = new URL(req.url);
  const now = new Date();
  const year = Number(url.searchParams.get("year")) || now.getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);

  const db = await getTenantDb();
  const [facturesRaw, paiementsRaw, chargesRaw, org] = await Promise.all([
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
    orgConfigFor(organismeId),
  ]);

  const nomCandidat = (c: { nom: string; prenom: string | null } | null | undefined) =>
    c ? `${c.prenom ?? ""} ${c.nom}`.trim() : null;

  const factures = facturesRaw.map((f) => {
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

  const paiements = paiementsRaw.map((p) => {
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

  const charges = chargesRaw.map((c) => ({
    date: c.date,
    montant: c.montantCents / 100,
    categorie: c.categorie,
    categorieAutre: c.categorieAutre,
    libelle: c.libelle,
    numeroPiece: c.numeroPiece,
  }));

  const { rows } = buildFec({ factures, paiements, charges });
  const content = serializeFec(rows);
  const filename = fecFilename(org.siret, year);

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
