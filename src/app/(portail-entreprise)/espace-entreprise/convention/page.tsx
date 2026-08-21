import { FileSignature, FileDown, CheckCircle2 } from "lucide-react";
import { requireEntreprise } from "@/lib/entreprise-portal";
import { getEntrepriseConventions } from "@/lib/entreprise-data";
import { RubriqueHeader, EmptyState, Badge, fmtDate, fmtEuro } from "@/components/entreprise/portal-ui";
import { ConventionUpload } from "@/components/entreprise/convention-upload";

export const dynamic = "force-dynamic";

type Conv = Awaited<ReturnType<typeof getEntrepriseConventions>>[number];

function statut(c: Conv): { label: string; tone: "neutral" | "success" | "warning" | "info" } {
  if (c.signatureStatut === "SIGNEE") return { label: "Validée", tone: "success" };
  if (c.fileUrlSigne) return { label: "Signée déposée — en attente de validation", tone: "info" };
  return { label: "À signer", tone: "warning" };
}

export default async function ConventionPage() {
  const entreprise = await requireEntreprise();
  const conventions = await getEntrepriseConventions(entreprise.id);

  return (
    <div className="space-y-4">
      <RubriqueHeader
        title="Conventions de formation"
        subtitle="Téléchargez la convention, faites-la signer et tamponner, puis redéposez la version signée (ou renvoyez-la par e-mail à votre organisme)."
      />

      {conventions.length === 0 ? (
        <EmptyState
          icon={<FileSignature className="h-8 w-8" />}
          title="Aucune convention"
          hint="Une convention est générée dès que votre organisme confirme une demande d'inscription."
        />
      ) : (
        <div className="grid gap-3">
          {conventions.map((c) => {
            const s = statut(c);
            return (
              <div key={c.id} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{c.session?.formation.titre ?? c.reference}</p>
                    <p className="text-xs text-muted-foreground">
                      Réf. {c.reference}
                      {c.session?.dateDebut ? ` · ${fmtDate(c.session.dateDebut)}` : ""}
                      {c.montant != null ? ` · ${fmtEuro(c.montant)}` : ""}
                    </p>
                  </div>
                  <Badge tone={s.tone}>{s.label}</Badge>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
                  {c.fileUrl ? (
                    <a
                      href={`/espace-entreprise/download?kind=convention&id=${c.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted"
                    >
                      <FileDown className="h-4 w-4" />
                      Télécharger la convention
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">Convention en préparation…</span>
                  )}

                  {c.signatureStatut === "SIGNEE" ? (
                    <span className="inline-flex items-center gap-1.5 text-sm text-success">
                      <CheckCircle2 className="h-4 w-4" /> Convention validée
                    </span>
                  ) : c.fileUrlSigne ? (
                    <a
                      href={`/espace-entreprise/download?kind=convention-signe&id=${c.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted"
                    >
                      <FileDown className="h-4 w-4" />
                      Version signée déposée
                    </a>
                  ) : (
                    c.fileUrl && <ConventionUpload conventionId={c.id} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
