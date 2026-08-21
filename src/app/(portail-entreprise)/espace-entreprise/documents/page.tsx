import { FileText, FileDown } from "lucide-react";
import { requireEntreprise } from "@/lib/entreprise-portal";
import { getEntrepriseDocuments } from "@/lib/entreprise-data";
import { RubriqueHeader, EmptyState, Badge, fmtDate, documentTypeLabel } from "@/components/entreprise/portal-ui";

export const dynamic = "force-dynamic";

type Doc = Awaited<ReturnType<typeof getEntrepriseDocuments>>[number];

export default async function DocumentsPage() {
  const entreprise = await requireEntreprise();
  const docs = await getEntrepriseDocuments(entreprise.id);

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
        subtitle="Convocations, attestations et certificats de vos salariés."
      />
      {docs.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-8 w-8" />}
          title="Aucun document"
          hint="Les documents (convocations, attestations, certificats) seront mis à disposition ici."
        />
      ) : (
        [...groups.entries()].map(([name, items]) => (
          <section key={name} className="space-y-2">
            <h3 className="text-sm font-semibold">{name}</h3>
            <div className="overflow-hidden rounded-xl border">
              <ul className="divide-y">
                {items.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge tone="info">{documentTypeLabel(d.type)}</Badge>
                        <span className="text-sm text-muted-foreground">{d.session?.formation.titre}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">Émis le {fmtDate(d.createdAt)}</p>
                    </div>
                    {d.fileUrl ? (
                      <a
                        href={`/espace-entreprise/download?kind=document&id=${d.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted"
                      >
                        <FileDown className="h-4 w-4" />
                        Télécharger
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">Auprès de l&apos;organisme</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ))
      )}
    </div>
  );
}
