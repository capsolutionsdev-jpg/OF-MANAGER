"use server";

import { revalidatePath } from "next/cache";
import {
  Prisma,
  InscriptionStatut,
  PaiementStatut,
  CertificationResultat,
  SessionStatut,
} from "@prisma/client";
import { requireStaffTenant } from "@/lib/tenant";
import { auth } from "@/auth";
import {
  inscriptionFormSchema,
  type InscriptionFormValues,
} from "@/lib/validators/inscription";
import { startParcours } from "@/lib/actions/parcours-actions";
import { ssiapDiplomeNiveau } from "@/lib/documents/titres";
import { isRecyclageOuRemiseANiveau } from "@/lib/documents/families";
import { sendEmail } from "@/lib/email";
import {
  emailShell,
  emailParagraph,
  emailBox,
  emailButton,
  emailSignoff,
  esc,
  emailLogoSrc,
} from "@/lib/email-templates";
import { orgConfigFor } from "@/lib/org-identity";
import { generateToken, appBaseUrl } from "@/lib/token";
import { hasStrictFeature } from "@/lib/feature-guard";
import { t3pMetierOfFormation, T3P_FRAIS_EXAMEN } from "@/lib/t3p";

export type ActionResult =
  | { ok: true; inscriptionId: string; warning?: string }
  | { ok: false; error: string };

export type SimpleResult = { ok: boolean; error?: string };

/**
 * Inscription « à distance » rattachée à une SESSION : crée le candidat + une
 * inscription EN_ATTENTE à la session choisie, puis envoie le lien de parcours
 * (le candidat complète son dossier, consulte ses documents et signe en ligne).
 * Réservé au staff (tenant courant). `sent` = e-mail réellement transmis.
 */
export async function inviterInscriptionDistance(input: {
  nom: string;
  prenom: string;
  email: string;
  formationSouhaiteeId: string;
  sessionId: string;
}): Promise<{ ok: boolean; candidatId?: string; error?: string; sent?: boolean }> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };
  const { db } = await requireStaffTenant();

  const nom = input.nom?.trim();
  const prenom = input.prenom?.trim();
  const email = input.email?.trim().toLowerCase();
  if (!nom || !prenom) return { ok: false, error: "Nom et prénom sont requis." };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { ok: false, error: "Adresse e-mail invalide." };
  if (!input.formationSouhaiteeId || !input.sessionId)
    return { ok: false, error: "Choisissez une formation et une session." };

  // Formation + session doivent appartenir à l'organisme (db scopé tenant).
  const [formation, sess] = await Promise.all([
    db.formation.findFirst({ where: { id: input.formationSouhaiteeId }, select: { id: true } }),
    db.session.findFirst({ where: { id: input.sessionId }, select: { id: true } }),
  ]);
  if (!formation || !sess)
    return { ok: false, error: "Formation ou session introuvable." };

  const candidat = await db.candidat.create({
    data: {
      nom,
      prenom,
      email,
      formationSouhaiteeId: formation.id,
      statut: "NOUVEAU",
      createdById: session.user.id,
    },
    select: { id: true },
  });
  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "CREATE",
      entityType: "Candidat",
      entityId: candidat.id,
    },
  });

  // Inscription EN_ATTENTE + démarrage du parcours (e-mail : compléter + signer).
  const insc = await createInscription({
    candidatId: candidat.id,
    sessionId: input.sessionId,
    financementType: "",
    statut: InscriptionStatut.EN_ATTENTE,
    montant: "",
  });
  if (!insc.ok) {
    return { ok: true, candidatId: candidat.id, sent: false, error: insc.error };
  }
  const started = await startParcours(insc.inscriptionId);
  return {
    ok: true,
    candidatId: candidat.id,
    sent: started.sent,
    // Si l'e-mail n'est pas parti, on remonte la RAISON réelle (Resend / mode démo).
    error: started.sent
      ? undefined
      : (started.emailReason ?? started.error ?? "E-mail non envoyé."),
  };
}

