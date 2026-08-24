import { FileText, FileDown, CheckCircle2, GraduationCap } from "lucide-react";
import { requireEntreprise } from "@/lib/entreprise-portal";
import { getEntrepriseDocuments, getEntrepriseDiplomes } from "@/lib/entreprise-data";
import { RubriqueHeader, EmptyState, Badge, fmtDate, documentTypeLabel } from "@/components/entreprise/portal-ui";
import { SatisfactionUpload } from "@/components/entreprise/satisfaction-upload";

export const dynamic = "force-dynamic";

type Doc = Awaited<ReturnType<typeof getEntrepriseDocuments>>[number];
type Diplome = Awaited<ReturnType<typeof getEntrepriseDiplomes>>[number];

// Statut réel du module Diplôme (physique) : envoyé au certificateur → reçu → remis.
const DIPLOME_STATUT: Record<string, { label: string; tone: "info" | "success" | "warning" }> = {
  ENVOYE_CERTIFICATEUR: { label: "En cours d'édition (certificateur)", tone: "warning" },
  RECU: { label: "Reçu par l'organisme", tone: "info" },
  REMIS: { label: "Remis", tone: "success" },
};

/** L'enquête de satisfaction a-t-elle déjà été remplie + déposée par le client ? */
function estRetournee(v: Doc["variablesJson"]): boolean {
  return (
    !!v &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    (v as Record<string, unknown>).retourne === true
  );
}

export default async function DocumentsPage() {
  const entreprise = await requireEntreprise();
  const [docs, diplomes] = await Promise.all([
    getEntrepriseDocuments(entreprise.id),
    getEntrepriseDiplomes(entreprise.id),
  ]);

  // Regroupement par salarié.
  const groups = new Map<string, Doc[]>();
  for (const d of docs) {
    const name = d.inscription
      ? `${d.inscription.candidat.prenom} ${d.inscription.candidat.nom}`
      : "Autres documents";
    const arr = groups.get(name) ?? [];
    arr.push(d);
    groups.set(name, arr);
  }

  return (
    <div className="space-y-6">
      <RubriqueHeader
        title="Documents"
        subtitle="Convocations, attestations, certificats… Le règlement intérieur, les CGV et la convocation sont à remettre à vos salariés."
      />
      {docs.length === 0 && diplomes.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-8 w-8" />}
          title="Aucun document"
          hint="Les documents (convocations, attestations, certificats) seront mis à disposition ici."
        />
      ) : (
        <>
          {[...groups.entries()].map(([name, items]) => (
            <section key={name} className="space-y-2">
              <h3 className="text-sm font-semibold">{name}</h3>
              <div className="overflow-hidden rounded-xl border">
                <ul className="divide-y">
                  {items.map((d) => {
                    const isSatis = d.type === "SATISFACTION_ENTREPRISE";
                    const retournee = isSatis && estRetournee(d.variablesJson);
                    return (
                      <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge tone="info">{documentTypeLabel(d.type)}</Badge>
                            <span className="text-sm text-muted-foreground">{d.session?.formation.titre}</span>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">Émis le {fmtDate(d.createdAt)}</p>
                          {isSatis && !retournee && (
                            <p className="mt-0.5 text-xs text-warning">
                              À remplir, signer, puis déposer ci-contre (ou renvoyer par e-mail).
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {retournee && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Déposée
                            </span>
                          )}
                          {d.fileUrl ? (
                            <a
                              href={`/espace-entreprise/download?kind=document&id=${d.id}`}
                              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted"
                            >
                              <FileDown className="h-4 w-4" />
                              {isSatis && !retournee ? "Modèle à remplir" : "Télécharger"}
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">Auprès de l&apos;organisme</span>
                          )}
                          {isSatis && !retournee && <SatisfactionUpload documentId={d.id} />}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          ))}
          {diplomes.length > 0 && (
            <section className="space-y-2">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <GraduationCap className="h-4 w-4 text-muted-foreground" /> Diplômes
              </h3>
              <div className="overflow-hidden rounded-xl border">
                <ul className="divide-y">
                  {diplomes.map((d: Diplome) => {
                    const st = DIPLOME_STATUT[d.statut] ?? { label: d.statut, tone: "info" as const };
                    return (
                      <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{d.prenom} {d.nom}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {d.formationTitre ?? "—"}
                            {d.numeroDiplome ? ` · N° ${d.numeroDiplome}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {d.statut === "REMIS" && d.remisAt && (
                            <span className="text-xs text-muted-foreground">le {fmtDate(d.remisAt)}</span>
                          )}
                          <Badge tone={st.tone}>{st.label}</Badge>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          )}
          <p className="text-xs text-muted-foreground">
            Le diplôme officiel (et la carte professionnelle, le cas échéant) est remis à votre salarié
            par l&apos;organisme de formation. Le statut ci-dessus en suit l&apos;avancement.
          </p>
        </>
      )}
    </div>
  );
}
