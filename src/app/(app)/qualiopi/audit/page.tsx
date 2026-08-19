import Link from "next/link";
import { ArrowLeft, ClipboardCheck } from "lucide-react";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import { orgConfigFor } from "@/lib/org-identity";
import { auditSession } from "@/lib/qualiopi/audit";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TONE_TEXT } from "@/components/ui/status-badge";
import { QualiopiAuditList, type AuditRow } from "@/components/qualiopi/qualiopi-audit-list";

export const dynamic = "force-dynamic";

const fdate = (d: Date) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

export default async function QualiopiAuditPage() {
  const session = await auth();
  const organismeId = session?.user?.organismeId ?? null;
  const db = await getTenantDb();

  const [sessions, org] = await Promise.all([
    db.session.findMany({
      where: { isArchived: false, statut: { not: "ANNULEE" } },
      orderBy: { dateDebut: "desc" },
      take: 80,
      select: {
        id: true, reference: true, statut: true, dateDebut: true, dateFin: true, crFormateurCompletedAt: true,
        formation: {
          select: {
            titre: true, objectifs: true, programme: true, prerequis: true, publicVise: true,
            modalitesEvaluation: true, dureeHeures: true, tarif: true, positionnementQuestions: true,
          },
        },
        _count: { select: { formateurs: true } },
        emargementSignatures: { select: { signedAt: true } },
        inscriptions: {
          select: {
            positionnementCompletedAt: true, convocationSentAt: true, resultatCertification: true,
            attestationReussiteSentAt: true, satisfactionCompletedAt: true, suivi6moisCompletedAt: true,
          },
        },
      },
    }),
    orgConfigFor(organismeId),
  ]);

  const now = new Date();
  const referentHandicap = !!(org.referentHandicapNom || org.referentHandicapContact);

  const audited = sessions.map((s) => {
    const pq = s.formation.positionnementQuestions;
    const hasPositionnement = Array.isArray(pq) ? pq.length > 0 : !!pq;
    const result = auditSession({
      now,
      session: {
        statut: s.statut,
        dateDebut: s.dateDebut,
        dateFin: s.dateFin,
        formateurCount: s._count.formateurs,
        emargementTotal: s.emargementSignatures.length,
        emargementSignes: s.emargementSignatures.filter((e) => e.signedAt).length,
        crFormateurCompletedAt: s.crFormateurCompletedAt,
      },
      formation: {
        objectifs: s.formation.objectifs,
        programme: s.formation.programme,
        prerequis: s.formation.prerequis,
        publicVise: s.formation.publicVise,
        modalitesEvaluation: s.formation.modalitesEvaluation,
        dureeHeures: s.formation.dureeHeures,
        tarif: s.formation.tarif != null ? Number(s.formation.tarif) : null,
        hasPositionnement,
      },
      inscriptions: s.inscriptions,
      org: { referentHandicap },
    });
    const row: AuditRow = {
      id: s.id,
      titre: s.formation.titre,
      reference: s.reference,
      periode: `${fdate(s.dateDebut)} → ${fdate(s.dateFin)}`,
      statut: s.statut,
      score: result.score,
      nbAComplete: result.nbAComplete,
      checks: result.checks,
    };
    return row;
  });

  const nbConformes = audited.filter((r) => r.nbAComplete === 0).length;
  const aCompleter = audited.filter((r) => r.nbAComplete > 0);
  const moyenne = audited.length ? Math.round(audited.reduce((s, r) => s + r.score, 0) / audited.length) : 100;

  // À compléter en premier, puis par période récente.
  const rows = [...audited].sort((a, b) => b.nbAComplete - a.nbAComplete);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit automatique des dossiers"
        subtitle="Conformité Qualiopi déduite de vos données réelles, dossier par dossier (aucune saisie manuelle)."
      >
        <Button variant="outline" size="sm" render={<Link href="/qualiopi" />}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Indicateurs
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Stat label="Dossiers audités" value={String(audited.length)} />
        <Stat label="Conformité moyenne" value={`${moyenne}%`} tone={moyenne >= 90 ? "pos" : moyenne >= 70 ? "warn" : "neg"} />
        <Stat label="Dossiers à compléter" value={String(aCompleter.length)} tone={aCompleter.length ? "warn" : "pos"} />
      </div>

      {!referentHandicap && (
        <Card className="border-warning/40">
          <CardContent className="flex items-start gap-3 p-4 text-sm">
            <ClipboardCheck className="mt-0.5 h-5 w-5 text-warning" />
            <div>
              <p className="font-medium">Référent handicap non renseigné (indicateur 26)</p>
              <p className="text-muted-foreground">
                Ce point concerne tous vos dossiers. Renseignez le référent handicap dans les paramètres de l&apos;organisme.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <p className="mb-2 text-sm text-muted-foreground">
          {nbConformes} dossier(s) conforme(s) · {aCompleter.length} à compléter. Cliquez pour voir le détail.
        </p>
        <QualiopiAuditList rows={rows} />
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "pos" | "warn" | "neg" }) {
  const color =
    tone === "pos" ? TONE_TEXT.success :
    tone === "warn" ? TONE_TEXT.warning :
    tone === "neg" ? TONE_TEXT.danger : "";
  return (
    <Card>
      <CardContent className="pt-5">
        <p className={`text-3xl font-bold ${color}`}>{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
