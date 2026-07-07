import { getTenantDb } from "@/lib/tenant";
import { PageHeader } from "@/components/ui/page-header";
import { JurysManager } from "@/components/jury/jurys-manager";

export const dynamic = "force-dynamic";

export default async function JurysPage() {
  const db = await getTenantDb();
  const fmt = (d: Date) => d.toLocaleDateString("fr-FR");

  const [jurys, sessions, affectations] = await Promise.all([
    db.jury.findMany({ orderBy: [{ nom: "asc" }, { prenom: "asc" }] }),
    db.session.findMany({
      where: { formation: { soumisJury: true } },
      orderBy: { dateDebut: "desc" },
      include: { formation: { select: { titre: true, nbJury: true } } },
    }),
    db.juryAffectation.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        jury: { select: { nom: true, prenom: true, email: true, qualite: true } },
        session: { include: { formation: { select: { titre: true } } } },
      },
    }),
  ]);

  const juryOptions = jurys.map((j) => ({
    id: j.id, nom: j.nom, prenom: j.prenom, email: j.email, telephone: j.telephone,
    qualite: j.qualite, actif: j.actif,
  }));

  const sessionOptions = sessions.map((s) => ({
    id: s.id,
    label: `${s.formation.titre} — ${fmt(s.dateDebut)}`,
    nbJury: s.formation.nbJury,
    dateExamen: (s.dateExamen ?? s.dateDebut).toISOString().slice(0, 10),
  }));

  const rows = affectations.map((a) => ({
    id: a.id,
    sessionId: a.sessionId,
    sessionLabel: `${a.session.formation.titre} — ${fmt(a.session.dateDebut)}`,
    juryNom: `${a.jury.prenom} ${a.jury.nom}`,
    juryEmail: a.jury.email,
    juryQualite: a.jury.qualite,
    prixEuros: (a.prixCents / 100).toFixed(2),
    natureExamen: a.natureExamen,
    statut: a.statut as "A_PAYER" | "PAYE",
    defraiementSent: !!a.defraiementSentAt,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jurys"
        subtitle="Annuaire des jurés, affectation par session avec défraiement personnalisé, suivi des paiements et envoi des notes de défraiement."
      />
      {sessions.length === 0 && jurys.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          Aucune formation soumise à un jury. Cochez « Examen soumis à un jury » sur une formation
          pour activer l&apos;affectation des jurés à ses sessions.
        </div>
      ) : (
        <JurysManager jurys={juryOptions} sessions={sessionOptions} affectations={rows} />
      )}
    </div>
  );
}
