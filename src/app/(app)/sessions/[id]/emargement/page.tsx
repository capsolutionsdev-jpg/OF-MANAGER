import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, CalendarPlus, CheckCircle2, Clock, PenLine } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { genererSeances } from "@/lib/actions/emargement-actions";
import { PresenceCell } from "@/components/emargement/presence-cell";
import { PrepareSignaturesButton } from "@/components/emargement/prepare-signatures-button";
import { SendEmargementLinkButton } from "@/components/emargement/send-emargement-link-button";

export default async function EmargementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const s = await prisma.session.findUnique({
    where: { id },
    include: {
      formation: true,
      seances: { orderBy: { date: "asc" }, include: { presences: true } },
      inscriptions: { include: { candidat: true } },
      emargementSignatures: { orderBy: [{ date: "asc" }, { demi: "asc" }] },
    },
  });
  if (!s) notFound();

  const fmt = (d: Date) => d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const fmtCourt = (d: Date) => d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  const participants = s.inscriptions.filter((i) => i.apprenantId);

  // ── Récapitulatif des signatures d'émargement ──
  const sigs = s.emargementSignatures;
  const sigDone = sigs.filter((e) => e.signedAt).length;
  const sigTotal = sigs.length;
  // Groupement par jour → demi-journée
  type Sig = (typeof sigs)[number];
  const groups = new Map<string, { date: Date; demi: string; rows: Sig[] }>();
  for (const e of sigs) {
    const k = `${e.date.toISOString().slice(0, 10)}|${e.demi}`;
    if (!groups.has(k)) groups.set(k, { date: e.date, demi: e.demi, rows: [] });
    groups.get(k)!.rows.push(e);
  }
  const groupList = [...groups.values()];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/sessions/${s.id}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Retour à la session
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Émargement</h1>
            <p className="text-sm text-muted-foreground">
              {s.formation.titre} — {s.inscriptions.length} inscrit
              {s.inscriptions.length > 1 ? "s" : ""}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <PrepareSignaturesButton sessionId={s.id} />
            <Button
              variant="outline"
              render={
                <Link href={`/sessions/${s.id}/emargement/feuille`} target="_blank" />
              }
            >
              <FileText className="mr-2 h-4 w-4" /> Feuille complète (à imprimer)
            </Button>
          </div>
        </div>
      </div>

      {/* Récapitulatif des signatures (faites / manquantes + relance) */}
      {sigTotal > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
              <span className="flex items-center gap-2">
                <PenLine className="h-4 w-4" /> Suivi des signatures d&apos;émargement
              </span>
              <Badge
                className={
                  sigDone === sigTotal
                    ? "bg-emerald-500/10 text-emerald-700"
                    : "bg-amber-500/10 text-amber-700"
                }
              >
                {sigDone}/{sigTotal} signées
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {groupList.map((g) => (
              <div key={`${g.date.toISOString()}|${g.demi}`}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {fmtCourt(g.date)} — {g.demi === "MATIN" ? "Matin" : "Après-midi"}
                </p>
                <ul className="space-y-1.5">
                  {g.rows.map((e) => (
                    <li
                      key={e.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-sm"
                    >
                      <span className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase"
                        >
                          {e.role === "FORMATEUR" ? "Formateur" : "Stagiaire"}
                        </Badge>
                        <span className="font-medium">{e.nom}</span>
                        {e.signedAt ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" /> signé à{" "}
                            {e.signedAt.toLocaleTimeString("fr-FR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        ) : e.sentAt ? (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                            <Clock className="h-3.5 w-3.5" /> lien envoyé — en attente
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            non envoyé
                          </span>
                        )}
                      </span>
                      {!e.signedAt && (
                        <SendEmargementLinkButton
                          emargementId={e.id}
                          sent={!!e.sentAt}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {s.seances.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <CalendarPlus className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">Aucune séance générée</p>
            <p className="text-sm text-muted-foreground">
              Générez automatiquement une séance par jour sur la période de la session.
              Les dossiers apprenants des inscrits seront créés au passage.
            </p>
            <form action={genererSeances.bind(null, s.id)}>
              <Button type="submit" className="mt-2">
                <CalendarPlus className="mr-2 h-4 w-4" /> Générer les séances
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {s.seances.map((seance) => (
            <Card key={seance.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base capitalize">{fmt(seance.date)}</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href={`/emargement/${seance.id}`} target="_blank" />}
                >
                  <FileText className="mr-2 h-4 w-4" /> Feuille d&apos;émargement
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {participants.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aucun participant. Inscrivez des candidats à la session.
                  </p>
                ) : (
                  participants.map((insc) => {
                    const presence = seance.presences.find(
                      (p) => p.apprenantId === insc.apprenantId,
                    );
                    return (
                      <div
                        key={insc.id}
                        className="flex items-center justify-between gap-3 border-b py-2 last:border-0"
                      >
                        <span className="text-sm">
                          {insc.candidat.prenom} {insc.candidat.nom}
                        </span>
                        <PresenceCell
                          seanceId={seance.id}
                          apprenantId={insc.apprenantId as string}
                          statut={presence?.statut ?? null}
                        />
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
