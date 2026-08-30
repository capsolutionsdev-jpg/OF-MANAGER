import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { exportRateLimited } from "@/lib/security/export-guard";
import { getTenantDb } from "@/lib/tenant";
import { toCsv } from "@/lib/export-csv";
import { buildPreFacture } from "@/lib/factures/pre-facture";
import { montantDu } from "@/lib/comptabilite/montant-du";

export const runtime = "nodejs";
const STAFF = ["SUPERADMIN", "ADMIN", "RESPONSABLE_FORMATION"];

/**
 * Export CSV des factures PRÉ-FORMATÉES d'une session — une ligne par participant
 * (client, désignation, HT/TVA/TTC, exonération), à importer dans le logiciel de
 * facturation de l'OF. OFMANAGER pré-remplit, l'OF émet chez lui. (A06-003)
 *   GET /sessions/{id}/pre-facture
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || !STAFF.includes(session.user.role as string)) {
    return new Response("Non autorisé", { status: 401 });
  }
  const limited = exportRateLimited(session.user.id);
  if (limited) return limited;

  const { id } = await params;
  const db = await getTenantDb();
  const s = await db.session.findUnique({
    where: { id },
    include: {
      formation: { select: { titre: true, reference: true } },
      inscriptions: {
        where: { statut: { not: "ANNULEE" } },
        include: {
          candidat: { select: { nom: true, prenom: true, email: true } },
          entreprise: { select: { raisonSociale: true, siret: true, contactEmail: true } },
          factures: { select: { montantTTC: true } },
        },
      },
    },
  });
  if (!s) return new Response("Session introuvable", { status: 404 });

  // Assujettissement TVA de l'organisme → force l'exonération (art. 261-4-4° CGI).
  const orgId = session.user.organismeId ?? null;
  const org = orgId
    ? await prisma.organisme.findUnique({ where: { id: orgId }, select: { assujettiTva: true } })
    : null;
  const assujetti = org?.assujettiTva ?? true;

  const fmtD = (d: Date) => d.toLocaleDateString("fr-FR");
  const designation = `${s.formation.titre} (du ${fmtD(s.dateDebut)} au ${fmtD(s.dateFin)})`;

  const preFactures = s.inscriptions.map((i) => {
    const clientNom = i.entreprise?.raisonSociale ?? `${i.candidat.prenom} ${i.candidat.nom}`.trim();
    const facturesTtc = i.factures.reduce((a, f) => a + Number(f.montantTTC), 0);
    const montant = montantDu(i.montant != null ? Number(i.montant) : null, facturesTtc);
    return buildPreFacture({
      clientNom,
      clientSiret: i.entreprise?.siret ?? null,
      clientEmail: i.entreprise?.contactEmail ?? i.candidat.email,
      designation,
      montantHT: montant,
      assujettiTva: assujetti,
    });
  });

  const csv = toCsv(preFactures, [
    { header: "Client", value: (r) => r.clientNom },
    { header: "SIRET", value: (r) => r.clientSiret },
    { header: "Email", value: (r) => r.clientEmail },
    { header: "Désignation", value: (r) => r.designation },
    { header: "Quantité", value: (r) => r.quantite },
    { header: "PU HT (€)", value: (r) => r.prixUnitaire.toFixed(2) },
    { header: "Montant HT (€)", value: (r) => r.montantHT.toFixed(2) },
    { header: "Taux TVA (%)", value: (r) => r.tauxTva },
    { header: "Montant TVA (€)", value: (r) => r.montantTva.toFixed(2) },
    { header: "Montant TTC (€)", value: (r) => r.montantTTC.toFixed(2) },
    { header: "Mention TVA", value: (r) => r.mentionTva },
  ]);

  const filename = `pre-factures-${s.formation.reference}-${s.dateDebut
    .toISOString()
    .slice(0, 10)}.csv`.replace(/[^\w.\-]+/g, "_");

  // BOM UTF-8 → ouverture directe correcte dans Excel FR.
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
