import { GraduationCap } from "lucide-react";
import { requireEntreprise } from "@/lib/entreprise-portal";
import { getEntrepriseSuivi } from "@/lib/entreprise-data";
import { RubriqueHeader, EmptyState, CertificationBadge, fmtDate } from "@/components/entreprise/portal-ui";

export const dynamic = "force-dynamic";

export default async function SuiviPage() {
  const entreprise = await requireEntreprise();
  const suivi = await getEntrepriseSuivi(entreprise.id);

  return (
    <div>
      <RubriqueHeader
        title="Suivi pédagogique"
        subtitle="Le résultat de certification de chaque salarié inscrit."
      />
      {suivi.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="h-8 w-8" />}
          title="Aucun suivi disponible"
          hint="Les résultats (certifié, ajourné, abandon) apparaîtront ici à l'issue des formations."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Salarié</th>
                <th className="px-4 py-2 font-medium">Formation</th>
                <th className="px-4 py-2 font-medium">Résultat</th>
                <th className="px-4 py-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {suivi.map((s) => (
                <tr key={s.id}>
                  <td className="whitespace-nowrap px-4 py-2.5 font-medium">
                    {s.candidat.prenom} {s.candidat.nom}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{s.session.formation.titre}</td>
                  <td className="px-4 py-2.5">
                    <CertificationBadge resultat={s.resultatCertification} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                    {fmtDate(s.certificationDate ?? s.session.dateFin)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
