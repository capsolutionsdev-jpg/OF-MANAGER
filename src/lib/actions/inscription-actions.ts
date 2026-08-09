"use server";

import { revalidatePath } from "next/cache";
import {
  Prisma,
  InscriptionStatut,
  PaiementStatut,
  CertificationResultat,
} from "@prisma/client";
import { getTenantDb } from "@/lib/tenant";
import { auth } from "@/auth";
import {
  inscriptionFormSchema,
  type InscriptionFormValues,
} from "@/lib/validators/inscription";
import { startParcours } from "@/lib/actions/parcours-actions";
import { genererDiplomeSsiap } from "@/lib/actions/titre-actions";
import { ssiapDiplomeNiveau } from "@/lib/documents/titres";
import { sendEmail } from "@/lib/email";
import { orgConfigFor } from "@/lib/org-identity";
import { generateToken, appBaseUrl } from "@/lib/token";
import { hasStrictFeature } from "@/lib/feature-guard";
import { t3pMetierOfFormation, T3P_FRAIS_EXAMEN } from "@/lib/t3p";

export type ActionResult =
  | { ok: true; inscriptionId: string; warning?: string }
  | { ok: false; error: string };

export type SimpleResult = { ok: boolean; error?: string };

/**
 * Change le statut d'une inscription (Confirmer / Suspendre / Annuler).
 * Confirmer (VALIDEE) garantit le dossier apprenant, passe le candidat à
 * INSCRIT et démarre le parcours automatisé s'il ne l'est pas déjà.
 */
export async function setInscriptionStatut(
  inscriptionId: string,
  statut: InscriptionStatut,
): Promise<SimpleResult> {
  const db = await getTenantDb();
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };

  const insc = await db.inscription.findUnique({
    where: { id: inscriptionId },
    select: {
      id: true,
      candidatId: true,
      sessionId: true,
      apprenantId: true,
      accessToken: true,
    },
  });
  if (!insc) return { ok: false, error: "Inscription introuvable." };

  await db.inscription.update({
    where: { id: inscriptionId },
    data: { statut },
  });

  if (statut === "VALIDEE") {
    const apprenant = await db.apprenant.upsert({
      where: { candidatId: insc.candidatId },
      update: {},
      create: { candidatId: insc.candidatId },
    });
    if (!insc.apprenantId) {
      await db.inscription.update({
        where: { id: inscriptionId },
        data: { apprenantId: apprenant.id },
      });
    }
    await db.candidat.update({
      where: { id: insc.candidatId },
      data: { statut: "INSCRIT" },
    });
    // Démarre le parcours automatisé seulement s'il n'a jamais été lancé.
    // Best-effort : une panne d'e-mail/PDF ne doit pas faire échouer le
    // changement de statut (sinon plant de rendu, digest en prod).
    if (!insc.accessToken) {
      try {
        await startParcours(inscriptionId);
      } catch (e) {
        console.error("setInscriptionStatut: startParcours échoué (ignoré)", e);
      }
    }
  }

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: `INSCRIPTION_${statut}`,
      entityType: "Inscription",
      entityId: inscriptionId,
    },
  });

  revalidatePath(`/sessions/${insc.sessionId}`);
  revalidatePath(`/candidats/${insc.candidatId}`);
  return { ok: true };
}

/** Met à jour le mode et l'état de paiement d'une inscription. */
export async function setInscriptionPaiement(
  inscriptionId: string,
  modePaiement: string | null,
  paiementStatut: PaiementStatut,
): Promise<SimpleResult> {
  const db = await getTenantDb();
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };

  const insc = await db.inscription.findUnique({
    where: { id: inscriptionId },
    select: { sessionId: true, candidatId: true },
  });
  if (!insc) return { ok: false, error: "Inscription introuvable." };

  await db.inscription.update({
    where: { id: inscriptionId },
    data: {
      modePaiement: modePaiement && modePaiement.trim() !== "" ? modePaiement : null,
      paiementStatut,
    },
  });

  revalidatePath(`/sessions/${insc.sessionId}`);
  revalidatePath(`/candidats/${insc.candidatId}`);
  return { ok: true };
}