/**
 * Change le statut d'une inscription (Confirmer / Suspendre / Annuler).
 * Confirmer (VALIDEE) garantit le dossier apprenant, passe le candidat à
 * INSCRIT et démarre le parcours automatisé s'il ne l'est pas déjà.
 */
export async function setInscriptionStatut(
  inscriptionId: string,
  statut: InscriptionStatut,
): Promise<SimpleResult> {
  const { db } = await requireStaffTenant();
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
  const { db } = await requireStaffTenant();
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
  const { db } = await requireStaffTenant();
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

  // Certifié → ENREGISTREMENT automatique du diplôme SANS numéro (best-effort,
  // idempotent). Le n° (préfectoral pour SSIAP 1/2/3 initial) est saisi MANUELLEMENT
  // sur la page Diplômes, ce qui l'indexe alors dans le registre vérifiable anti-fraude.
  if (resultat === "CERTIFIE") {
    const f = insc.session.formation;
    const ssiapNiv = ssiapDiplomeNiveau({ reference: f.reference, titre: f.titre });
    try {
      if ((ssiapNiv || f.diplomante) && (await hasStrictFeature("diplomes"))) {
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
  // Pas d'attestation de RÉUSSITE pour les recyclages / remises à niveau : ces
  // formations ne sont pas sanctionnées par une évaluation certifiante (cf. #13).
  // L'attestation de recyclage s'envoie manuellement (bouton dédié).
  const attestationPending =
    resultat === "CERTIFIE" &&
    !insc.attestationReussiteSentAt &&
    !isRecyclageOuRemiseANiveau(insc.session.formation);

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
  const { db } = await requireStaffTenant();
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
  const formationTitre = insc.session.formation.titre;
  const subject = `💬 Votre avis sur « ${formationTitre} » — à compléter et signer`;
  const html = emailShell({
    organisme: org.name,
    representant: org.representant,
      logoUrl: emailLogoSrc(org.id, org.logoUrl),
    body:
      emailParagraph(`Bonjour ${esc(insc.candidat.prenom)} ${esc(insc.candidat.nom)},`) +
      emailParagraph(
        `Vous venez de suivre <b>« ${esc(formationTitre)} »</b>. ` +
          `Merci de prendre quelques minutes pour <b>compléter et signer</b> ce court questionnaire de satisfaction&nbsp;:`,
      ) +
      emailButton("Compléter & signer →", link) +
      emailBox(`Votre retour nous aide à <b>améliorer la qualité</b> de nos formations.`) +
      emailSignoff("Merci,", org.representant),
  });

  const res = await sendEmail({ to: insc.candidat.email, subject, html });

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
  const { db } = await requireStaffTenant();
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non autorisé." };

  const parsed = inscriptionFormSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Données invalides." };
  const v = parsed.data;

  // Cloisonnement multi-tenant (audit A05-004) : candidatId/sessionId viennent du
  // formulaire (validés seulement comme chaînes non vides). Le create scopé pose
  // l'organismeId sur l'Inscription mais NE revérifie PAS l'appartenance des FK →
  // sans ce contrôle, on peut rattacher le candidat d'un AUTRE organisme (puis lire
  // sa PII via `include`). On confirme donc que candidat ET session sont bien du
  // tenant courant (le client scopé renvoie null pour une ressource d'un autre org).
  const [candOk, sessOk] = await Promise.all([
    db.candidat.findFirst({ where: { id: v.candidatId }, select: { id: true } }),
    db.session.findFirst({ where: { id: v.sessionId }, select: { id: true } }),
  ]);
  if (!candOk || !sessOk) return { ok: false, error: "Candidat ou session introuvable." };

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
  const { db } = await requireStaffTenant();

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
  const { db } = await requireStaffTenant();

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
  const formationTitre = insc.session.formation.titre;
  const listePuces = manquantes.map((p) => `• ${esc(p)}`).join("<br>");
  const html = emailShell({
    organisme: cfg.name,
    representant: cfg.representant,
      logoUrl: emailLogoSrc(cfg.id, cfg.logoUrl),
    accent: "amber",
    body:
      emailParagraph(`Bonjour ${esc(insc.candidat.prenom ?? "")},`) +
      emailParagraph(
        `Pour <b>finaliser votre dossier</b> d'inscription à ` +
          `<b>« ${esc(formationTitre)} »</b>, il nous manque encore les pièces suivantes&nbsp;:`,
      ) +
      emailBox(listePuces, "amber") +
      emailParagraph(
        `Merci de nous les transmettre <b>dès que possible</b> pour valider votre place. ` +
          `Un doute sur un document&nbsp;? Répondez simplement à cet e-mail.`,
      ) +
      emailSignoff("Merci d'avance,", cfg.representant),
  });
  const { sent } = await sendEmail({
    to: email,
    organismeId: insc.organismeId,
    subject: `📄 Il manque quelques pièces à votre dossier — ${formationTitre}`,
    html,
  });

  return { ok: true, sent, manquantes: manquantes.length };
}

export async function deleteInscriptionAction(
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  const { db } = await requireStaffTenant();
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non authentifié." };

  const id = String(formData.get("id"));
  const sessionId = String(formData.get("sessionId"));
  const candidatId = String(formData.get("candidatId"));

  // Garde d'intégrité comptable (DATA-01) : supprimer une inscription ne doit JAMAIS
  // détruire ni orpheliner de données comptables. Selon le schéma : règlements en
  // `onDelete: Cascade` (supprimés silencieusement), factures / conventions / dossiers de
  // financement en SetNull (orphelinés) et contrat en Restrict (plantage brut). On refuse
  // proprement tant que l'un de ces éléments existe — l'utilisateur doit d'abord les retirer,
  // ou annuler l'inscription plutôt que la supprimer. `findFirst` est scopé au tenant : on ne
  // peut agir que sur ses propres inscriptions.
  // Résidu connu, fermé par le lot B4 (schéma) : course TOCTOU entre cette lecture et le
  // delete — un règlement créé dans l'intervalle serait encore cascadé. Fermeture définitive =
  // passer ces relations en `onDelete: Restrict` côté schéma.
  const insc = await db.inscription.findFirst({
    where: { id },
    select: {
      id: true,
      _count: {
        select: { paiements: true, factures: true, dossiersFinancement: true },
      },
      contrat: { select: { id: true } },
      convention: { select: { id: true } },
    },
  });
  if (!insc) return { ok: false, error: "Inscription introuvable." };

  const bloquants: string[] = [];
  if (insc._count.paiements > 0)
    bloquants.push(
      insc._count.paiements > 1
        ? `${insc._count.paiements} règlements`
        : "1 règlement"
    );
  if (insc._count.factures > 0)
    bloquants.push(
      insc._count.factures > 1
        ? `${insc._count.factures} factures`
        : "1 facture"
    );
  if (insc._count.dossiersFinancement > 0)
    bloquants.push(
      insc._count.dossiersFinancement > 1
        ? `${insc._count.dossiersFinancement} dossiers de financement`
        : "1 dossier de financement"
    );
  if (insc.convention) bloquants.push("une convention");
  if (insc.contrat) bloquants.push("un contrat");

  if (bloquants.length > 0) {
    return {
      ok: false,
      error: `Suppression impossible : cette inscription est liée à ${bloquants.join(
        ", "
      )}. Retirez d'abord ces éléments comptables, ou annulez l'inscription au lieu de la supprimer.`,
    };
  }

  try {
    await db.inscription.delete({ where: { id } });
  } catch {
    // Filet de sécurité : si une contrainte référentielle non anticipée bloque la suppression,
    // on renvoie une erreur claire plutôt qu'une 500 brute (et rien n'est détruit).
    return {
      ok: false,
      error:
        "Suppression impossible : des données liées empêchent la suppression de cette inscription.",
    };
  }

  // Journalisation best-effort : la suppression a déjà réussi ; un échec d'audit ne doit pas
  // relancer une exception (écran rouge côté client) ni transformer un succès en erreur.
  try {
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE",
        entityType: "Inscription",
        entityId: id,
      },
    });
  } catch {
    /* audit best-effort — la suppression reste effective */
  }

  if (sessionId) revalidatePath(`/sessions/${sessionId}`);
  if (candidatId) revalidatePath(`/candidats/${candidatId}`);
  return { ok: true };
}

