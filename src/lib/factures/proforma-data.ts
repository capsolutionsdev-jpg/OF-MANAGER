// src/lib/factures/proforma-data.ts
// Charge une session + ses inscriptions + le mapping des conventions, et calcule les
// CIBLES de proforma (via buildSessionProformas). Partagé par la route de génération
// PDF, le panneau de la page session et la vue « À facturer » de la comptabilité.
import { prisma } from "@/lib/prisma";
import { getTenantDb } from "@/lib/tenant";
import { buildSessionProformas, type ProformaCible } from "@/lib/factures/proforma";

export type SessionProformaResult = {
  session: {
    id: string;
    ref: string;
    formationTitre: string;
    dateDebut: Date;
    dateFin: Date;
    /** La formation est-elle terminée (date de fin passée) ? */
    terminee: boolean;
  };
  cibles: ProformaCible[];
};

export async function loadSessionProformas(sessionId: string): Promise<SessionProformaResult | null> {
  const db = await getTenantDb();
  const s = await db.session.findUnique({
    where: { id: sessionId },
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
  if (!s) return null;

  // Assujettissement TVA de l'organisme → exonération (art. 261-4-4° CGI) le cas échéant.
  const orgId = s.organismeId ?? null;
  const org = orgId
    ? await prisma.organisme.findUnique({ where: { id: orgId }, select: { assujettiTva: true } })
    : null;
  const assujetti = org?.assujettiTva ?? true;

  // Mapping inscription → convention (individuelle OU de groupe) rattachée à la session.
  const conventions = await db.convention.findMany({
    where: { sessionId },
    select: { id: true, reference: true, inscriptionId: true, inscriptions: { select: { id: true } } },
  });
  const convByInscription = new Map<string, { id: string; reference: string }>();
  for (const c of conventions) {
    if (c.inscriptionId) convByInscription.set(c.inscriptionId, { id: c.id, reference: c.reference });
    for (const i of c.inscriptions) convByInscription.set(i.id, { id: c.id, reference: c.reference });
  }

  const fmtD = (d: Date) => d.toLocaleDateString("fr-FR");
  const designation = `${s.formation.titre} (du ${fmtD(s.dateDebut)} au ${fmtD(s.dateFin)})`;

  const cibles = buildSessionProformas({
    designation,
    assujettiTva: assujetti,
    inscriptions: s.inscriptions.map((i) => {
      const conv = convByInscription.get(i.id) ?? null;
      return {
        inscriptionId: i.id,
        candidatNom: `${i.candidat.prenom} ${i.candidat.nom}`.trim(),
        candidatEmail: i.candidat.email,
        montant: i.montant != null ? Number(i.montant) : null,
        facturesTtc: i.factures.reduce((a, f) => a + Number(f.montantTTC), 0),
        entrepriseId: i.entrepriseId,
        entrepriseNom: i.entreprise?.raisonSociale ?? null,
        entrepriseSiret: i.entreprise?.siret ?? null,
        entrepriseEmail: i.entreprise?.contactEmail ?? null,
        conventionId: conv?.id ?? null,
        conventionRef: conv?.reference ?? null,
      };
    }),
  });

  return {
    session: {
      id: s.id,
      ref: s.formation.reference,
      formationTitre: s.formation.titre,
      dateDebut: s.dateDebut,
      dateFin: s.dateFin,
      terminee: s.dateFin.getTime() < Date.now(),
    },
    cibles,
  };
}
