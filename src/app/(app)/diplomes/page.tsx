import Link from "next/link";
import { Award, ShieldCheck, ListChecks } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { ssiapDiplomeNiveau } from "@/lib/documents/titres";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { DiplomesManager } from "@/components/diplomes/diplomes-manager";

export const dynamic = "force-dynamic";

export default async function DiplomesPage() {
  const db = await getTenantDb();

  const [diplomes, sessions, formations] = await Promise.all([
    db.diplome.findMany({ orderBy: { createdAt: "desc" } }),
    db.session.findMany({
      where: { formation: { diplomante: true } },
      orderBy: { dateDebut: "desc" },
      include: {
        formation: { select: { id: true, titre: true } },
        inscriptions: {
          where: { statut: { not: "ANNULEE" } },
          include: { candidat: { select: { nom: true, prenom: true } } },
        },
      },
    }),
    db.formation.findMany({ where: { diplomante: true }, select: { id: true, titre: true, reference: true } }),
  ]);

  // Dates des sessions rattachées aux diplômes (le modèle Diplome n'a qu'un sessionId
  // scalaire, sans relation) → requête ciblée pour le regroupement PAR SESSION.
  const diplomeSessionIds = [...new Set(diplomes.map((d) => d.sessionId).filter(Boolean) as string[])];
  const sessionDate = new Map(
    diplomeSessionIds.length
      ? (
          await db.session.findMany({
            where: { id: { in: diplomeSessionIds } },
            select: { id: true, dateDebut: true },
          })
        ).map((s) => [s.id, s.dateDebut] as const)
      : [],
  );

  const formationTitre = new Map(formations.map((f) => [f.id, f.titre]));
  // Un diplôme n'a une trame officielle téléchargeable que s'il est SSIAP 1/2/3.
  const formationEstSsiap = new Map(
    formations.map((f) => [f.id, ssiapDiplomeNiveau({ reference: f.reference, titre: f.titre }) != null]),
  );
  const dejaDiplome = new Set(diplomes.map((d) => d.inscriptionId).filter(Boolean) as string[]);
  const fmt = (d: Date) => d.toLocaleDateString("fr-FR");

  const sessionOptions = sessions.map((s) => ({
    id: s.id,
    label: `${s.formation.titre} — ${fmt(s.dateDebut)}`,
    formationId: s.formation.id,
    formationTitre: s.formation.titre,
    inscrits: s.inscriptions.map((i) => ({
      inscriptionId: i.id,
      nom: i.candidat.nom,
      prenom: i.candidat.prenom,
      deja: dejaDiplome.has(i.id),
    })),
  }));

  const rows = diplomes.map((d) => {
    const ftitre = d.formationId ? formationTitre.get(d.formationId) ?? null : null;
    const sDate = d.sessionId ? sessionDate.get(d.sessionId) ?? null : null;
    // Regroupement PAR SESSION (repli formation / « sans formation »).
    const hasSession = Boolean(d.sessionId && sDate);
    const groupKey = hasSession ? `s:${d.sessionId}` : d.formationId ? `f:${d.formationId}` : "none";
    const groupLabel = hasSession
      ? `${ftitre ?? "Formation"} — session du ${fmt(sDate!)}`
      : ftitre
        ? `${ftitre} — sans session`
        : "Sans formation";
    return {
      id: d.id,
      nom: d.nom,
      prenom: d.prenom,
      dateNaissance: d.dateNaissance ? d.dateNaissance.toISOString().slice(0, 10) : null,
      lieuNaissance: d.lieuNaissance,
      numeroDiplome: d.numeroDiplome,
      statut: d.statut,
      ssiap: d.formationId ? formationEstSsiap.get(d.formationId) ?? false : false,
      groupKey,
      groupLabel,
      groupDate: hasSession ? sDate!.toISOString() : null,
      remiseParNom: d.remiseParNom,
      remisAt: d.remisAt ? fmt(d.remisAt) : null,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Diplômes"
        subtitle="Suivi des diplômes par session (envoyé au certificateur → reçu → remis). Pour un diplôme SSIAP, saisissez la séquence du PV : le numéro complet est composé et rendu vérifiable en ligne."
      >
        <Button variant="outline" render={<Link href="/diplomes/agrements" />}>
          <ShieldCheck className="mr-2 h-4 w-4" /> Agréments
        </Button>
        <Button variant="outline" render={<Link href="/diplomes/titres" />}>
          <ListChecks className="mr-2 h-4 w-4" /> Registre des titres
        </Button>
      </PageHeader>
      {formations.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <Award className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="font-medium">Aucune formation diplômante</p>
          <p className="text-sm text-muted-foreground">
            Cochez « Formation diplômante » sur une formation pour activer le suivi des diplômes.
          </p>
        </div>
      ) : (
        <DiplomesManager diplomes={rows} sessions={sessionOptions} formations={formations} />
      )}
    </div>
  );
}
