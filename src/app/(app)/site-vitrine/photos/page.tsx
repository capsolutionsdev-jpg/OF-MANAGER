import Link from "next/link";
import { ArrowLeft, Trash2, Images } from "lucide-react";
import type { ZonePhoto } from "@prisma/client";
import { getTenantDb } from "@/lib/tenant";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhotoUploader } from "@/components/vitrine/photo-uploader";
import { deletePhotoVitrineAction } from "@/lib/actions/photo-vitrine-actions";

export const metadata = { title: "Photos du site vitrine" };
export const dynamic = "force-dynamic";

const ZONES: { key: ZonePhoto; titre: string; desc: string }[] = [
  {
    key: "CLIENTS_PARTENAIRES",
    titre: "Clients & partenaires",
    desc: "Logos et photos affichés sur la page « Clients & partenaires » du site. Ajoutez-les au fur et à mesure.",
  },
  {
    key: "CENTRE",
    titre: "Photos du centre",
    desc: "Photos de vos locaux / du centre, affichées sur la page « Qui sommes-nous ». Modifiables à tout moment.",
  },
  {
    key: "ALBUM",
    titre: "Album photos",
    desc: "Photos de sessions, souvenirs… affichées sur la page « Album photos » du site.",
  },
];

export default async function PhotosVitrinePage() {
  const db = await getTenantDb();
  const photos = await db.photoVitrine.findMany({
    orderBy: [{ zone: "asc" }, { ordre: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/site-vitrine"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Retour au cockpit
        </Link>
        <PageHeader
          title="Photos du site vitrine"
          subtitle="Alimentez les galeries du site : Clients & partenaires, Photos du centre et Album photos. Les ajouts apparaissent sur le site sous ~5 min."
        />
      </div>

      {ZONES.map((z) => {
        const list = photos.filter((p) => p.zone === z.key);
        return (
          <Card key={z.key}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Images className="h-4 w-4 text-muted-foreground" /> {z.titre}
                <span className="text-sm font-normal text-muted-foreground">
                  ({list.length})
                </span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">{z.desc}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <PhotoUploader zone={z.key} />

              {list.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune photo pour l&apos;instant.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {list.map((p) => (
                    <div
                      key={p.id}
                      className="group relative overflow-hidden rounded-lg border border-border"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.url}
                        alt={p.legende ?? "Photo du site vitrine"}
                        className="aspect-[4/3] w-full object-cover"
                      />
                      {p.legende && (
                        <div className="truncate px-2 py-1 text-xs text-muted-foreground">
                          {p.legende}
                        </div>
                      )}
                      <form
                        action={deletePhotoVitrineAction}
                        className="absolute right-1.5 top-1.5 opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <input type="hidden" name="id" value={p.id} />
                        <Button
                          type="submit"
                          size="sm"
                          variant="destructive"
                          className="h-7 w-7 p-0"
                          title="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </form>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
