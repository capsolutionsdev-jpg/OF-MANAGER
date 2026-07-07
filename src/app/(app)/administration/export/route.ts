import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import { getCurrentOrganisme } from "@/lib/org";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Réversibilité (JUR-2) : export COMPLET des données de l'organisme courant,
 * au format JSON ouvert. Réservé à l'ADMIN de l'OF, scopé au tenant via
 * getTenantDb (aucune donnée d'un autre organisme). Aligné sur la clause de
 * réversibilité du contrat SaaS (legal/clause-reversibilite.md).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return new Response("Réservé à l'administrateur de l'organisme.", { status: 403 });
  }

  const db = await getTenantDb();

  // Entités cœur du tenant. getTenantDb filtre automatiquement par organismeId.
  const [
    candidats, entreprises, formateurs, formations, sessions,
    inscriptions, devis, factures, civicFactures, paiements,
  ] = await Promise.all([
    db.candidat.findMany(),
    db.entreprise.findMany(),
    db.formateur.findMany(),
    db.formation.findMany(),
    db.session.findMany({ include: { formateurs: { select: { id: true } } } }),
    db.inscription.findMany(),
    db.devis.findMany(),
    db.facture.findMany(),
    db.civicFacture.findMany(),
    db.paiement.findMany(),
  ]);

  let organisme: unknown = null;
  try {
    organisme = await getCurrentOrganisme();
  } catch {
    /* profil organisme indisponible : export des données métier quand même */
  }

  const bundle = {
    _meta: {
      format: "OFManager-export-tenant",
      version: 1,
      genereLe: new Date().toISOString(),
      organismeId: session.user.organismeId,
      note:
        "Export complet des données de votre organisme (réversibilité). " +
        "Formats ouverts : JSON. Les documents PDF restent téléchargeables depuis l'application.",
    },
    organisme,
    candidats,
    entreprises,
    formateurs,
    formations,
    sessions,
    inscriptions,
    devis,
    factures,
    civicFactures,
    paiements,
  };

  const json = JSON.stringify(bundle, null, 2);
  const date = new Date().toISOString().slice(0, 10);
  return new Response(json, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="export-donnees-${date}.json"`,
    },
  });
}