// ── Déplacer un candidat vers une autre session de la MÊME formation ──────────
// L'inscription change simplement de sessionId : paiements, factures, documents,
// signature et statut suivent (rattachés à l'inscription). Signalé si déjà signé.
export type SessionCible = {
  id: string;
  dateDebut: string;
  dateFin: string;
  /** null = capacité non plafonnée (nbPlaces = 0). */
  placesRestantes: number | null;
  complet: boolean;
};

/** Sessions planifiées de la MÊME formation où l'on peut déplacer l'inscription. */
export async function listerSessionsCibles(
  inscriptionId: string,
): Promise<{ ok: true; sessions: SessionCible[] } | { ok: false; error: string }> {
  const { db } = await requireStaffTenant();
  const insc = await db.inscription.findUnique({
    where: { id: inscriptionId },
    select: { sessionId: true, session: { select: { formationId: true } } },
  });
  if (!insc) return { ok: false, error: "Inscription introuvable." };

  const sessions = await db.session.findMany({
    where: {
      formationId: insc.session.formationId,
      id: { not: insc.sessionId },
      isArchived: false,
      statut: { notIn: [SessionStatut.ANNULEE, SessionStatut.TERMINEE] },
    },
    orderBy: { dateDebut: "asc" },
    take: 100,
    select: {
      id: true,
      dateDebut: true,
      dateFin: true,
      nbPlaces: true,
      _count: { select: { inscriptions: { where: { statut: { not: InscriptionStatut.ANNULEE } } } } },
    },
  });

  return {
    ok: true,
    sessions: sessions.map((s) => {
      const restantes = s.nbPlaces > 0 ? s.nbPlaces - s._count.inscriptions : null;
      return {
        id: s.id,
        dateDebut: s.dateDebut.toISOString(),
        dateFin: s.dateFin.toISOString(),
        placesRestantes: restantes,
        complet: restantes != null && restantes <= 0,
      };
    }),
  };
}

