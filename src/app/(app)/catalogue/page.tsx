import { Library, Clock, GraduationCap } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { InterestButton } from "@/components/portail/interest-button";

export const dynamic = "force-dynamic";

export default async function CataloguePage() {
  const db = await getTenantDb();
  const formations = await db.formation.findMany({
    where: { isArchived: false },
    orderBy: { titre: "asc" },
    select: {
      id: true, titre: true, reference: true, duree: true, dureeHeures: true,
      objectifs: true, certification: true, modalite: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Library className="h-6 w-6" /> Catalogue des formations
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Découvrez nos formations. Une formation vous intéresse ? Faites-le nous savoir, nous vous recontacterons.
        </p>
      </div>

      {formations.length === 0 ? (
        <Card>
          <EmptyState icon={Library} title="Catalogue en cours de préparation"
            description="Les formations disponibles apparaîtront ici prochainement." />
        </Card>
      ) : (
        <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {formations.map((f) => (
            <Card key={f.id} className="hover-lift flex flex-col">
              <CardHeader>
                <CardTitle className="text-base">{f.titre}</CardTitle>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(f.duree || f.dureeHeures) && (
                    <Badge variant="secondary" className="gap-1">
                      <Clock className="h-3 w-3" /> {f.duree || `${f.dureeHeures} h`}
                    </Badge>
                  )}
                  {f.certification && (
                    <Badge variant="secondary" className="gap-1">
                      <GraduationCap className="h-3 w-3" /> {f.certification}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between gap-4">
                {f.objectifs && (
                  <p className="line-clamp-4 text-sm text-muted-foreground">{f.objectifs}</p>
                )}
                <div>
                  <InterestButton formationId={f.id} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
