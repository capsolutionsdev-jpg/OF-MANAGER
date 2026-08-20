import Link from "next/link";
import {
  Globe,
  ExternalLink,
  BarChart3,
  CalendarDays,
  CalendarPlus,
  Images,
  Newspaper,
} from "lucide-react";
import type { Academy } from "@prisma/client";
import { getTenantDb } from "@/lib/tenant";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canAccessSection } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ACADEMY_LABELS } from "@/lib/validators/formation";
import { VitrineTable, type VitrineRow } from "@/components/site-vitrine/vitrine-table";

export const metadata = { title: "Site vitrine" };

// URL publique du site vitrine (lecture seule pour l'ADMIN, ouverte en onglet).
const VITRINE_URL = "https://ofmanager.fr";

// Mappe l'académie (côté manager) vers la catégorie/slug d'URL du site vitrine.
const ACADEMY_TO_CATEGORIE: Record<Academy, string> = {
  SAFETY: "securite",
  TRANSPORT: "transport",
  DIGITAL: "digital",
  LANGUE: "langues",
};

// Récupère les valeurs (heures/prix) d'une formule stockée dans vitrineFormules (JSON).
function formuleVal(vf: unknown, key: string): { heures: string; prix: string } {
  const arr = Array.isArray(vf)
    ? (vf as { key?: string; heures?: string; prix?: string }[])
    : [];
  const row = arr.find((x) => x?.key === key);
  return { heures: row?.heures ?? "", prix: row?.prix ?? "" };
}

export default async function SiteVitrinePage() {
  const db = await getTenantDb();

  // Le « Blog » est désormais intégré ici (plus d'item de rail) : bouton affiché
  // seulement si le collaborateur a la permission de section « blog ».
  const session = await auth();
  const u = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true, permissions: true },
      })
    : null;
  const canBlog = u ? canAccessSection(u.role, u.permissions, "blog") : false;

  const formations = await db.formation.findMany({
    where: { isArchived: false },
    orderBy: { titre: "asc" },
    select: {
      id: true,
      titre: true,
      reference: true,
      academy: true,
      vitrineStatut: true,
      tarif: true,
      duree: true,
      dureeHeures: true,
      vitrineFormules: true,
    },
  });

  const counts = {
    PUBLIEE: formations.filter((f) => f.vitrineStatut === "PUBLIEE").length,
    MASQUEE: formations.filter((f) => f.vitrineStatut === "MASQUEE").length,
    SUSPENDUE: formations.filter((f) => f.vitrineStatut === "SUSPENDUE").length,
  };

  // Sessions à venir (celles qui alimentent le planning public + les places restantes).
  const debutJour = new Date();
  debutJour.setHours(0, 0, 0, 0);
  const nbSessions = await db.session.count({
    where: {
      isArchived: false,
      statut: { in: ["PLANIFIEE", "OUVERTE"] },
      dateDebut: { gte: debutJour },
    },
  });

  const rows: VitrineRow[] = formations.map((f) => {
    const categorie = f.academy ? ACADEMY_TO_CATEGORIE[f.academy] : null;
    const ficheUrl =
      categorie && f.vitrineStatut === "PUBLIEE"
        ? `${VITRINE_URL}/formations/${categorie}/${f.reference}`
        : null;
    const fPres = formuleVal(f.vitrineFormules, "presentiel");
    const fMixte = formuleVal(f.vitrineFormules, "mixte");
    const fElearn = formuleVal(f.vitrineFormules, "elearning");
    return {
      id: f.id,
      titre: f.titre,
      reference: f.reference,
      editUrl: `/formations/${f.id}`,
      academy: f.academy,
      academyLabel: f.academy ? ACADEMY_LABELS[f.academy] : "—",
      vitrineStatut: f.vitrineStatut,
      tarif: f.tarif != null ? String(Number(f.tarif)) : "",
      duree: f.duree ?? "",
      dureeHeures: f.dureeHeures != null ? String(f.dureeHeures) : "",
      ficheUrl,
      formules: {
        presentielHeures: fPres.heures,
        presentielPrix: fPres.prix,
        mixteHeures: fMixte.heures,
        mixtePrix: fMixte.prix,
        elearningHeures: fElearn.heures,
        elearningPrix: fElearn.prix,
      },
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Site vitrine"
        subtitle="Pilotez ce qui s'affiche sur votre site vitrine : publication, tarif et durée de chaque formation. Les changements apparaissent sur le site public sous ~5 min."
      >
        {canBlog && (
          <Button variant="outline" render={<Link href="/blog" />}>
            <Newspaper className="mr-2 h-4 w-4" />
            Blog
          </Button>
        )}
        <Button variant="outline" render={<Link href="/site-vitrine/trafic" />}>
          <BarChart3 className="mr-2 h-4 w-4" />
          Trafic
        </Button>
        <Button variant="outline" render={<Link href="/site-vitrine/photos" />}>
          <Images className="mr-2 h-4 w-4" />
          Photos
        </Button>
        <Button variant="outline" render={<a href={VITRINE_URL} target="_blank" rel="noopener noreferrer" />}>
          <Globe className="mr-2 h-4 w-4" />
          Voir le site
          <ExternalLink className="ml-2 h-3.5 w-3.5" />
        </Button>
      </PageHeader>

      {formations.length === 0 ? (
        <Card>
          <EmptyState
            icon={Globe}
            title="Aucune formation à publier"
            description="Créez une formation, puis revenez ici pour la mettre en ligne sur le site vitrine."
            actionLabel="Créer une formation"
            actionHref="/formations/nouvelle"
          />
        </Card>
      ) : (
        <VitrineTable rows={rows} counts={counts} />
      )}

      {/* Planning des sessions — encart secondaire (ce n'est pas du pilotage de fiche). */}
      <Card size="sm">
        <CardContent className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted p-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-sm">
              <span className="font-medium">Planning des sessions</span>
              <span className="text-muted-foreground">
                {" "}
                — {nbSessions} session{nbSessions > 1 ? "s" : ""} à venir s&apos;affichent en direct
                sur le site (dates, lieu et places restantes).
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" render={<Link href="/sessions/nouvelle" />}>
              <CalendarPlus className="mr-1.5 h-3.5 w-3.5" /> Ajouter une session
            </Button>
            <Button size="sm" variant="outline" render={<Link href="/planning" />}>
              Voir le planning
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
