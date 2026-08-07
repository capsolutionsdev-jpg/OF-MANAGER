import { notFound } from "next/navigation";
import { getFormateurDetail } from "@/lib/formateurs/detail";
import { FormateurDetailHeader } from "@/components/formateurs/formateur-detail-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ACADEMY_LABELS } from "@/lib/validators/formation";
import { FormateurAccessPanel } from "@/components/formateur/formateur-admin-panels";

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm">{value && value !== "" ? value : "—"}</dd>
    </div>
  );
}

export default async function FormateurDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getFormateurDetail(id);
  if (!detail) notFound();

  const { f } = detail;

  return (
    <div className="space-y-6">
      <FormateurDetailHeader
        formateur={{ id: f.id, prenom: f.prenom, nom: f.nom }}
        active="profil"
        planningCount={f.sessions.length}
        facturesCount={f.factures.length}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coordonnées</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Field label="Email" value={f.email} />
            <Field label="Téléphone" value={f.telephone} />
            <Field label="Spécialités" value={f.specialites} />
            <Field
              label="Expérience"
              value={f.experienceAnnees ? `${f.experienceAnnees} ans` : null}
            />
          </dl>

          {(f.academies.length > 0 || f.formations.length > 0) && (
            <div className="mt-4 space-y-3 border-t pt-4">
              {f.academies.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Académies :
                  </span>
                  {f.academies.map((a) => (
                    <Badge key={a} variant="secondary">
                      {ACADEMY_LABELS[a]}
                    </Badge>
                  ))}
                </div>
              )}
              {f.formations.length > 0 && (
                <div className="text-sm">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Formations enseignées :
                  </span>{" "}
                  {f.formations.map((x) => x.titre).join(" · ")}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Espace formateur (accès)</CardTitle>
        </CardHeader>
        <CardContent>
          <FormateurAccessPanel formateurId={f.id} hasAccess={!!f.userId} email={f.email} />
        </CardContent>
      </Card>
    </div>
  );
}
