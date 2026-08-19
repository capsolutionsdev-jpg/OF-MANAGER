import { notFound } from "next/navigation";
import { getCandidatDetail } from "@/lib/candidats/detail";
import { CandidatDetailHeader } from "@/components/candidats/candidat-detail-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FINANCEMENT_LABELS,
  CNAPS_STATUT_LABELS,
} from "@/lib/validators/candidat";
import { CandidatAccessPanel } from "@/components/candidats/candidat-access-panel";
import { CivicAccessButton } from "@/components/candidats/civic-access-button";
import { InstrumentGauge } from "@/components/ui/instrument-gauge";

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

export default async function CandidatProfilPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getCandidatDetail(id);
  if (!detail) notFound();

  const { candidat } = detail;
  const fmtDate = (d: Date | null) => (d ? d.toLocaleDateString("fr-FR") : null);
  const insc = candidat.inscriptions.filter((i) => i.statut !== "ANNULEE");
  const piecesTot = candidat.pieces.length;
  const piecesVal = candidat.pieces.filter((p) => p.statut === "VALIDEE").length;
  const piecesAttente = candidat.pieces.filter((p) => p.statut === "EN_ATTENTE").length;
  const dossierPct = piecesTot > 0 ? Math.round((piecesVal / piecesTot) * 100) : null;
  const aSigner = insc.filter((i) => !i.signedAt).length;

  return (
    <div className="space-y-6">
      <CandidatDetailHeader candidat={candidat} active="profil" t3pTab={detail.t3pTab} />

      {/* Bandeau-instruments : constantes vitales du candidat */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
          <InstrumentGauge label="Inscriptions" value={String(insc.length)} sub="formation(s)" />
          <InstrumentGauge label="Dossier" value={dossierPct === null ? "—" : `${dossierPct}%`} sub={piecesTot > 0 ? `${piecesVal}/${piecesTot} pièces` : "aucune pièce"} bar={dossierPct ?? undefined} tone="success" />
          <InstrumentGauge label="À signer" value={String(aSigner)} sub={aSigner > 0 ? "document(s)" : "à jour"} tone={aSigner > 0 ? "warning" : "success"} />
          <InstrumentGauge label="Pièces à vérifier" value={String(piecesAttente)} sub={piecesAttente > 0 ? "à traiter" : "à jour"} tone={piecesAttente > 0 ? "warning" : "success"} />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Coordonnées</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Email" value={candidat.email} />
              <Field label="Téléphone" value={candidat.telephone} />
              <Field
                label="Date de naissance"
                value={fmtDate(candidat.dateNaissance)}
              />
              <Field label="Lieu de naissance" value={candidat.lieuNaissance} />
              <Field label="Pays de naissance" value={candidat.paysNaissance} />
              <Field label="Adresse" value={candidat.adresse} />
              <Field label="Code postal" value={candidat.codePostal} />
              <Field label="Ville" value={candidat.ville} />
              <Field label="Pays" value={candidat.pays} />
            </dl>
            <CandidatAccessPanel
              candidatId={candidat.id}
              hasAccount={!!candidat.apprenant?.userId}
              email={candidat.email}
            />
            <CivicAccessButton
              candidatId={candidat.id}
              hasToken={!!candidat.civicToken}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profil & financement</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <Field
                label="Situation professionnelle"
                value={candidat.situationPro}
              />
              <Field label="Employeur" value={candidat.employeur} />
              <Field label="Poste occupé" value={candidat.posteOccupe} />
              <Field label="Dernier diplôme obtenu" value={candidat.dernierDiplome} />
              <Field
                label="Comment nous a-t-il connus"
                value={candidat.sourceConnaissance}
              />
              <Field
                label="Financement envisagé"
                value={
                  candidat.financementType
                    ? FINANCEMENT_LABELS[candidat.financementType]
                    : null
                }
              />
              {(candidat.cnapsStatut || candidat.carteProNumero || candidat.carteProValidite) && (
                <>
                  <Field
                    label="Autorisation préalable CNAPS"
                    value={candidat.cnapsStatut ? CNAPS_STATUT_LABELS[candidat.cnapsStatut] : null}
                  />
                  <Field label="N° carte professionnelle" value={candidat.carteProNumero} />
                  <Field
                    label="Validité carte pro"
                    value={candidat.carteProValidite ? candidat.carteProValidite.toLocaleDateString("fr-FR") : null}
                  />
                </>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
