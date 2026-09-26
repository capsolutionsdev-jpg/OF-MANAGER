"use server";

import { revalidatePath } from "next/cache";
import { ZonePhoto } from "@prisma/client";
import { requireStaffTenant } from "@/lib/tenant";

// =============================================================
//  PHOTOS DU SITE VITRINE (galerie par zone)
//  L'upload passe par /api/upload (Vercel Blob) → on reçoit une URL,
//  puis ces actions créent/suppriment l'enregistrement PhotoVitrine.
//  Lues par le vitrine via /api/public/photos (ISR ~5 min).
// =============================================================

const clean = (s?: string | null) => (s && s.trim() !== "" ? s.trim() : null);
const isZone = (z: string): z is ZonePhoto =>
  (Object.values(ZonePhoto) as string[]).includes(z);

export async function addPhotoVitrineAction(formData: FormData) {
  // BFLA (OFM) : galerie vitrine réservée au personnel (rejette les rôles non-staff dont ENTREPRISE).
  const { db, session } = await requireStaffTenant();

  const zone = String(formData.get("zone") ?? "");
  const url = String(formData.get("url") ?? "");
  if (!isZone(zone) || (!url.startsWith("http") && !url.startsWith("data:"))) return;

  // Ordre = à la fin de la zone.
  const last = await db.photoVitrine.findFirst({
    where: { zone },
    orderBy: { ordre: "desc" },
    select: { ordre: true },
  });

  const photo = await db.photoVitrine.create({
    data: {
      zone,
      url,
      legende: clean(String(formData.get("legende") ?? "")),
      ordre: (last?.ordre ?? 0) + 1,
    },
  });
  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "CREATE",
      entityType: "PhotoVitrine",
      entityId: photo.id,
    },
  });
  revalidatePath("/site-vitrine/photos");
}

export async function deletePhotoVitrineAction(formData: FormData) {
  // BFLA (OFM) : galerie vitrine réservée au personnel (rejette les rôles non-staff dont ENTREPRISE).
  const { db, session } = await requireStaffTenant();

  const id = String(formData.get("id"));
  if (!id) return;

  await db.photoVitrine.delete({ where: { id } });
  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "DELETE",
      entityType: "PhotoVitrine",
      entityId: id,
    },
  });
  revalidatePath("/site-vitrine/photos");
}
