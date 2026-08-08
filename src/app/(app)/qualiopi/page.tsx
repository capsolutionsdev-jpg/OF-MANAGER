import Link from "next/link";
import { ShieldCheck, MessageSquareWarning, Newspaper, Handshake, FolderArchive } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { initialiserIndicateurs } from "@/lib/actions/qualiopi-actions";
import { QualiopiCriteres } from "@/components/qualiopi/qualiopi-criteres";

export default async function QualiopiPage() {
  const db = await getTenantDb();
  const indicateurs = await db.qualiopiIndicateur.findMany({
    orderBy: { numero: "asc" },
  });

  const total = indicateurs.length;
  const conformes = indicateurs.filter((i) => i.statut === "CONFORME").length;
  const nonConformes = indicateurs.filter((i) => i.statut === "NON_CONFORME").length;
  const applicables = indicateurs.filter((i) => i.statut !== "NON_APPLICABLE").length;
  const pct = applicables > 0 ? Math.round((conformes / applicables) * 100) : 0;

  const rows = indicateurs.map((i) => ({
    id: i.id,
    numero: i.numero,
    libelle: i.libelle,
    statut: i.statut,
    commentaire: i.commentaire,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conformité Qualiopi"
        subtitle="Suivi des 32 indicateurs du Référentiel National Qualité (RNQ)."
      >
        <Button variant="outline" size="sm" render={<Link href="/qualiopi/reclamations" />}>
          <MessageSquareWarning className="mr-1.5 h-4 w-4" /> Réclamations
        </Button>
        <Button variant="outline" size="sm" render={<Link href="/qualiopi/veille" />}>
          <Newspaper className="mr-1.5 h-4 w-4" /> Veille
        </Button>
        <Button variant="outline" size="sm" render={<Link href="/qualiopi/partenaires" />}>
          <Handshake className="mr-1.5 h-4 w-4" /> Partenaires
        </Button>
        {total > 0 && (
          <Button size="sm" render={<a href="/qualiopi/dossier" />}>
            <FolderArchive className="mr-1.5 h-4 w-4" /> Exporter le dossier d&apos;audit
          </Button>
        )}
      </PageHeader>

      {total === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <ShieldCheck className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">Aucun indicateur initialisé</p>
            <p className="text-sm text-muted-foreground">
              Initialisez les 32 indicateurs du RNQ pour commencer le suivi.
            </p>
            <form action={initialiserIndicateurs}>
              <Button type="submit" className="mt-2">
                Initialiser les 32 indicateurs
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Niveau de conformité */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Niveau de conformité</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-end gap-6">
                <div>
                  <div className="text-4xl font-bold">{pct}%</div>
                  <p className="text-xs text-muted-foreground">
                    {conformes} conformes / {applicables} applicables
                  </p>
                </div>
                <div className="flex gap-4 text-sm">
                  <span className="text-emerald-600">● {conformes} conformes</span>
                  <span className="text-amber-600">
                    ● {total - conformes - nonConformes} en cours
                  </span>
                  <span className="text-red-600">● {nonConformes} non conformes</span>
                </div>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Indicateurs par critère : filtre + accordéon */}
          <QualiopiCriteres indicateurs={rows} />
        </>
      )}
    </div>
  );
}
