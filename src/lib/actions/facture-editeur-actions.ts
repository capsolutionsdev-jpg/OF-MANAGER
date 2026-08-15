"use server";

import { revalidatePath } from "next/cache";
import { Prisma, FactureEditeurStatut } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/superadmin-guard";
import { calcMontants, overageLignes, sirenFromSiret, type LigneFacture } from "@/lib/factures/editeur";
import { montantNet } from "@/lib/contrats/prestation";
import { PLANS, planForOrg, OVERAGE_EMAIL_EUR, OVERAGE_INSCRIPTION_EUR, type FormuleKey } from "@/lib/plans";
import { getOrgUsage } from "@/lib/usage";

export type FactureEditeurState = { ok?: boolean; error?: string; id?: string };

const FACTURE_STATUTS = new Set(Object.values(FactureEditeurStatut) as string[]);

/**
 * Génère une facture mensuelle (BROUILLON) pour un client : ligne d'abonnement
 * issue du dernier contrat SIGNÉ (montant net) ou, à défaut, du prix de la
 * formule. TVA 20 %. Le n° séquentiel n'est attribué qu'à l'émission.
 */
export async function genererFactureMensuelle(organismeId: string): Promise<FactureEditeurState> {
  await requireSuperAdmin();
  const org = await prisma.organisme.findUnique({ where: { id: organismeId } });
  if (!org) return { error: "Organisme introuvable." };

  const contrat = await prisma.contratPrestation.findFirst({
    where: { organismeId, statut: "SIGNE" },
    orderBy: { signedAt: "desc" },
  });

  let libelleFormule: string;
  let montantAbo: number;
  if (contrat) {
    libelleFormule = PLANS[contrat.formule as FormuleKey]?.name ?? contrat.formule;
    montantAbo = montantNet(Number(contrat.montantMensuel), contrat.remisePct);
  } else {
    const plan = planForOrg(org.formule, org.fonctionnalites);
    libelleFormule = plan.name;
    montantAbo = plan.price;
  }

  const now = new Date();
  const periodeDebut = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodeFin = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const moisLabel = periodeDebut.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  const lignes: LigneFacture[] = [
    {
      libelle: `Abonnement OF Manager — ${libelleFormule} (${moisLabel})`,
      quantite: 1,
      prixUnitaire: montantAbo,
      montantHT: montantAbo,
    },
  ];

  // Facturation à l'usage : dépassement de quota du mois (le levier « automatismes »).
  const usage = await getOrgUsage(organismeId, org.formule);
  lignes.push(...overageLignes(usage, { email: OVERAGE_EMAIL_EUR, inscription: OVERAGE_INSCRIPTION_EUR }));

  const tauxTva = 20;
  const { montantHT, montantTva, montantTTC } = calcMontants(lignes, tauxTva);

  const facture = await prisma.factureEditeur.create({
    data: {
      organismeId,
      contratId: contrat?.id ?? null,
      statut: FactureEditeurStatut.BROUILLON,
      periodeDebut,
      periodeFin,
      montantHT,
      tauxTva,
      montantTva,
      montantTTC,
      lignes: lignes as unknown as Prisma.InputJsonValue,
      clientSiren: sirenFromSiret(org.siret),
    },
    select: { id: true },
  });

  revalidatePath(`/console/${organismeId}`);
  return { ok: true, id: facture.id };
}

/** Émet la facture : attribue le n° séquentiel (F-AAAA-NNNN), la date et l'échéance. */
export async function emettreFactureEditeur(id: string): Promise<FactureEditeurState> {
  await requireSuperAdmin();
  const f = await prisma.factureEditeur.findUnique({
    where: { id },
    select: { organismeId: true, numero: true },
  });
  if (!f) return { error: "Facture introuvable." };
  if (f.numero) return { error: "Facture déjà émise." };

  const now = new Date();
  const annee = now.getFullYear();
  // Séquence sans trou : nombre de factures déjà émises cette année + 1.
  const dejaEmises = await prisma.factureEditeur.count({ where: { numero: { startsWith: `F-${annee}-` } } });
  const numero = `F-${annee}-${String(dejaEmises + 1).padStart(4, "0")}`;
  const echeance = new Date(now.getTime() + 30 * 86_400_000);

  await prisma.factureEditeur.update({
    where: { id },
    data: {
      numero,
      statut: FactureEditeurStatut.EMISE,
      dateEmission: now,
      dateEcheance: echeance,
    },
  });

  revalidatePath(`/console/${f.organismeId}`);
  return { ok: true, id };
}

/** Fait avancer la facture dans son cycle de vie (Déposée / Encaissée / Rejetée / Refusée). */
export async function setFactureEditeurStatut(id: string, statut: string): Promise<FactureEditeurState> {
  await requireSuperAdmin();
  if (!FACTURE_STATUTS.has(statut)) return { error: "Statut invalide." };
  const f = await prisma.factureEditeur.findUnique({ where: { id }, select: { organismeId: true } });
  if (!f) return { error: "Facture introuvable." };

  await prisma.factureEditeur.update({
    where: { id },
    data: {
      statut: statut as FactureEditeurStatut,
      ...(statut === "ENCAISSEE" ? { paidAt: new Date() } : {}),
      ...(statut === "DEPOSEE" ? { pdpTransmisAt: new Date() } : {}),
    },
  });

  revalidatePath(`/console/${f.organismeId}`);
  return { ok: true, id };
}

/** Supprime une facture — uniquement tant qu'elle est en BROUILLON (avant n°). */
export async function deleteFactureEditeur(id: string, organismeId: string): Promise<void> {
  await requireSuperAdmin();
  const f = await prisma.factureEditeur.findUnique({ where: { id }, select: { statut: true } });
  if (f && f.statut !== FactureEditeurStatut.BROUILLON) return;
  await prisma.factureEditeur.delete({ where: { id } });
  revalidatePath(`/console/${organismeId}`);
}
