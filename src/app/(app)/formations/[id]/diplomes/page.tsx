import { notFound } from "next/navigation";
import { getFormationDetail } from "@/lib/formations/detail";
import { FormationDetailHeader } from "@/components/formations/formation-detail-header";
import { Badge } from "@/components/ui/badge";
import { ExportMenu } from "@/components/export-menu";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const DIPLOME_STATUT_LABEL: Record<string, string> = {
  ENVOYE_CERTIFICATEUR: "Envoyé au certificateur",
  RECU: "Reçu",
  REMIS: "Remis",
};
const fdate = (d: Date | null) => (d ? d.toLocaleDateString("fr-FR") : "—");

export default async function FormationDiplomesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getFormationDetail(id);
  if (!detail) notFound();

  const { f, diplomes } = detail;

  return (
    <div className="space-y-6">
      <FormationDetailHeader
        formation={{
          id: f.id,
          titre: f.titre,
          modalite: f.modalite,
          isArchived: f.isArchived,
          version: f.version,
        }}
        active="diplomes"
        diplomesCount={diplomes.length}
        sessionsCount={f.sessions.length}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">
            Inventaire des diplômes{" "}
            <span className="font-normal text-muted-foreground">({diplomes.length})</span>
          </CardTitle>
          {diplomes.length > 0 && (
            <ExportMenu
              href={`/formations/${f.id}/diplomes/export`}
              label="Exporter l'inventaire"
              size="sm"
            />
          )}
        </CardHeader>
        <CardContent>
          {diplomes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun diplôme délivré pour cette formation. Ils apparaîtront ici après génération
              depuis la fiche session.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">N° de diplôme</th>
                    <th className="py-2 pr-3 font-medium">Nom</th>
                    <th className="py-2 pr-3 font-medium">Prénom</th>
                    <th className="py-2 pr-3 font-medium">Naissance</th>
                    <th className="py-2 pr-3 font-medium">Statut</th>
                    <th className="py-2 font-medium">Créé le</th>
                  </tr>
                </thead>
                <tbody>
                  {diplomes.map((d) => (
                    <tr key={d.id} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-mono text-xs">{d.numeroDiplome ?? "—"}</td>
                      <td className="py-2 pr-3 font-medium">{d.nom}</td>
                      <td className="py-2 pr-3">{d.prenom}</td>
                      <td className="py-2 pr-3">{fdate(d.dateNaissance)}</td>
                      <td className="py-2 pr-3">
                        <Badge variant="outline">
                          {DIPLOME_STATUT_LABEL[d.statut] ?? d.statut}
                        </Badge>
                      </td>
                      <td className="py-2">{fdate(d.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
