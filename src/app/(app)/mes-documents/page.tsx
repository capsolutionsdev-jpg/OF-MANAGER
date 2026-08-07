import Link from "next/link";
import { FileText, FileDown, FolderOpen, ExternalLink, Paperclip, Award, GraduationCap } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { auth } from "@/auth";
import { coursComplete } from "@/lib/elearning";
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
    ? await db.apprenant.findUnique({ where: { userId: session.user.id }, select: { id: true, candidatId: true } })
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
    select: { id: true, label: true, url: true, mimeType: true, statut: true, motifRefus: true },
  });
  const piecePill: Record<string, string> = {
    EN_ATTENTE: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    VALIDEE: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    REFUSEE: "bg-red-500/10 text-red-700 dark:text-red-300",
  };
  const pieceLabel: Record<string, string> = { EN_ATTENTE: "À vérifier", VALIDEE: "Validée", REFUSEE: "Refusée" };

  // Attestations e-learning : cours terminés (leçons + quiz réussis) → téléchargeables.
  const acces = await db.coursApprenant.findMany({
    where: { apprenantId: apprenant.id },
    select: {
      cours: {
        select: {
          id: true, titre: true,
          modules: { select: { lecons: { where: { isPublished: true }, select: { id: true, quizJson: true } } } },
        },
      },
    },
  });
  const [progressAll, quizAll] = await Promise.all([
    db.progressionLecon.findMany({ where: { apprenantId: apprenant.id }, select: { leconId: true } }),
    db.quizResultat.findMany({ where: { apprenantId: apprenant.id }, select: { leconId: true, score: true, total: true } }),
  ]);
  const doneSet = new Set(progressAll.map((p) => p.leconId));
  const attestations = acces
    .map((a) => a.cours)
    .filter((c) => coursComplete(c.modules.flatMap((m) => m.lecons), doneSet, quizAll));

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

      {attestations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="h-5 w-5 text-primary" /> Mes attestations e-learning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {attestations.map((c) => (
                <li key={c.id} className="flex items-center gap-2 text-sm">
                  <GraduationCap className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1">{c.titre}</span>
                  <a href={`/mes-cours/${c.id}/attestation`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline">
                    <FileDown className="h-3.5 w-3.5" /> Attestation
                  </a>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

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
                <li key={p.id} className="text-sm">
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1">{p.label}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${piecePill[p.statut]}`}>{pieceLabel[p.statut]}</span>
                    <a href={`/api/public/piece/${p.id}`} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline">
                      <FileDown className="h-3.5 w-3.5" /> {p.mimeType?.includes("pdf") ? "PDF" : "Voir"}
                    </a>
                  </div>
                  {p.statut === "REFUSEE" && p.motifRefus && (
                    <p className="pl-6 text-[11px] text-red-600">Refusée : {p.motifRefus} — merci de la redéposer via votre lien d&apos;inscription.</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
