import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarDays, MapPin, GraduationCap, Users } from "lucide-react";
import { requireStaffTenant } from "@/lib/tenant";
import { PageHeader } from "@/components/ui/page-header";
import { AssetsPanel, type AssetView } from "@/components/communication/assets-panel";
import { VisualCards, type CardData } from "@/components/communication/visual-cards";
import { AiImagePanel } from "@/components/communication/ai-image-panel";
import { imageIaConfigured } from "@/lib/image-gen";
import { ModulePending, isMissingTable } from "@/components/communication/module-pending";

export const dynamic = "force-dynamic";

const fmt = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export default async function CommunicationSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const { db, organismeId } = await requireStaffTenant();

  const s = await db.session
    .findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        dateDebut: true,
        dateFin: true,
        modalite: true,
        lieu: true,
        nbPlaces: true,
        formation: { select: { titre: true, dureeHeures: true, tarif: true, certification: true } },
        _count: { select: { inscriptions: true } },
        socialAssets: {
          orderBy: { platform: "asc" },
          select: {
            id: true,
            platform: true,
            statut: true,
            version: true,
            notesValidation: true,
            valideLe: true,
            scheduledAt: true,
            publishedAt: true,
            contenu: true,
          },
        },
      },
    })
    .catch((e: unknown) => {
      if (isMissingTable(e)) return "MISSING" as const;
      throw e;
    });

  if (s === "MISSING") {
    return (
      <div className="space-y-6">
        <Link
          href="/communication"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Toutes les sessions
        </Link>
        <ModulePending />
      </div>
    );
  }
  if (!s) notFound();

  // Marque de l'OF (tenant-agnostique) pour les visuels.
  const org = await db.organisme.findUnique({
    where: { id: organismeId },
    select: {
      nom: true,
      couleurPrimaire: true,
      couleurSecondaire: true,
      siteWeb: true,
      qualiopiNumero: true,
    },
  });

  // Sérialisation des assets pour le composant client (JSON → objet typé).
  const assets: AssetView[] = s.socialAssets.map((a) => {
    let c: Record<string, unknown> = {};
    try {
      c = JSON.parse(a.contenu) as Record<string, unknown>;
    } catch {
      c = {};
    }
    const hashtags = Array.isArray(c.hashtags)
      ? c.hashtags.filter((h): h is string => typeof h === "string")
      : [];
    const avertissements = Array.isArray(c.avertissements)
      ? c.avertissements.filter((x): x is string => typeof x === "string")
      : [];
    return {
      id: a.id,
      platform: a.platform,
      statut: a.statut,
      version: a.version,
      notesValidation: a.notesValidation,
      valideLe: a.valideLe ? a.valideLe.toISOString() : null,
      scheduledAt: a.scheduledAt ? a.scheduledAt.toISOString() : null,
      publishedAt: a.publishedAt ? a.publishedAt.toISOString() : null,
      content: {
        titre: typeof c.titre === "string" ? c.titre : "",
        corps: typeof c.corps === "string" ? c.corps : "",
        cta: typeof c.cta === "string" ? c.cta : "",
        hashtags,
        avertissements,
      },
    };
  });

  const distanciel = s.modalite === "DISTANCIEL";

  const cardData: CardData = {
    organismeNom: org?.nom ?? "Organisme de formation",
    couleurPrimaire: org?.couleurPrimaire || "#1A5FD4",
    couleurSecondaire: org?.couleurSecondaire ?? null,
    formationTitre: s.formation.titre,
    dateDebut: fmt(s.dateDebut),
    dateFin: fmt(s.dateFin),
    memeJour: s.dateDebut.toDateString() === s.dateFin.toDateString(),
    distanciel,
    lieu: distanciel ? null : s.lieu ?? null,
    dureeHeures: s.formation.dureeHeures ?? null,
    prix: s.formation.tarif != null ? `${Number(s.formation.tarif).toLocaleString("fr-FR")} €` : null,
    certification: s.formation.certification ?? null,
    qualiopi: Boolean(org?.qualiopiNumero),
    siteWeb: org?.siteWeb ?? null,
  };

  const imageIaActive = await imageIaConfigured(organismeId);

  return (
    <div className="space-y-6">
      <Link
        href="/communication"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Toutes les sessions
      </Link>

      <PageHeader
        title={s.formation.titre}
        subtitle="Générez les posts par réseau, ajustez le texte, validez puis copiez ou exportez."
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="size-4" /> {fmt(s.dateDebut)} → {fmt(s.dateFin)}
        </span>
        {!distanciel && s.lieu && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-4" /> {s.lieu}
          </span>
        )}
        {s.formation.dureeHeures != null && (
          <span className="inline-flex items-center gap-1.5">
            <GraduationCap className="size-4" /> {s.formation.dureeHeures} h
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <Users className="size-4" /> {s._count.inscriptions}/{s.nbPlaces} inscrits
        </span>
      </div>

      <AssetsPanel sessionId={s.id} assets={assets} />

      <VisualCards data={cardData} />

      <AiImagePanel sessionId={s.id} configured={imageIaActive} />
    </div>
  );
}
