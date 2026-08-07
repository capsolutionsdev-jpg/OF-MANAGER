import { Award, FileDown, GraduationCap, Medal } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { getCurrentApprenant } from "@/lib/candidat-portal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

const CERT_LABELS: Record<string, string> = {
  ATTESTATION_ENTREE: "Attestation d'entrée en formation",
  ATTESTATION_FIN: "Attestation de fin de formation",
  ATTESTATION_REUSSITE: "Attestation de réussite",
  ATTESTATION_RECYCLAGE: "Attestation de recyclage",
  ATTESTATION_REMISE_NIVEAU: "Attestation de remise à niveau",
  CERTIFICAT_REALISATION: "Certificat de réalisation",
};
const isCert = (t: string) => t.startsWith("ATTESTATION") || t.startsWith("CERTIFICAT");
const fmt = (d: Date) => d.toLocaleDateString("fr-FR");

export default async function MesCertificatsPage() {
  const apprenant = await getCurrentApprenant();
  if (!apprenant) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Mes certificats</h1>
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Aucun dossier candidat associé.</CardContent></Card>
      </div>
    );
  }

  const db = await getTenantDb();
  const inscriptions = await db.inscription.findMany({
    where: { candidatId: apprenant.candidatId, statut: { not: "ANNULEE" } },
    select: {
      id: true,
      session: { select: { formation: { select: { titre: true } } } },
      documents: { select: { id: true, type: true, fileUrl: true, createdAt: true } },
    },
  });
  const inscriptionIds = inscriptions.map((i) => i.id);
  const diplomes = inscriptionIds.length
    ? await db.diplome.findMany({
        where: { inscriptionId: { in: inscriptionIds } },
        select: { id: true, statut: true, numeroDiplome: true, remisAt: true, formationId: true },
      })
    : [];

  const certs = inscriptions.flatMap((i) =>
    i.documents.filter((d) => isCert(d.type)).map((d) => ({
      ...d, formation: i.session.formation.titre,
    })),
  );
  const diplomesRemis = diplomes.filter((d) => d.statut === "REMIS");
  const rien = certs.length === 0 && diplomesRemis.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Award className="h-6 w-6" /> Mes certificats
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Vos attestations, certificats de réalisation et diplômes officiels.</p>
      </div>

      {rien ? (
        <Card>
          <EmptyState icon={Medal} title="Aucun certificat pour le moment"
            description="Vos attestations et certificats apparaîtront ici une fois votre formation validée." />
        </Card>
      ) : (
        <>
          {diplomesRemis.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Medal className="h-5 w-5 text-primary" /> Diplômes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {diplomesRemis.map((d) => (
                  <div key={d.id} className="flex items-center gap-2 text-sm">
                    <GraduationCap className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span className="flex-1">
                      Diplôme{d.numeroDiplome ? ` n° ${d.numeroDiplome}` : ""}
                      {d.remisAt ? ` — remis le ${fmt(d.remisAt)}` : ""}
                    </span>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">Remis</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {certs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Award className="h-5 w-5 text-primary" /> Attestations &amp; certificats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {certs.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 text-sm">
                    <Award className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1">{CERT_LABELS[c.type] ?? c.type} — {c.formation}</span>
                    {c.fileUrl ? (
                      <a href={c.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                        <FileDown className="h-3.5 w-3.5" /> Télécharger
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">Auprès de l&apos;organisme</span>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
