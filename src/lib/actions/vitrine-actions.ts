"use server";

import { revalidatePath } from "next/cache";
import { VitrineStatut } from "@prisma/client";
import { getTenantDb } from "@/lib/tenant";
import { auth } from "@/auth";

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
  const db = await getTenantDb();
  const session = await auth();
  if (!session?.user) return;

  const id = String(formData.get("id"));
  if (!id) return;

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

  await db.formation.update({
    where: { id },
    data: {
      ...(vitrineStatut ? { vitrineStatut } : {}),
      tarif,
      duree,
      dureeHeures,
    },
  });

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "VITRINE_UPDATE",
      entityType: "Formation",
      entityId: id,
    },
  });

  revalidatePath("/site-vitrine");
  revalidatePath("/formations");
  revalidatePath(`/formations/${id}`);
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
