import { notFound } from "next/navigation";
import { Award, Download, CheckCircle2 } from "lucide-react";
import { getSessionDetail } from "@/lib/sessions/detail";
import { SessionDetailHeader } from "@/components/sessions/session-detail-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MODALITE_LABELS } from "@/lib/validators/formation";
import { setResultatsDeclares } from "@/lib/actions/session-actions";
import { SessionGardeFou } from "@/components/sessions/session-garde-fou";
import { SessionClotureBar } from "@/components/sessions/session-cloture-bar";

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

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getSessionDetail(id);
  if (!detail) notFound();

  const { s, gardeFouGroups, vstate, canArchive, dejaArchivee } = detail;
  const fmt = (d: Date) => d.toLocaleDateString("fr-FR");

  return (
    <div className="space-y-6">
      <SessionDetailHeader
        session={{
          id: s.id,
          titre: s.formation.titre,
          statut: s.statut,
          nbFormateurs: s.formateurs.length,
        }}
        active="details"
        validationBadge={
          vstate ? { percentage: vstate.percentage, ok: vstate.isValidated } : undefined
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Détails de la session</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field
              label="Formation"
              value={`${s.formation.titre} (${s.formation.reference})`}
            />
            <Field label="Référence session" value={s.reference} />
            <Field label="Modalité" value={MODALITE_LABELS[s.modalite]} />
            <Field label="Date de début" value={fmt(s.dateDebut)} />
            <Field label="Date de fin" value={fmt(s.dateFin)} />
            <Field label="Horaires" value={s.horaires} />
            <Field label="Lieu" value={s.lieu} />
            <Field
              label="Places"
              value={`${s.inscriptions.length} inscrit(s) / ${s.nbPlaces} places`}
            />
          </dl>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <SessionGardeFou groups={gardeFouGroups} />
        <div className="flex justify-end">
          <SessionClotureBar
            sessionId={s.id}
            canArchive={canArchive}
            dejaArchivee={dejaArchivee}
          />
        </div>
      </div>

      {/* Examen & certification (formations soumises à examen) */}
      {s.formation.examen && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="h-4 w-4" /> Examen &amp; certification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Examen : {s.dateExamen ? fmt(s.dateExamen) : "date à définir"}
              {s.lieuExamen ? ` · ${s.lieuExamen}` : ""}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Certifiés", n: s.inscriptions.filter((i) => i.resultatCertification === "CERTIFIE").length, cls: "text-emerald-700 dark:text-emerald-300" },
                { label: "Ajournés", n: s.inscriptions.filter((i) => i.resultatCertification === "AJOURNE").length, cls: "text-amber-700 dark:text-amber-300" },
                { label: "Absents", n: s.inscriptions.filter((i) => i.resultatCertification === "ABANDON").length, cls: "text-destructive" },
                { label: "En attente", n: s.inscriptions.filter((i) => i.resultatCertification === "NON_EVALUE").length, cls: "text-muted-foreground" },
              ].map((k) => (
                <div key={k.label} className="rounded-lg border bg-muted/30 p-3 text-center">
                  <div className={`text-2xl font-bold ${k.cls}`}>{k.n}</div>
                  <div className="text-xs text-muted-foreground">{k.label}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t pt-3">
              <Button variant="outline" size="sm" render={<a href={`/sessions/${s.id}/resultats`} />}>
                <Download className="mr-1.5 h-4 w-4" /> Exporter les résultats (CSV)
              </Button>
              {s.resultatsDeclaresAt ? (
                <>
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Résultats déclarés au certificateur le {fmt(s.resultatsDeclaresAt)}
                  </span>
                  <form action={setResultatsDeclares}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="declared" value="false" />
                    <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">Annuler</Button>
                  </form>
                </>
              ) : (
                <form action={setResultatsDeclares}>
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="declared" value="true" />
                  <Button type="submit" size="sm">Marquer les résultats déclarés au certificateur</Button>
                </form>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Saisissez le résultat de chaque participant dans l&apos;onglet « Participants »
              (colonne « Certification »). L&apos;« Attestation de réussite » se génère via le
              menu documents de chaque candidat admis.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
