"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { requireTrashTenant } from "@/lib/tenant";
import { CORBEILLE_TITRES, type CorbeilleItem, type CorbeilleModele } from "@/lib/corbeille";

/**
 * Corbeille (soft-delete, audit A09-003). Les suppressions faites par le personnel
 * via `scopedPrisma` posent `deletedAt` ; ces actions permettent de lister, restaurer
 * ou purger DÉFINITIVEMENT les éléments en corbeille. Réservé au personnel (tenant).
 */
export async function getCorbeille(): Promise<
  { modele: CorbeilleModele; titre: string; items: CorbeilleItem[] }[]
> {
  const { db } = await requireTrashTenant();
  const enCorbeille = { deletedAt: { not: null } };

  const [candidats, sessions, inscriptions, entreprises, factures] = await Promise.all([
    db.candidat.findMany({
      where: enCorbeille,
      select: { id: true, nom: true, prenom: true, deletedAt: true },
      orderBy: { deletedAt: "desc" },
      take: 200,
    }),
    db.session.findMany({
      where: enCorbeille,
      select: { id: true, reference: true, dateDebut: true, deletedAt: true },
      orderBy: { deletedAt: "desc" },
      take: 200,
    }),
    db.inscription.findMany({
      where: enCorbeille,
      select: {
        id: true,
        deletedAt: true,
        candidat: { select: { nom: true, prenom: true } },
        session: { select: { reference: true } },
      },
      orderBy: { deletedAt: "desc" },
      take: 200,
    }),
    db.entreprise.findMany({
      where: enCorbeille,
      select: { id: true, raisonSociale: true, deletedAt: true },
      orderBy: { deletedAt: "desc" },
      take: 200,
    }),
    db.facture.findMany({
      where: enCorbeille,
      select: { id: true, reference: true, deletedAt: true },
      orderBy: { deletedAt: "desc" },
      take: 200,
    }),
  ]);

  return [
    {
      modele: "candidat",
      titre: CORBEILLE_TITRES.candidat,
      items: candidats.map((c) => ({ id: c.id, label: `${c.nom} ${c.prenom}`.trim(), deletedAt: c.deletedAt })),
    },
    {
      modele: "session",
      titre: CORBEILLE_TITRES.session,
      items: sessions.map((s) => ({
        id: s.id,
        label: s.reference ?? `Session du ${s.dateDebut.toLocaleDateString("fr-FR")}`,
        deletedAt: s.deletedAt,
      })),
    },
    {
      modele: "inscription",
      titre: CORBEILLE_TITRES.inscription,
      items: inscriptions.map((i) => ({
        id: i.id,
        label: `${i.candidat?.nom ?? "?"} ${i.candidat?.prenom ?? ""} — ${i.session?.reference ?? "session"}`.trim(),
        deletedAt: i.deletedAt,
      })),
    },
    {
      modele: "entreprise",
      titre: CORBEILLE_TITRES.entreprise,
      items: entreprises.map((e) => ({ id: e.id, label: e.raisonSociale, deletedAt: e.deletedAt })),
    },
    {
      modele: "facture",
      titre: CORBEILLE_TITRES.facture,
      items: factures.map((f) => ({ id: f.id, label: f.reference, deletedAt: f.deletedAt })),
    },
  ];
}

/** Restaure un élément de la corbeille (deletedAt → null). */
export async function restaurerCorbeille(
  modele: CorbeilleModele,
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const { db } = await requireTrashTenant();
  const data = { deletedAt: null };
  try {
    switch (modele) {
      case "candidat":
        await db.candidat.update({ where: { id }, data });
        break;
      case "session":
        await db.session.update({ where: { id }, data });
        break;
      case "inscription":
        await db.inscription.update({ where: { id }, data });
        break;
      case "entreprise":
        await db.entreprise.update({ where: { id }, data });
        break;
      case "facture":
        await db.facture.update({ where: { id }, data });
        break;
    }
    revalidatePath("/administration/corbeille");
    return { ok: true };
  } catch {
    return { ok: false, error: "Restauration impossible." };
  }
}

/** Purge DÉFINITIVE d'un élément de la corbeille (suppression réelle + cascades). */
export async function purgerCorbeille(
  modele: CorbeilleModele,
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const { db } = await requireTrashTenant();
  try {
    switch (modele) {
      case "candidat":
        await db.candidat.delete({ where: { id } });
        break;
      case "session":
        await db.session.delete({ where: { id } });
        break;
      case "inscription":
        await db.inscription.delete({ where: { id } });
        break;
      case "entreprise":
        await db.entreprise.delete({ where: { id } });
        break;
      case "facture":
        await db.facture.delete({ where: { id } });
        break;
    }
    revalidatePath("/administration/corbeille");
    return { ok: true };
  } catch {
    return { ok: false, error: "Suppression définitive impossible (élément encore référencé ?)." };
  }
}
