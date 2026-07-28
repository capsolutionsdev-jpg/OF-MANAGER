"use server";

import { revalidatePath } from "next/cache";
import { VitrineStatut } from "@prisma/client";
import { getTenantDb } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// [DEBUG TEMPORAIRE] journalise le déroulé/erreur de l'action dans AuditLog
// (les logs Vercel ne sont pas accessibles en offre gratuite). À retirer.
async function dbg(marker: string, detail: string) {
  try {
    await prisma.auditLog.create({
      data: {
        organismeId: process.env.VITRINE_ORGANISME_ID || null,
        action: marker,
        entityType: "CockpitDebug",
        entityId: detail.slice(0, 900),
      },
    });
  } catch {
    /* ne jamais faire échouer le debug */
  }
}

// =============================================================
//  ACTIONS DU COCKPIT « SITE VITRINE »
//
//  Pilotage rapide, depuis un seul écran, de ce qui s'affiche sur le
//  site public capacademy.fr :
//   - statut de publication (MASQUEE / PUBLIEE / SUSPENDUE)
//   - tarif et durée (surcouche live lue par le vitrine via l'API
//     publique /api/public/formations, jointure par `reference`).
//
//  Le site vitrine est une application séparée en ISR (~5 min) : les
//  changements y apparaissent automatiquement, sans redéploiement.
// =============================================================

const clean = (s?: string | null) => (s && s.trim() !== "" ? s.trim() : null);

/**
 * Enregistre en une fois la ligne du cockpit : statut vitrine + tarif + durée.
 * Progressive enhancement : appelée directement par `<form action={...}>`.
 */
export async function saveVitrineRowAction(formData: FormData) {
  let step = "start";
  try {
    const db = await getTenantDb();
    const session = await auth();
    if (!session?.user) {
      await dbg("COCKPIT_NOSESSION", "pas de session");
      return;
    }

    const id = String(formData.get("id"));
    if (!id) {
      await dbg("COCKPIT_NOID", "id manquant");
      return;
    }
    step = `parsed id=${id} org=${session.user.organismeId ?? "?"}`;

    // Statut : valeur de l'enum uniquement (garde-fou).
    const statutRaw = String(formData.get("vitrineStatut") ?? "");
    const vitrineStatut = (Object.values(VitrineStatut) as string[]).includes(
      statutRaw,
    )
      ? (statutRaw as VitrineStatut)
      : undefined;

    // Tarif : accepte la virgule décimale ; vide = on efface (null).
    const tarifRaw = clean(String(formData.get("tarif") ?? ""));
    const tarifNum =
      tarifRaw !== null ? Number(tarifRaw.replace(/\s/g, "").replace(",", ".")) : null;
    const tarif =
      tarifNum !== null && !Number.isNaN(tarifNum) ? tarifNum : null;

    const duree = clean(String(formData.get("duree") ?? ""));

    const heuresRaw = clean(String(formData.get("dureeHeures") ?? ""));
    const heuresNum = heuresRaw !== null ? parseInt(heuresRaw, 10) : null;
    const dureeHeures =
      heuresNum !== null && !Number.isNaN(heuresNum) ? heuresNum : null;

    step = `avant update tarif=${tarif} duree=${duree} h=${dureeHeures} statut=${vitrineStatut ?? "-"}`;
    await db.formation.update({
      where: { id },
      data: {
        ...(vitrineStatut ? { vitrineStatut } : {}),
        tarif,
        duree,
        dureeHeures,
      },
    });

    step = "avant auditLog";
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "VITRINE_UPDATE",
        entityType: "Formation",
        entityId: id,
      },
    });

    step = "avant revalidate";
    revalidatePath("/site-vitrine");
    revalidatePath("/formations");
    revalidatePath(`/formations/${id}`);

    await dbg("COCKPIT_OK", step);
  } catch (e) {
    const msg =
      e instanceof Error
        ? `${e.name}: ${e.message} @ ${step} | ${(e.stack || "").split("\n").slice(1, 4).join(" ")}`
        : `${String(e)} @ ${step}`;
    await dbg("COCKPIT_ERROR", msg);
    throw e;
  }
}

/**
 * Bascule rapide du seul statut de publication (boutons Publier / Suspendre /
 * Masquer du cockpit), sans toucher au tarif ni à la durée.
 */
export async function setVitrineStatutAction(formData: FormData) {
  const db = await getTenantDb();
  const session = await auth();
  if (!session?.user) return;

  const id = String(formData.get("id"));
  const statutRaw = String(formData.get("vitrineStatut") ?? "");
  if (!id || !(Object.values(VitrineStatut) as string[]).includes(statutRaw)) {
    return;
  }

  await db.formation.update({
    where: { id },
    data: { vitrineStatut: statutRaw as VitrineStatut },
  });

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "VITRINE_STATUT",
      entityType: "Formation",
      entityId: id,
    },
  });

  revalidatePath("/site-vitrine");
  revalidatePath("/formations");
  revalidatePath(`/formations/${id}`);
}
