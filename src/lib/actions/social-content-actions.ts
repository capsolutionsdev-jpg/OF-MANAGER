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
  const rl = await checkLimit(`social-gen:${organismeId}`, { limit: 30, windowMs: 60 * 60 * 1000 });
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

/** Régénère UNE plateforme d'un asset existant. */
export async function regenererAsset(assetId: string): Promise<Res> {
  const { db, organismeId } = await requireStaffTenant();
  if (!(await hasStrictFeature("communication"))) return { ok: false, error: "Module non activé." };
  const asset = await db.socialContentAsset.findUnique({
    where: { id: assetId },
    select: { sessionId: true, platform: true },
  });
  if (!asset) return { ok: false, error: "Contenu introuvable." };
  return genererContenuSession(asset.sessionId, [asset.platform]);
}
