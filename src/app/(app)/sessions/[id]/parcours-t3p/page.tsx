import { notFound, redirect } from "next/navigation";
import { getSessionDetail } from "@/lib/sessions/detail";
import { getTenantDb } from "@/lib/tenant";
import { hasStrictFeature } from "@/lib/feature-guard";
import { T3P_METIER_LABELS } from "@/lib/t3p";
import { SessionDetailHeader } from "@/components/sessions/session-detail-header";
import {
  SessionT3PParticipants,
  type SessionT3PParticipant,
} from "@/components/t3p/session-t3p-participants";
import { Card, CardContent } from "@/components/ui/card";
import type { ParcoursDto } from "@/components/t3p/parcours-t3p-panel";

/**
 * Onglet « Parcours T3P » d'une session Taxi/VTC : suivi de l'examen CMA pour
 * chaque participant (11 étapes, épreuves, échéances). Le parcours s'ouvre
 * automatiquement à l'inscription ; il reste ouvrable à la main ici.
 */
export default async function SessionParcoursT3PPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await hasStrictFeature("parcours-t3p"))) redirect("/dashboard");

  const { id } = await params;
  const detail = await getSessionDetail(id);
  if (!detail) notFound();
  const { s, t3pMetier, t3pTab } = detail;
  // Session non Taxi/VTC : pas d'onglet (accès direct à l'URL → retour à la session).
  if (!t3pTab || !t3pMetier) redirect(`/sessions/${id}`);

  const db = await getTenantDb();
  const candidatIds = s.inscriptions.map((i) => i.candidatId);
  const parcoursList =
    candidatIds.length > 0
      ? await db.parcoursT3P.findMany({
          where: { candidatId: { in: candidatIds }, metier: t3pMetier },
          include: {
            epreuves: { orderBy: [{ type: "asc" }, { tentative: "asc" }] },
            inscription: {
              select: {
                id: true,
                session: { select: { id: true, formation: { select: { titre: true } } } },
              },
            },
          },
        })
      : [];

  const parcoursParCandidat = new Map<string, ParcoursDto>();
  for (const p of parcoursList) {
    parcoursParCandidat.set(p.candidatId, {
      ...p,
      fraisMontant: p.fraisMontant ? p.fraisMontant.toString() : null,
    });
  }

  // Un participant par inscription (hors annulées), dédupliqué par candidat.
  const vus = new Set<string>();
  const participants: SessionT3PParticipant[] = [];
  for (const i of s.inscriptions) {
    if (i.statut === "ANNULEE" || vus.has(i.candidatId)) continue;
    vus.add(i.candidatId);
    participants.push({
      candidatId: i.candidatId,
      nom: i.candidat.nom,
      prenom: i.candidat.prenom,
      statutInscription: i.statut,
      parcours: parcoursParCandidat.get(i.candidatId) ?? null,
    });
  }

  return (
    <div className="space-y-6">
      <SessionDetailHeader
        session={{
          id: s.id,
          titre: s.formation.titre,
          statut: s.statut,
          nbFormateurs: s.formateurs.length,
        }}
        active="parcours-t3p"
        showT3P
      />

      <Card>
        <CardContent className="py-4 text-sm text-muted-foreground">
          Parcours d&apos;accès à la profession de{" "}
          <span className="font-medium text-foreground">{T3P_METIER_LABELS[t3pMetier]}</span> (examen
          CMA) pour les {participants.length}&nbsp;participant(s) de la session. Chaque parcours
          couvre les 11 étapes — des prérequis à la carte professionnelle — avec les
          échéances réglementaires (délai d&apos;1 an après l&apos;admissibilité, 3 présentations
          max à l&apos;admission).
        </CardContent>
      </Card>

      <SessionT3PParticipants participants={participants} metier={t3pMetier} />
    </div>
  );
}
