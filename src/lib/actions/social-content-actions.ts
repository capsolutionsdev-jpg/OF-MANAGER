"use server";

import { revalidatePath } from "next/cache";
import { requireStaffTenant, type TenantDb } from "@/lib/tenant";
import { hasStrictFeature } from "@/lib/feature-guard";
import { checkLimit } from "@/lib/rate-limit";
import {
  genererContenusReseaux,
  SOCIAL_PLATFORMS,
  type SessionPromoData,
} from "@/lib/social-content";
import { genererImageIA, imageIaConfigured } from "@/lib/image-gen";
import type { SocialPlatform } from "@prisma/client";

type Res = { ok: boolean; error?: string; count?: number };

const MODALITE_LABEL: Record<string, string> = {
  PRESENTIEL: "présentiel",
  DISTANCIEL: "à distance",
  MIXTE: "mixte (présentiel + distanciel)",
};

const fmtDate = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

/** Construit le contexte de promotion d'une session (cloisonné tenant). */
async function buildPromoData(
  db: TenantDb,
  organismeId: string,
  sessionId: string,
): Promise<SessionPromoData | null> {
  const s = await db.session.findUnique({
    where: { id: sessionId },
    select: {
      dateDebut: true,
      dateFin: true,
      lieu: true,
      modalite: true,
      nbPlaces: true,
      formation: {
        select: {
          titre: true,
          objectifs: true,
          publicVise: true,
          dureeHeures: true,
          tarif: true,
          certification: true,
          vitrineDescription: true,
        },
      },
      formateurs: { select: { prenom: true, nom: true } },
    },
  });
  if (!s) return null;

  // Places restantes = capacité − inscriptions non annulées.
  const pris = await db.inscription.count({
    where: { sessionId, statut: { not: "ANNULEE" } },
  });

  // Organisme (modèle global → passe-plat même via le client scopé).
  const org = await db.organisme.findUnique({
    where: { id: organismeId },
    select: { nom: true, email: true, telephone: true, siteWeb: true, qualiopiNumero: true },
  });

  const f = s.formation;
  const distanciel = s.modalite === "DISTANCIEL";
  const formateur = s.formateurs[0] ? `${s.formateurs[0].prenom} ${s.formateurs[0].nom}`.trim() : null;

  return {
    titre: f.titre,
    description: f.vitrineDescription ?? null,
    publicVise: f.publicVise ?? null,
    objectifs: f.objectifs ?? null,
    dateDebut: fmtDate(s.dateDebut),
    dateFin: fmtDate(s.dateFin),
    modalite: MODALITE_LABEL[s.modalite] ?? "présentiel",
    lieu: distanciel ? null : (s.lieu ?? null),
    dureeHeures: f.dureeHeures ?? null,
    prix: f.tarif != null ? `${Number(f.tarif).toLocaleString("fr-FR")} €` : null,
    placesRestantes: Math.max(0, s.nbPlaces - pris),
    formateur,
    certification: f.certification ?? null,
    qualiopi: Boolean(org?.qualiopiNumero),
    urlInscription: org?.siteWeb ?? null,
    emailContact: org?.email ?? null,
    telephone: org?.telephone ?? null,
    organisme: org?.nom ?? "notre organisme de formation",
  };
}

/**
 * Génère (ou régénère) les contenus réseaux d'une session, pour les plateformes
 * demandées (défaut : toutes). Réservé au personnel, module « communication »
 * activé, rate-limité. Les contenus sont enregistrés en BROUILLON.
 */
export async function genererContenuSession(
  sessionId: string,
  platforms?: SocialPlatform[],
): Promise<Res> {
  const { db, organismeId, session } = await requireStaffTenant();
  if (!(await hasStrictFeature("communication"))) {
    return { ok: false, error: "Le module Communication n'est pas activé pour votre organisme." };
  }
  const rl = await checkLimit(`social-gen:${organismeId}`, { limit: 30, windowMs: 60 * 60 * 1000, failClosed: true });
  if (!rl.ok) return { ok: false, error: "Trop de générations récentes. Réessayez dans quelques minutes." };

  const data = await buildPromoData(db, organismeId, sessionId);
  if (!data) return { ok: false, error: "Session introuvable." };

  const wanted = platforms?.length ? platforms : SOCIAL_PLATFORMS.map((p) => p.enum);
  const gen = await genererContenusReseaux(data, organismeId, wanted);
  if (!gen.ok) return { ok: false, error: gen.error };

  let count = 0;
  for (const p of SOCIAL_PLATFORMS) {
    const c = gen.content[p.json];
    if (!c) continue;
    const contenu = JSON.stringify(c);
    // findFirst + update/create (le client cloisonné injecte/filtre organismeId ;
    // il ne gère pas l'upsert par clé unique COMPOSITE).
    const existing = await db.socialContentAsset.findFirst({
      where: { sessionId, platform: p.enum, type: "TEXTE" },
      select: { id: true },
    });
    if (existing) {
      await db.socialContentAsset.update({
        where: { id: existing.id },
        data: {
          contenu,
          statut: "BROUILLON",
          version: { increment: 1 },
          notesValidation: null,
          valideParId: null,
          valideLe: null,
        },
      });
    } else {
      await db.socialContentAsset.create({
        data: {
          organismeId, // garanti/écrasé par le client cloisonné (défense en profondeur)
          sessionId,
          platform: p.enum,
          type: "TEXTE",
          contenu,
          statut: "BROUILLON",
          createdById: session?.user?.id ?? null,
        },
      });
    }
    count++;
  }

  revalidatePath("/communication");
  revalidatePath(`/communication/${sessionId}`);
  return { ok: true, count };
}