/** Déplace l'inscription vers une autre session de la même formation. */
export async function changerSessionInscription(
  inscriptionId: string,
  sessionCibleId: string,
): Promise<{ ok: true; warning?: string } | { ok: false; error: string }> {
  const { db } = await requireStaffTenant();
  const insc = await db.inscription.findUnique({
    where: { id: inscriptionId },
    select: {
      sessionId: true,
      candidatId: true,
      signedAt: true,
      session: { select: { formationId: true } },
    },
  });
  if (!insc) return { ok: false, error: "Inscription introuvable." };
  if (sessionCibleId === insc.sessionId) return { ok: false, error: "C'est déjà la session actuelle." };

  const cible = await db.session.findUnique({
    where: { id: sessionCibleId },
    select: {
      formationId: true,
      nbPlaces: true,
      statut: true,
      isArchived: true,
      _count: { select: { inscriptions: { where: { statut: { not: InscriptionStatut.ANNULEE } } } } },
    },
  });
  if (!cible) return { ok: false, error: "Session cible introuvable." };
  if (cible.formationId !== insc.session.formationId)
    return { ok: false, error: "La session cible doit être de la même formation." };
  if (cible.isArchived || cible.statut === SessionStatut.ANNULEE || cible.statut === SessionStatut.TERMINEE)
    return { ok: false, error: "La session cible n'est pas disponible (annulée, terminée ou archivée)." };
  if (cible.nbPlaces > 0 && cible._count.inscriptions >= cible.nbPlaces)
    return { ok: false, error: "La session cible est complète." };

  await db.inscription.update({ where: { id: inscriptionId }, data: { sessionId: sessionCibleId } });

  revalidatePath(`/sessions/${insc.sessionId}`);
  revalidatePath(`/sessions/${sessionCibleId}`);
  revalidatePath(`/candidats/${insc.candidatId}`);

  return {
    ok: true,
    warning: insc.signedAt
      ? "Le candidat avait signé des documents pour l'ancienne session : pensez à les régénérer et à les faire re-signer."
      : undefined,
  };
}
