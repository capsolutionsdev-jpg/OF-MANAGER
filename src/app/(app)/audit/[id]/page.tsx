import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { dossierChecklist, dossierConformite } from "@/lib/audit/dossier";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AuditDossiers, type DossierDto } from "@/components/audit/audit-dossiers";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  INTERNE: "Interne",
  CONTROLE: "Contrôle externe",
  ALEATOIRE: "Aléatoire",
};

export default async function AuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getTenantDb();
  const audit = await db.auditControle.findUnique({
    where: { id },
    // inscriptionId est scalaire : les inscriptions sont chargées à part (ci-dessous).
    include: { dossiers: { orderBy: { createdAt: "asc" } } },
  });
  if (!audit) notFound();

  // Charge les inscriptions liées (avec l'état nécessaire à la checklist).
  const inscriptionIds = audit.dossiers.map((d) => d.inscriptionId);
  const inscriptions = inscriptionIds.length
    ? await db.inscription.findMany({
        where: { id: { in: inscriptionIds } },
        select: {
          id: true,
          signedAt: true,
          piecesRecues: true,
          positionnementCompletedAt: true,
          convocationSentAt: true,
          satisfactionCompletedAt: true,
          resultatCertification: true,
          attestationReussiteSentAt: true,
          candidat: { select: { nom: true, prenom: true, email: true } },
          session: {
            select: {
              formation: { select: { piecesAttendues: true, examen: true, positionnementQuestions: true } },
            },
          },
        },
      })
    : [];
  const byId = new Map(inscriptions.map((i) => [i.id, i]));

  const dossiers: DossierDto[] = audit.dossiers
    .map((d) => {
      const i = byId.get(d.inscriptionId);
      if (!i) return null;
      const checks = dossierChecklist({
        signedAt: i.signedAt,
        piecesRecues: i.piecesRecues,
        positionnementCompletedAt: i.positionnementCompletedAt,
        convocationSentAt: i.convocationSentAt,
        satisfactionCompletedAt: i.satisfactionCompletedAt,
        resultatCertification: i.resultatCertification,
        attestationReussiteSentAt: i.attestationReussiteSentAt,
        formation: i.session.formation,
      });
      const conf = dossierConformite(checks);
      return {
        id: d.id,
        inscriptionId: d.inscriptionId,
        nom: `${i.candidat.prenom} ${i.candidat.nom}`.trim(),
        email: i.candidat.email,
        statut: d.statut,
        relanceSentAt: d.relanceSentAt ? d.relanceSentAt.toISOString() : null,
        relanceCount: d.relanceCount,
        checks,
        pct: conf.pct,
        conforme: conf.conforme,
        aTraiter: conf.aTraiter,
      } satisfies DossierDto;
    })
    .filter((x): x is DossierDto => x !== null);

  const conformes = dossiers.filter((d) => d.conforme).length;
  const total = dossiers.length;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/audit" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour aux audits
        </Link>
        <PageHeader title={audit.titre} subtitle={`Audit ${TYPE_LABEL[audit.type] ?? audit.type} · ${audit.perimetre === "SESSION" ? "session" : "dossier"} · créé le ${audit.createdAt.toLocaleDateString("fr-FR")}`}>
          <Badge
            className={audit.statut === "TERMINE" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-sky-500/10 text-sky-700 dark:text-sky-300"}
          >
            {audit.statut === "TERMINE" ? "Terminé" : "En cours"}
          </Badge>
        </PageHeader>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 py-4 text-sm">
          <span className="font-medium">{total} dossier(s)</span>
          <span className="text-emerald-600 dark:text-emerald-400">{conformes} conforme(s)</span>
          <span className="text-amber-600 dark:text-amber-400">{total - conformes} à traiter</span>
          {audit.responsableNom && <span className="ml-auto text-muted-foreground">Responsable : {audit.responsableNom}</span>}
        </CardContent>
      </Card>

      <AuditDossiers dossiers={dossiers} />
    </div>
  );
}