/** Renseigne le résultat de certification (Certifié / Ajourné / Abandon → BPF). */
export async function setCertification(
  inscriptionId: string,
  resultat: CertificationResultat,
): Promise<SimpleResult & { attestationPending?: boolean }> {
  const db = await getTenantDb();
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };

  const insc = await db.inscription.findUnique({
    where: { id: inscriptionId },
    select: {
      sessionId: true,
      organismeId: true,
      attestationReussiteSentAt: true,
      candidat: { select: { prenom: true, nom: true, dateNaissance: true, lieuNaissance: true, email: true } },
      session: {
        select: {
          formationId: true,
          formation: { select: { titre: true, reference: true, diplomante: true } },
        },
      },
    },
  });
  if (!insc) return { ok: false, error: "Inscription introuvable." };

  await db.inscription.update({
    where: { id: inscriptionId },
    data: {
      resultatCertification: resultat,
      certificationDate: resultat === "NON_EVALUE" ? null : new Date(),
    },
  });

  // Certifié → génération AUTOMATIQUE du diplôme (best-effort, idempotent) :
  //  • Formation SSIAP initiale → diplôme NUMÉROTÉ (n° préfectoral DEPT-AGR-NIV-
  //    AAAA-SEQ) + indexé dans le registre vérifiable anti-fraude.
  //  • Autre formation diplômante → enregistrement diplôme (le n° reste à saisir).
  if (resultat === "CERTIFIE") {
    const f = insc.session.formation;
    const ssiapNiv = ssiapDiplomeNiveau({ reference: f.reference, titre: f.titre });
    try {
      if (ssiapNiv) {
        await genererDiplomeSsiap(inscriptionId, ssiapNiv);
      } else if (f.diplomante && (await hasStrictFeature("diplomes"))) {
        const existe = await db.diplome.findFirst({ where: { inscriptionId } });
        if (!existe) {
          await db.diplome.create({
            data: {
              inscriptionId,
              sessionId: insc.sessionId,
              formationId: insc.session.formationId,
              nom: insc.candidat.nom,
              prenom: insc.candidat.prenom,
              dateNaissance: insc.candidat.dateNaissance,
              lieuNaissance: insc.candidat.lieuNaissance ?? null,
              statut: "ENVOYE_CERTIFICATEUR",
              envoyeCertificateurAt: new Date(),
            },
          });
          revalidatePath("/diplomes");
        }
      }
    } catch (e) {
      console.error("[auto-diplome]", e);
    }
  }

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: `CERTIFICATION_${resultat}`,
      entityType: "Inscription",
      entityId: inscriptionId,
    },
  });

  // Attestation de réussite : générée (PDF via Chromium) + envoyée par e-mail via
  // la ROUTE dédiée /api/inscriptions/[id]/attestation-reussite (runtime nodejs +
  // maxDuration 60), déclenchée en arrière-plan par le client après certification.
  // On ne génère PLUS le PDF ici : Chromium n'est pas fiable dans une server action
  // (c'était la cause du crash « Server Components render » à chaque validation).
  const attestationPending = resultat === "CERTIFIE" && !insc.attestationReussiteSentAt;

  revalidatePath(`/sessions/${insc.sessionId}`);
  revalidatePath("/bpf");
  return { ok: true, attestationPending };
}

/**
 * Envoie (ou renvoie) manuellement l'enquête de satisfaction à un candidat,
 * indépendamment de l'automatisme de fin de session.
 */
export async function sendSatisfactionManual(
  inscriptionId: string,
): Promise<SimpleResult> {
  const db = await getTenantDb();
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };

  const insc = await db.inscription.findUnique({
    where: { id: inscriptionId },
    include: { candidat: true, session: { include: { formation: true } } },
  });
  if (!insc) return { ok: false, error: "Inscription introuvable." };

  const org = await orgConfigFor(insc.organismeId);
  const token = insc.satisfactionToken ?? generateToken();
  if (!insc.satisfactionToken) {
    await db.inscription.update({
      where: { id: inscriptionId },
      data: { satisfactionToken: token },
    });
  }

  const link = `${appBaseUrl()}/satisfaction/${token}`;
  const subject = `Votre avis sur la formation « ${insc.session.formation.titre} »`;
  const body = `Bonjour ${insc.candidat.prenom} ${insc.candidat.nom},

Vous venez de suivre la formation « ${insc.session.formation.titre} ».
Merci de prendre quelques minutes pour compléter et signer ce court questionnaire de satisfaction :
${link}

Votre retour nous aide à améliorer la qualité de nos formations.

Cordialement,
${org.representant} — ${org.name}`;

  const res = await sendEmail({ to: insc.candidat.email, subject, body });

  await db.inscription.update({
    where: { id: inscriptionId },
    data: { satisfactionSentAt: new Date() },
  });

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "SATISFACTION_SENT",
      entityType: "Inscription",
      entityId: inscriptionId,
    },
  });

  revalidatePath(`/sessions/${insc.sessionId}`);
  return {
    ok: true,
    error: res.sent ? undefined : "E-mail non envoyé (mode démo : configurez Brevo).",
  };
}

