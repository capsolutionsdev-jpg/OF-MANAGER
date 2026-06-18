import Link from "next/link";
import { FileText, FileDown, FolderOpen, ExternalLink, Paperclip } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const DOC_LABELS: Record<string, string> = {
  FICHE_INSCRIPTION: "Fiche d'inscription",
  CONTRAT_FORMATION: "Contrat de formation",
  CONVENTION_FORMATION: "Convention de formation",
  CONVOCATION: "Convocation",
  CONVOCATION_EXAMEN: "Convocation à l'examen",
  PROGRAMME: "Programme",
  ATTESTATION_ENTREE: "Attestation d'entrée",
  ATTESTATION_FIN: "Attestation de fin de formation",
  ATTESTATION_REUSSITE: "Attestation de réussite",
  CERTIFICAT_REALISATION: "Certificat de réalisation",
};
const docLabel = (t: string) => DOC_LABELS[t] ?? t.replace(/_/g, " ").toLowerCase();

export default async function MesDocumentsPage() {
  const db = await getTenantDb();
  const session = await auth();
  const apprenant = session?.user?.id
    ? await db.apprenant.findUnique({ where: { userId: session.user.id }, select: { candidatId: true } })
    : null;

  if (!apprenant) {
    return (
      <div className="space-y-4">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <FileText className="h-6 w-6" /> Mes documents
        </h1>
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            Aucun espace apprenant associé à ce compte. Contactez votre organisme de formation.
          </CardContent>
        </Card>
      </div>
    );
  }

  const inscriptions = await db.inscription.findMany({
    where: { candidatId: apprenant.candidatId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, accessToken: true,
      session: { select: { dateDebut: true, dateFin: true, formation: { select: { titre: true } } } },
      documents: {
        orderBy: { createdAt: "desc" },
        select: { id: true, type: true, fileUrl: true, createdAt: true },
      },
    },
  });

  const pieces = await db.pieceJointe.findMany({
    where: { candidatId: apprenant.candidatId },
    orderBy: { createdAt: "desc" },
    select: { id: true, label: true, url: true, mimeType: true },
  });

  const fmt = (d: Date) => d.toLocaleDateString("fr-FR");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <FileText className="h-6 w-6" /> Mes documents
        </h1>
        <p className="text-sm text-muted-foreground">
          Vos documents d&apos;inscription et de formation, et les pièces de votre dossier.
        </p>
      </div>

      {inscriptions.length === 0 && (
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Aucune formation enregistrée.</CardContent></Card>
      )}

      {inscriptions.map((i) => (
        <Card key={i.id}>
          <CardHeader>
            <CardTitle className="text-base">{i.session.formation.titre}</CardTitle>
            <p className="text-xs text-muted-foreground">
              Du {fmt(i.session.dateDebut)} au {fmt(i.session.dateFin)}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {i.documents.length > 0 ? (
              <ul className="space-y-1">
                {i.documents.map((d) => (
                  <li key={d.id} className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1">{docLabel(d.type)}</span>
                    {d.fileUrl ? (
                      <a href={d.fileUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline">
                        <FileDown className="h-3.5 w-3.5" /> Télécharger
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">Disponible auprès de l&apos;organisme</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Vos documents signés vous ont été envoyés par e-mail.
              </p>
            )}
            {i.accessToken && (
              <Link href={`/parcours/${i.accessToken}`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                <ExternalLink className="h-4 w-4" /> Mon parcours d&apos;inscription
              </Link>
            )}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderOpen className="h-5 w-5 text-primary" /> Mon dossier administratif
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pieces.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune pièce déposée.</p>
          ) : (
            <ul className="space-y-1">
              {pieces.map((p) => (
                <li key={p.id} className="flex items-center gap-2 text-sm">
                  <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1">{p.label}</span>
                  <a href={p.url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline">
                    <FileDown className="h-3.5 w-3.5" /> {p.mimeType?.includes("pdf") ? "PDF" : "Voir"}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
