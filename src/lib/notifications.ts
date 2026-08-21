import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export type NotifSeverity = "info" | "warn" | "danger";

export type AppNotification = {
  key: string;
  category: string;
  title: string;
  detail?: string;
  href: string;
  date: string; // ISO — sérialisable pour le client
  severity: NotifSeverity;
};

export type NotificationsData = {
  items: AppNotification[];
  unread: number;
  seenAt: string | null;
};

const EMPTY: NotificationsData = { items: [], unread: 0, seenAt: null };

const euro = (n: number) =>
  n.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " €";

/**
 * Notifications « in-app » DÉRIVÉES des données existantes (aucune table à
 * alimenter) : nouveaux leads, relances dues, devis en attente de signature,
 * tâches en retard, factures à encaisser, documents à signer. Le badge « non
 * lus » se base sur `User.notificationsSeenAt` (cf. markNotificationsRead).
 */
export async function getNotifications(): Promise<NotificationsData> {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return EMPTY;
    const db = await getTenantDb();
    const now = new Date();
    const since = new Date(now.getTime() - 14 * 24 * 3600 * 1000); // 14 jours

    const [leads, relances, devis, taches, factures, signatures, demandes, user] =
      await Promise.all([
        db.candidat.findMany({
          where: { statut: "NOUVEAU", createdAt: { gte: since } },
          select: {
            id: true,
            prenom: true,
            nom: true,
            createdAt: true,
            formationSouhaitee: { select: { titre: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 15,
        }),
        db.candidat.findMany({
          where: { relanceDate: { lte: now }, statut: { notIn: ["INSCRIT", "ARCHIVE"] } },
          select: { id: true, prenom: true, nom: true, relanceDate: true },
          orderBy: { relanceDate: "asc" },
          take: 20,
        }),
        db.devis.findMany({
          where: { acceptedAt: null, acceptToken: { not: null }, statut: "ENVOYEE" },
          select: {
            id: true,
            reference: true,
            clientNom: true,
            updatedAt: true,
            entreprise: { select: { raisonSociale: true } },
          },
          orderBy: { updatedAt: "desc" },
          take: 20,
        }),
        db.tache.findMany({
          where: { done: false, dueDate: { lt: now } },
          select: { id: true, titre: true, dueDate: true },
          orderBy: { dueDate: "asc" },
          take: 20,
        }),
        db.facture.findMany({
          where: { statut: { in: ["ENVOYEE", "PARTIELLE"] }, datePaiement: null },
          select: {
            id: true,
            reference: true,
            montantTTC: true,
            dateEmission: true,
            entreprise: { select: { raisonSociale: true } },
          },
          orderBy: { dateEmission: "asc" },
          take: 20,
        }),
        db.signatureRequest.findMany({
          where: { statut: { in: ["EN_ATTENTE", "ENVOYEE"] } },
          select: { id: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 20,
        }),
        db.demandeInscription.findMany({
          where: { statut: "EN_ATTENTE" },
          select: {
            id: true,
            createdAt: true,
            entreprise: { select: { raisonSociale: true } },
            session: { select: { formation: { select: { titre: true } } } },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        }),
        prisma.user.findUnique({
          where: { id: userId },
          select: { notificationsSeenAt: true },
        }),
      ]);

    const items: AppNotification[] = [];

    for (const c of leads) {
      items.push({
        key: `lead:${c.id}`,
        category: "Nouveau prospect",
        title: `Nouveau prospect : ${c.prenom} ${c.nom}`,
        detail: c.formationSouhaitee?.titre ?? undefined,
        href: `/candidats/${c.id}`,
        date: c.createdAt.toISOString(),
        severity: "info",
      });
    }
    for (const c of relances) {
      const late = c.relanceDate! < now;
      items.push({
        key: `relance:${c.id}`,
        category: "Relance commerciale",
        title: `Relance à faire : ${c.prenom} ${c.nom}`,
        detail: `Prévue le ${c.relanceDate!.toLocaleDateString("fr-FR")}`,
        href: `/candidats/${c.id}`,
        date: c.relanceDate!.toISOString(),
        severity: late ? "danger" : "warn",
      });
    }
    for (const d of devis) {
      items.push({
        key: `devis:${d.id}`,
        category: "Signature de devis",
        title: `Devis en attente de signature : ${d.reference}`,
        detail: d.entreprise?.raisonSociale ?? d.clientNom ?? undefined,
        href: `/devis/${d.id}`,
        date: d.updatedAt.toISOString(),
        severity: "warn",
      });
    }
    for (const t of taches) {
      items.push({
        key: `tache:${t.id}`,
        category: "Tâche en retard",
        title: `Tâche en retard : ${t.titre}`,
        detail: `Échéance ${t.dueDate!.toLocaleDateString("fr-FR")}`,
        href: `/taches`,
        date: t.dueDate!.toISOString(),
        severity: "danger",
      });
    }
    for (const f of factures) {
      items.push({
        key: `facture:${f.id}`,
        category: "Facture à encaisser",
        title: `Facture à encaisser : ${f.reference}`,
        detail: `${euro(Number(f.montantTTC))}${f.entreprise?.raisonSociale ? ` · ${f.entreprise.raisonSociale}` : ""}`,
        href: `/comptabilite`,
        date: f.dateEmission.toISOString(),
        severity: "warn",
      });
    }
    for (const s of signatures) {
      items.push({
        key: `signature:${s.id}`,
        category: "Document à signer",
        title: `Document en attente de signature`,
        href: `/signatures`,
        date: s.createdAt.toISOString(),
        severity: "warn",
      });
    }
    for (const d of demandes) {
      items.push({
        key: `demande:${d.id}`,
        category: "Demande d'inscription",
        title: `Nouvelle demande : ${d.entreprise.raisonSociale}`,
        detail: d.session.formation.titre,
        href: `/demandes-inscription`,
        date: d.createdAt.toISOString(),
        severity: "warn",
      });
    }

    items.sort((a, b) => (a.date < b.date ? 1 : -1));
    const capped = items.slice(0, 40);

    const seenAt = user?.notificationsSeenAt ?? null;
    const unread = seenAt
      ? capped.filter((i) => new Date(i.date) > seenAt).length
      : capped.length;

    return { items: capped, unread, seenAt: seenAt ? seenAt.toISOString() : null };
  } catch {
    // Ne jamais casser le layout si une requête échoue (ex. coupure Neon).
    return EMPTY;
  }
}