export async function createInscription(
  values: InscriptionFormValues,
  opts?: { positionnementSurPlace?: boolean; prerequisVerifies?: boolean },
): Promise<ActionResult> {
  const db = await getTenantDb();
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };

  const parsed = inscriptionFormSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Données invalides." };
  const v = parsed.data;

  const montant =
    v.montant && v.montant.trim() !== ""
      ? Number(v.montant.replace(",", "."))
      : null;

  try {
    const created = await db.inscription.create({
      data: {
        candidatId: v.candidatId,
        sessionId: v.sessionId,
        financementType: v.financementType ? v.financementType : null,
        statut: v.statut,
        montant: montant !== null && !Number.isNaN(montant) ? montant : null,
        source: "manuel",
      },
    });

    // Si l'inscription est validée : créer/garantir le dossier apprenant
    // et passer le candidat au statut INSCRIT.
    if (v.statut === "VALIDEE") {
      const apprenant = await db.apprenant.upsert({
        where: { candidatId: v.candidatId },
        update: {},
        create: { candidatId: v.candidatId },
      });
      await db.inscription.update({
        where: { id: created.id },
        data: { apprenantId: apprenant.id },
      });
      await db.candidat.update({
        where: { id: v.candidatId },
        data: { statut: "INSCRIT" },
      });
      // Démarre le parcours automatisé (e-mail + lien de finalisation), SAUF si
      // l'inscription est traitée sur place (positionnement/documents en présentiel).
      // Best-effort : une panne d'e-mail/PDF ne doit pas annuler l'inscription.
      if (!opts?.positionnementSurPlace) {
        try {
          await startParcours(created.id);
        } catch (e) {
          console.error("createInscription: startParcours échoué (ignoré)", e);
        }
      }
    }

    // Traçabilité Qualiopi : vérification des prérequis par le collaborateur.
    if (opts?.prerequisVerifies) {
      await db.auditLog.create({
        data: {
          userId: session.user.id,
          action: "PREREQUIS_VERIFIES",
          entityType: "Inscription",
          entityId: created.id,
        },
      });
    }

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entityType: "Inscription",
        entityId: created.id,
      },
    });

    // Formation Taxi/VTC → ouvre (ou rattache) automatiquement le parcours
    // d'examen T3P du candidat. Best-effort : ne bloque jamais l'inscription.
    if (await hasStrictFeature("parcours-t3p")) {
      try {
        const sessT3P = await db.session.findUnique({
          where: { id: v.sessionId },
          select: { formation: { select: { titre: true, reference: true } } },
        });
        const metier = sessT3P ? t3pMetierOfFormation(sessT3P.formation) : null;
        if (metier) {
          const existant = await db.parcoursT3P.findFirst({
            where: { candidatId: v.candidatId, metier },
          });
          if (existant) {
            if (!existant.inscriptionId) {
              await db.parcoursT3P.update({
                where: { id: existant.id },
                data: { inscriptionId: created.id },
              });
            }
          } else {
            await db.parcoursT3P.create({
              data: {
                candidatId: v.candidatId,
                metier,
                inscriptionId: created.id,
                fraisMontant: T3P_FRAIS_EXAMEN,
              },
            });
          }
          revalidatePath(`/candidats/${v.candidatId}/parcours-t3p`);
          revalidatePath("/parcours-t3p");
        }
      } catch (e) {
        console.error("createInscription: parcours T3P (ignoré)", e);
      }
    }

    revalidatePath(`/sessions/${v.sessionId}`);
    revalidatePath(`/candidats/${v.candidatId}`);
    revalidatePath("/crm");
    revalidatePath("/candidats");

    // Avertissement de capacité (n'empêche pas l'inscription — listes d'attente
    // fréquentes en OF). nbPlaces n'était jusqu'ici qu'informatif.
    let warning: string | undefined;
    const sess = await db.session.findUnique({
      where: { id: v.sessionId },
      select: { nbPlaces: true },
    });
    if (sess) {
      const inscrits = await db.inscription.count({
        where: { sessionId: v.sessionId, statut: { not: "ANNULEE" } },
      });
      if (inscrits > sess.nbPlaces)
        warning = `Session complète : ${inscrits}/${sess.nbPlaces} inscrits (capacité dépassée).`;
    }
    return { ok: true, inscriptionId: created.id, warning };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "Ce candidat est déjà inscrit à cette session." };
    }
    throw e;
  }
}

