import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarDays, MapPin, GraduationCap, Users } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { PageHeader } from "@/components/ui/page-header";
import { AssetsPanel, type AssetView } from "@/components/communication/assets-panel";

export const dynamic = "force-dynamic";

const fmt = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export default async function CommunicationSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const db = await getTenantDb();

  const s = await db.session.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      dateDebut: true,
      dateFin: true,
      modalite: true,
      lieu: true,
      nbPlaces: true,
      formation: { select: { titre: true, dureeHeures: true } },
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
          contenu: true,
        },
      },
    },
  });
  if (!s) notFound();

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
    </div>
  );
}
