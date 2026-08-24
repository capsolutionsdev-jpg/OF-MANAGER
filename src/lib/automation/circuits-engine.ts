import "server-only";
import { prisma } from "@/lib/prisma";
import { sendEmail, emailConfigured } from "@/lib/email";
import { EmailStatut } from "@prisma/client";
import { dueSteps, fillBalises, recipientFor, ACTION_LABELS, type StepLike } from "@/lib/automation/circuits";

// Exécuteur des CIRCUITS d'automatisation (studio visuel), EN PLUS du moteur
// Qualiopi (automation-engine.ts). Seuls les circuits `actif=true` tournent ;
// idempotence par CircuitStepRun @@unique([stepId, inscriptionId]).
//
// Lot 3 : audiences APPRENANT + ENTREPRISE (par apprenant), action EMAIL pleine
// (sujet/corps + balises). Les autres types envoient un e-mail de notification
// avec le libellé de l'action. FORMATEUR (niveau session) : Lot 4.

export type CircuitsResult = { circuits: number; etapesDeclenchees: number; demo: boolean };

const esc = (s: string) => s;

/**
 * Balaye les circuits actifs et déclenche les étapes dues. Optionnellement
 * restreint à un organisme (bouton « exécuter maintenant » côté tenant).
 */
export async function runCircuits(organismeId?: string): Promise<CircuitsResult> {
  const now = new Date();
  const circuits = await prisma.circuit.findMany({
    where: { actif: true, ...(organismeId ? { organismeId } : {}) },
    include: { steps: true },
  });
  if (circuits.length === 0) return { circuits: 0, etapesDeclenchees: 0, demo: !emailConfigured() };

  // Circuits regroupés par organisme (une étape ne concerne que les inscriptions
  // du même OF).
  const byOrg = new Map<string, typeof circuits>();
  for (const c of circuits) {
    if (!c.organismeId) continue;
    (byOrg.get(c.organismeId) ?? byOrg.set(c.organismeId, []).get(c.organismeId)!).push(c);
  }

  let etapesDeclenchees = 0;

  for (const [orgId, orgCircuits] of byOrg) {
    const inscriptions = await prisma.inscription.findMany({
      where: { organismeId: orgId, statut: { not: "ANNULEE" } },
      include: { candidat: { include: { entreprise: true } }, session: { include: { formation: true } } },
    });

    for (const insc of inscriptions) {
      const s = insc.session;
      if (!s?.dateDebut || !s?.dateFin) continue;
      const dates = { dateDebut: s.dateDebut, dateFin: s.dateFin };
      const ctx = {
        prenom: insc.candidat.prenom,
        nom: insc.candidat.nom,
        formation: s.formation?.titre ?? "votre formation",
        dateDebut: s.dateDebut,
        dateFin: s.dateFin,
        entreprise: insc.candidat.entreprise?.raisonSociale ?? "",
        apprenantEmail: insc.candidat.email || null,
        entrepriseEmail: insc.candidat.entreprise?.contactEmail || null,
      };

      for (const circuit of orgCircuits) {
        const stepList = circuit.steps as StepLike[];
        // Étapes déjà exécutées pour cette inscription (idempotence).
        const fired = await prisma.circuitStepRun.findMany({
          where: { inscriptionId: insc.id, stepId: { in: stepList.map((st) => st.id) } },
          select: { stepId: true },
        });
        const firedSet = new Set(fired.map((f) => f.stepId));
        const dus = dueSteps(stepList, dates, now, firedSet);

        for (const step of dus) {
          const to = recipientFor(step.audience, ctx);
          if (!to) {
            // Audience sans destinataire (ex. FORMATEUR au Lot 3) : on journalise
            // l'exécution pour ne pas boucler, sans envoi.
            await prisma.circuitStepRun.create({
              data: { stepId: step.id, circuitId: circuit.id, inscriptionId: insc.id, organismeId: orgId, statut: "IGNORE" },
            }).catch(() => {});
            continue;
          }

          const full = circuit.steps.find((x) => x.id === step.id)!;
          const sujet = fillBalises(full.emailSujet || `${ACTION_LABELS[step.typeAction]} — ${ctx.formation}`, ctx);
          const corps = fillBalises(
            full.emailCorps || `Bonjour ${ctx.prenom},\n\n${ACTION_LABELS[step.typeAction]} pour « ${ctx.formation} ».`,
            ctx,
          );

          let sent = false;
          try {
            const res = await sendEmail({ to, subject: sujet, body: esc(corps), organismeId: orgId });
            sent = res.sent;
            await prisma.emailLog.create({
              data: {
                organismeId: orgId,
                destinataire: to,
                sujet,
                corps,
                statut: sent ? EmailStatut.ENVOYE : EmailStatut.EN_ATTENTE,
                sentAt: sent ? new Date() : null,
                sessionId: s.id,
              },
            });
          } catch {
            /* envoi non bloquant */
          }

          // Journalise l'exécution SEULEMENT si envoyé (ou mode démo), sinon
          // l'étape sera retentée au prochain run (pas de perte).
          if (sent || !emailConfigured()) {
            await prisma.circuitStepRun.create({
              data: { stepId: step.id, circuitId: circuit.id, inscriptionId: insc.id, organismeId: orgId, statut: "ENVOYE" },
            }).catch(() => {});
            etapesDeclenchees++;
          }
        }
      }
    }
  }

  return { circuits: circuits.length, etapesDeclenchees, demo: !emailConfigured() };
}