/** Coche/décoche une pièce du dossier administratif d'une inscription. */
export async function togglePieceRecue(
  inscriptionId: string,
  piece: string,
  recue: boolean,
): Promise<{ ok: boolean }> {
  const session = await auth();
  if (!session?.user) return { ok: false };
  const nom = session.user.name || session.user.email || "Collaborateur";
  const db = await getTenantDb();

  const insc = await db.inscription.findUnique({
    where: { id: inscriptionId },
    select: { piecesRecues: true, piecesValideePar: true, candidatId: true, sessionId: true },
  });
  if (!insc) return { ok: false };

  const set = new Set(insc.piecesRecues);
  const traca: Record<string, { nom: string; date: string }> = {
    ...((insc.piecesValideePar as Record<string, { nom: string; date: string }> | null) ?? {}),
  };
  if (recue) {
    set.add(piece);
    traca[piece] = { nom, date: new Date().toISOString() };
  } else {
    set.delete(piece);
    delete traca[piece];
  }

  await db.inscription.update({
    where: { id: inscriptionId },
    data: { piecesRecues: [...set], piecesValideePar: traca },
  });

  revalidatePath(`/candidats/${insc.candidatId}`);
  revalidatePath(`/sessions/${insc.sessionId}`);
  return { ok: true };
}

/** Relance le candidat par e-mail avec la liste des pièces encore manquantes. */
export async function relancerDossier(
  inscriptionId: string,
): Promise<{ ok: boolean; error?: string; sent?: boolean; manquantes?: number }> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  const db = await getTenantDb();

  const insc = await db.inscription.findUnique({
    where: { id: inscriptionId },
    select: {
      piecesRecues: true,
      organismeId: true,
      candidat: { select: { email: true, prenom: true } },
      session: { select: { formation: { select: { titre: true, piecesAttendues: true } } } },
    },
  });
  if (!insc) return { ok: false, error: "Inscription introuvable." };

  const manquantes = (insc.session.formation.piecesAttendues ?? []).filter(
    (p) => !insc.piecesRecues.includes(p),
  );
  if (manquantes.length === 0) return { ok: true, manquantes: 0 };

  const email = insc.candidat.email;
  if (!email) return { ok: false, error: "Le candidat n'a pas d'e-mail." };

  const cfg = await orgConfigFor(insc.organismeId);
  const liste = manquantes.map((p) => `• ${p}`).join("\n");
  const { sent } = await sendEmail({
    to: email,
    organismeId: insc.organismeId,
    subject: `Pièces manquantes — ${insc.session.formation.titre}`,
    body:
      `Bonjour ${insc.candidat.prenom ?? ""},\n\n` +
      `Pour finaliser votre dossier d'inscription à « ${insc.session.formation.titre} », ` +
      `il nous manque encore les pièces suivantes :\n\n${liste}\n\n` +
      `Merci de nous les transmettre dès que possible.\n\n` +
      `Cordialement,\n${cfg.name}`,
  });

  return { ok: true, sent, manquantes: manquantes.length };
}

export async function deleteInscriptionAction(formData: FormData) {
  const db = await getTenantDb();
  const session = await auth();
  if (!session?.user) return;

  const id = String(formData.get("id"));
  const sessionId = String(formData.get("sessionId"));
  const candidatId = String(formData.get("candidatId"));

  await db.inscription.delete({ where: { id } });
  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "DELETE",
      entityType: "Inscription",
      entityId: id,
    },
  });

  if (sessionId) revalidatePath(`/sessions/${sessionId}`);
  if (candidatId) revalidatePath(`/candidats/${candidatId}`);
}
