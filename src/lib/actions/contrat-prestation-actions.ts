"use server";

import { revalidatePath } from "next/cache";
import { FormuleAbonnement, EngagementPrestation, ContratPrestationStatut } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/superadmin-guard";
import { getResolvedPlans } from "@/lib/pricing";
import { FORMULE_KEYS, type FormuleKey } from "@/lib/plans";
import { fraisMiseEnService } from "@/lib/options";
import { appliquerPionniers, type PionnierVariante } from "@/lib/offre-lancement";
import { generateToken, appBaseUrl } from "@/lib/token";
import { sendEmail } from "@/lib/email";

export type ContratPrestationState = { ok?: boolean; error?: string; id?: string };

/** Crée un contrat de prestation (BROUILLON) pour un organisme client. SUPERADMIN. */
export async function createContratPrestation(
  _prev: ContratPrestationState | undefined,
  formData: FormData,
): Promise<ContratPrestationState> {
  await requireSuperAdmin();

  const organismeId = String(formData.get("organismeId") ?? "");
  const formuleRaw = String(formData.get("formule") ?? "");
  if (!organismeId) return { error: "Organisme manquant." };
  if (!FORMULE_KEYS.has(formuleRaw)) return { error: "Formule invalide." };

  const org = await prisma.organisme.findUnique({ where: { id: organismeId }, select: { id: true } });
  if (!org) return { error: "Organisme introuvable." };

  const engagement =
    String(formData.get("engagement") ?? "MENSUEL") === "ANNUEL" ? "ANNUEL" : "MENSUEL";

  // Montant mensuel : saisi, sinon prix de repère (édité) de la formule.
  const { plans } = await getResolvedPlans();
  const prixDefaut = plans[formuleRaw as keyof typeof plans]?.price ?? 0;
  const montantSaisi = Number(String(formData.get("montantMensuel") ?? "").replace(",", "."));
  const montantMensuel = Number.isFinite(montantSaisi) && montantSaisi > 0 ? montantSaisi : prixDefaut;

  const remiseSaisie = Number(String(formData.get("remisePct") ?? "0"));
  const remiseSaisiePct = Number.isFinite(remiseSaisie) ? Math.min(100, Math.max(0, Math.floor(remiseSaisie))) : 0;

  const parseKeys = (name: string, max: number) =>
    String(formData.get(name) ?? "")
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, max);
  const options = parseKeys("options", 20);
  const packs = parseKeys("packs", 10);

  const dateDebutRaw = String(formData.get("dateDebut") ?? "").trim();
  const dateDebut = dateDebutRaw ? new Date(dateDebutRaw) : null;

  // Offre de lancement « Pionniers » : impose la remise + l'engagement, offre les frais.
  const variRaw = String(formData.get("pionnierVariante") ?? "").trim();
  const isPionnier = variRaw === "MENSUEL_6M" || variRaw === "ANNUEL_12M_PREPAYE";
  let engagementFinal: "MENSUEL" | "ANNUEL" = engagement;
  let remisePct = remiseSaisiePct;
  let frais: number;
  let prixGele = false;
  if (isPionnier) {
    const ap = appliquerPionniers(variRaw as PionnierVariante);
    engagementFinal = ap.engagement;
    remisePct = ap.remisePct;
    frais = 0; // mise en service offerte
    prixGele = ap.prixGele;
  } else {
    const fraisSaisi = Number(String(formData.get("fraisMiseEnService") ?? "").replace(",", "."));
    frais =
      Number.isFinite(fraisSaisi) && fraisSaisi >= 0
        ? Math.floor(fraisSaisi)
        : fraisMiseEnService(formuleRaw as FormuleKey);
  }

  const reference = `CP-${new Date().getFullYear()}-${generateToken().slice(0, 6).toUpperCase()}`;

  const contrat = await prisma.contratPrestation.create({
    data: {
      organismeId,
      reference,
      formule: formuleRaw as FormuleAbonnement,
      engagement: engagementFinal as EngagementPrestation,
      montantMensuel,
      remisePct,
      options,
      packs,
      fraisMiseEnService: frais,
      pionnier: isPionnier,
      pionnierVariante: isPionnier ? variRaw : null,
      prixGele,
      dateDebut,
    },
    select: { id: true },
  });

  revalidatePath(`/console/${organismeId}`);
  return { ok: true, id: contrat.id };
}

/** Génère le lien de signature, passe le contrat en ENVOYE et e-maile le client. */
export async function sendContratPrestation(id: string): Promise<ContratPrestationState> {
  await requireSuperAdmin();
  const contrat = await prisma.contratPrestation.findUnique({
    where: { id },
    include: { organisme: { select: { id: true, nom: true, email: true } } },
  });
  if (!contrat) return { error: "Contrat introuvable." };
  if (contrat.statut === ContratPrestationStatut.SIGNE) return { error: "Contrat déjà signé." };

  const token = contrat.token ?? generateToken();
  await prisma.contratPrestation.update({
    where: { id },
    data: { token, statut: ContratPrestationStatut.ENVOYE },
  });

  const to = contrat.organisme.email;
  const link = `${appBaseUrl()}/contrat-prestation/${token}`;
  if (to) {
    try {
      await sendEmail({
        to,
        subject: `Votre contrat OFManager à signer — ${contrat.reference}`,
        html:
          `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1e293b;font-size:15px;line-height:1.6">` +
          `<p>Bonjour,</p>` +
          `<p>Votre contrat d'abonnement à <b>OFManager</b> (réf. ${contrat.reference}) est prêt à être signé en ligne.</p>` +
          `<p><a href="${link}" style="display:inline-block;background:#2C53C0;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">Consulter et signer mon contrat →</a></p>` +
          `<p style="color:#64748b;font-size:13px">Signature électronique simple (tracé manuscrit horodaté, adresse IP enregistrée).</p>` +
          `</div>`,
      });
    } catch {
      /* l'échec d'envoi ne bloque pas le passage en ENVOYE (lien copiable en console) */
    }
  }

  revalidatePath(`/console/${contrat.organisme.id}`);
  return { ok: true, id };
}

/** Supprime un contrat de prestation (brouillon/erreur). SUPERADMIN. */
export async function deleteContratPrestation(id: string, organismeId: string): Promise<void> {
  await requireSuperAdmin();
  await prisma.contratPrestation.delete({ where: { id } });
  revalidatePath(`/console/${organismeId}`);
}
