"use server";

import { revalidatePath } from "next/cache";
import { Prisma, FactureEditeurStatut } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/superadmin-guard";
import { calcMontants, overageLignes, sirenFromSiret, type LigneFacture } from "@/lib/factures/editeur";
import { montantNet } from "@/lib/contrats/prestation";
import { PLANS, planForOrg, OVERAGE_EMAIL_EUR, OVERAGE_INSCRIPTION_EUR, type FormuleKey } from "@/lib/plans";
import { getOrgUsage } from "@/lib/usage";
import { getEmetteur, partieFromOrg, factureDataFrom } from "@/lib/factures/editeur-data";
import { renderFacturx } from "@/lib/factures/editeur-render";
import { getPdpAdapter } from "@/lib/factures/pdp";
import { nextRef, maxSuffix } from "@/lib/numerotation";

export type FactureEditeurState = { ok?: boolean; error?: string; id?: string };

const FACTURE_STATUTS = new Set(Object.values(FactureEditeurStatut) as string[]);

// La numérotation des factures ÉDITEUR (`F-AAAA-NNNN`) est GLOBALE (un seul
// émetteur = l'éditeur du SaaS), pas par tenant. On loge donc son compteur sous un
// scope constant dans `NumeroSequence` (dont `organismeId` est une simple String,
// sans FK) pour réutiliser l'incrément atomique de `nextRef`.
const EDITEUR_SEQ_SCOPE = "__editeur__";

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

  // Garde de conformité (PC-JUR-02) : une facture officielle exige un émetteur
  // immatriculé. On vérifie la source RÉELLE de la facture — getEmetteur() (Organisme
  // éditeur en base, VITRINE_ORGANISME_ID) — et non les mentions légales de la vitrine.
  const emetteur = await getEmetteur();
  const emetteurManques: string[] = [];
  if (!sirenFromSiret(emetteur.siret ?? "")) emetteurManques.push("SIRET");
  if (!emetteur.tva?.trim()) emetteurManques.push("n° de TVA");
  if (emetteurManques.length > 0) {
    return {
      error: `Émission bloquée : l'identité de l'émetteur est incomplète (${emetteurManques.join(
        ", ",
      )}). Complétez le SIRET / n° de TVA de l'organisme éditeur avant d'émettre une facture.`,
    };
  }

  const now = new Date();
  const annee = now.getFullYear();
  const echeance = new Date(now.getTime() + 30 * 86_400_000);

  // Numérotation ATOMIQUE (BACK-01) : compteur éditeur global `F-AAAA` via `nextRef`
  // (remplace `count()+1`, qui produisait des doublons en émission concurrente). La
  // garde `numero: null` de l'updateMany empêche toute double-émission d'une même
  // facture ; en cas de collision résiduelle sur la contrainte unique `numero`
  // (P2002), on régénère un numéro et on réessaie.
  for (let tentative = 0; tentative < 5; tentative++) {
    const numero = await nextRef(EDITEUR_SEQ_SCOPE, "F", async () => {
      const rows = await prisma.factureEditeur.findMany({
        where: { numero: { startsWith: `F-${annee}-` } },
        select: { numero: true },
      });
      return maxSuffix(rows.map((r) => r.numero).filter((n): n is string => !!n));
    });
    try {
      const res = await prisma.factureEditeur.updateMany({
        where: { id, numero: null },
        data: {
          numero,
          statut: FactureEditeurStatut.EMISE,
          dateEmission: now,
          dateEcheance: echeance,
        },
      });
      if (res.count === 0) return { error: "Facture déjà émise." };
      revalidatePath(`/console/${f.organismeId}`);
      return { ok: true, id };
    } catch (e) {
      // P2002 = numéro déjà pris (course résiduelle) → régénérer et réessayer.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
        continue;
      throw e;
    }
  }
  return { error: "Numérotation impossible, réessayez." };
}

/**
 * Transmet la facture ÉMISE via la PDP (obligatoire dès 2026 : plus d'envoi
 * direct). Construit le Factur-X, l'envoie via l'adaptateur PDP configuré, puis
 * passe la facture en DEPOSEE + horodate + trace en audit. Dégrade proprement si
 * aucune PDP n'est configurée (env PDP_PROVIDER absente).
 */
export async function transmettreFactureEditeur(id: string): Promise<FactureEditeurState> {
  await requireSuperAdmin();
  const f = await prisma.factureEditeur.findUnique({ where: { id }, include: { organisme: true } });
  if (!f) return { error: "Facture introuvable." };
  if (!f.numero || f.statut === FactureEditeurStatut.BROUILLON) {
    return { error: "Émettez la facture avant de la transmettre." };
  }

  const adapter = getPdpAdapter();
  if (!adapter.configured) {
    return { error: "Aucune PDP configurée (définissez PDP_PROVIDER + PDP_API_URL + PDP_API_KEY)." };
  }

  const facturx = await renderFacturx(
    { emetteur: await getEmetteur(), client: partieFromOrg(f.organisme), facture: factureDataFrom(f) },
    { numero: f.numero, date: f.dateEmission ?? new Date() },
  );
  const res = await adapter.transmit({
    numero: f.numero,
    clientSiren: f.clientSiren,
    montantTTC: Number(f.montantTTC),
    facturx,
  });
  if (!res.ok) return { error: res.error ?? "Échec de la transmission PDP." };

  await prisma.factureEditeur.update({
    where: { id },
    data: { statut: FactureEditeurStatut.DEPOSEE, pdpTransmisAt: new Date() },
  });
  await prisma.auditLog.create({
    data: {
      organismeId: f.organismeId,
      action: "FACTURE_TRANSMISE_PDP",
      entityType: "FactureEditeur",
      entityId: id,
      changesJson: { provider: adapter.name, reference: res.reference ?? null, numero: f.numero },
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