/** Approuve ou rejette un contenu (avec note éventuelle). */
export async function validerAsset(assetId: string, approuve: boolean, notes?: string): Promise<Res> {
  const { db, session } = await requireStaffTenant();
  if (!(await hasStrictFeature("communication"))) return { ok: false, error: "Module non activé." };
  await db.socialContentAsset.update({
    where: { id: assetId },
    data: {
      statut: approuve ? "APPROUVE" : "REJETE",
      notesValidation: notes?.trim() || null,
      valideParId: session?.user?.id ?? null,
      valideLe: new Date(),
    },
  });
  revalidatePath("/communication");
  return { ok: true };
}

/** Enregistre une édition manuelle du contenu (repasse en « à valider »). */
export async function mettreAJourAsset(
  assetId: string,
  patch: { titre?: string; corps?: string; cta?: string; hashtags?: string[] },
): Promise<Res> {
  const { db } = await requireStaffTenant();
  if (!(await hasStrictFeature("communication"))) return { ok: false, error: "Module non activé." };
  const a = await db.socialContentAsset.findUnique({ where: { id: assetId }, select: { contenu: true } });
  if (!a) return { ok: false, error: "Contenu introuvable." };
  let obj: Record<string, unknown> = {};
  try {
    obj = JSON.parse(a.contenu) as Record<string, unknown>;
  } catch {
    obj = {};
  }
  if (patch.titre !== undefined) obj.titre = patch.titre;
  if (patch.corps !== undefined) {
    obj.corps = patch.corps;
    obj.longueur = patch.corps.length;
  }
  if (patch.cta !== undefined) obj.cta = patch.cta;
  if (patch.hashtags !== undefined) obj.hashtags = patch.hashtags;
  await db.socialContentAsset.update({
    where: { id: assetId },
    data: { contenu: JSON.stringify(obj), statut: "A_VALIDER" },
  });
  revalidatePath("/communication");
  return { ok: true };
}

type ImgRes = { ok: boolean; dataUri?: string; error?: string; needsKey?: boolean };

/**
 * Génère une image IA (illustration SANS texte) pour promouvoir une session.
 * Optionnelle : inactive proprement tant que la clé plateforme n'est pas
 * configurée. Réservée au personnel, module « communication », rate-limitée
 * (les images sont coûteuses). Rien n'est écrit en base : image renvoyée pour
 * téléchargement immédiat.
 */
export async function genererVisuelIA(
  sessionId: string,
  opts?: { format?: string; brief?: string },
): Promise<ImgRes> {
  const { db, organismeId } = await requireStaffTenant();
  if (!(await hasStrictFeature("communication"))) return { ok: false, error: "Module non activé." };
  if (!(await imageIaConfigured(organismeId))) {
    return { ok: false, needsKey: true, error: "L'image IA n'est pas encore activée (clé à configurer)." };
  }
  const rl = await checkLimit(`social-img:${organismeId}`, { limit: 15, windowMs: 60 * 60 * 1000, failClosed: true });
  if (!rl.ok) return { ok: false, error: "Trop de générations d'images récentes. Réessayez plus tard." };

  const data = await buildPromoData(db, organismeId, sessionId);
  if (!data) return { ok: false, error: "Session introuvable." };

  const theme = [data.titre, data.certification].filter(Boolean).join(" — ");
  const brief = (opts?.brief ?? "").slice(0, 300).trim();
  const prompt =
    `Illustration professionnelle et moderne pour promouvoir une formation : « ${theme} ». ` +
    (brief ? `Indication de style : ${brief}. ` : "") +
    `Ambiance lumineuse et qualitative, cadrage soigné adapté aux réseaux sociaux. ` +
    `IMPÉRATIF : aucune lettre, aucun mot, aucun texte, aucun logo, aucun watermark dans l'image.`;

  return genererImageIA({ prompt, format: opts?.format, organismeId });
}

/** Planifie (ou déprogramme si null) la date/heure de publication prévue. */
export async function planifierAsset(assetId: string, scheduledAtISO: string | null): Promise<Res> {
  const { db } = await requireStaffTenant();
  if (!(await hasStrictFeature("communication"))) return { ok: false, error: "Module non activé." };
  let scheduledAt: Date | null = null;
  if (scheduledAtISO) {
    const d = new Date(scheduledAtISO);
    if (Number.isNaN(d.getTime())) return { ok: false, error: "Date invalide." };
    scheduledAt = d;
  }
  await db.socialContentAsset.update({ where: { id: assetId }, data: { scheduledAt } });
  revalidatePath("/communication");
  revalidatePath("/communication/calendrier");
  return { ok: true };
}

/** Coche/décoche « publié » (l'OF publie à la main ; on ne fait que tracer). */
export async function marquerPublie(assetId: string, publie: boolean): Promise<Res> {
  const { db } = await requireStaffTenant();
  if (!(await hasStrictFeature("communication"))) return { ok: false, error: "Module non activé." };
  await db.socialContentAsset.update({
    where: { id: assetId },
    data: { publishedAt: publie ? new Date() : null },
  });
  revalidatePath("/communication");
  revalidatePath("/communication/calendrier");
  return { ok: true };
}

/** Régénère UNE plateforme d'un asset existant. */
export async function regenererAsset(assetId: string): Promise<Res> {
  const { db } = await requireStaffTenant();
  if (!(await hasStrictFeature("communication"))) return { ok: false, error: "Module non activé." };
  const asset = await db.socialContentAsset.findUnique({
    where: { id: assetId },
    select: { sessionId: true, platform: true },
  });
  if (!asset) return { ok: false, error: "Contenu introuvable." };
  return genererContenuSession(asset.sessionId, [asset.platform]);
}
