"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import {
  DocumentType,
  EmailStatut,
  FinancementType,
  Prisma,
  SignatureProvider,
  SignatureStatut,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { sendEmail, emailConfigured, toBase64 } from "@/lib/email";
import { orgConfigFor } from "@/lib/org-identity";
import { generateToken, appBaseUrl } from "@/lib/token";
import {
  buildInscriptionPdf,
  buildSingleDocPdf,
  SIGNED_DOC_TYPES,
} from "@/lib/documents/build-pdf";

/**
 * Démarre le parcours candidat : génère un lien unique et envoie l'e-mail
 * invitant le candidat à compléter son dossier puis signer ses documents.
 * Appelée à l'inscription (et ré-appelable manuellement).
 */
export async function startParcours(
  inscriptionId: string,
): Promise<{ ok: boolean; error?: string }> {
  const insc = await prisma.inscription.findUnique({
    where: { id: inscriptionId },
    include: { candidat: true, session: { include: { formation: true } } },
  });
  if (!insc) return { ok: false, error: "Inscription introuvable." };
  const org = await orgConfigFor(insc.organismeId);

  const token = insc.accessToken ?? generateToken();
  if (!insc.accessToken) {
    await prisma.inscription.update({
      where: { id: inscriptionId },
      data: { accessToken: token },
    });
  }

  const link = `${appBaseUrl()}/parcours/${token}`;
  const subject = `Votre inscription — ${insc.session.formation.titre}`;
  const body = `Bonjour ${insc.candidat.prenom},

Votre inscription à la formation « ${insc.session.formation.titre} » a bien été enregistrée.

Pour finaliser votre dossier, merci de compléter vos informations et de signer vos documents en cliquant sur le lien sécurisé ci-dessous :

${link}

Vous trouverez ci-joint le programme de la formation. Ce lien vous est personnel ; à l'issue, vous recevrez une copie de vos documents signés.

Cordialement,
${org.representant} — ${org.name}`;

  const progPdf = await buildSingleDocPdf(inscriptionId, "PROGRAMME");
  const res = await sendEmail({
    to: insc.candidat.email,
    subject,
    body,
    attachments: progPdf
      ? [{ name: "Programme-formation.pdf", content: toBase64(progPdf.data) }]
      : undefined,
  });
  await prisma.emailLog.create({
    data: {
      organismeId: insc.organismeId,
      destinataire: insc.candidat.email,
      sujet: subject,
      corps: body,
      statut: res.sent ? EmailStatut.ENVOYE : EmailStatut.EN_ATTENTE,
      sentAt: res.sent ? new Date() : null,
      sessionId: insc.sessionId,
    },
  });

  revalidatePath(`/candidats/${insc.candidatId}`);
  revalidatePath(`/sessions/${insc.sessionId}`);
  return { ok: true };
}

/** Bouton serveur : (re)lance le parcours depuis l'interface admin. */
export async function resendParcoursAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;
  const inscriptionId = String(formData.get("inscriptionId"));
  await startParcours(inscriptionId);
}

/** Relance le lien de parcours/signature et renvoie un résultat (pour le toast). */
export async function relanceParcours(
  inscriptionId: string,
): Promise<{ ok: boolean; demo: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, demo: true, error: "Non autorisé." };
  const r = await startParcours(inscriptionId);
  revalidatePath("/signatures");
  return { ok: r.ok, demo: !emailConfigured(), error: r.error };
}

export type ParcoursFormValues = {
  telephone?: string;
  dateNaissance?: string;
  adresse?: string;
  codePostal?: string;
  ville?: string;
  situationPro?: string;
  employeur?: string;
  financementType?: string;
  photoDataUrl?: string; // photo d'identité (data URL JPEG compressée côté client)
  consent: boolean;
};

/** Soumission publique du formulaire candidat (via le lien tokenisé). */
export async function submitParcoursForm(
  token: string,
  values: ParcoursFormValues,
): Promise<{ ok: boolean; error?: string }> {
  if (!values.consent)
    return { ok: false, error: "Le consentement est requis." };

  const insc = await prisma.inscription.findUnique({
    where: { accessToken: token },
    include: { candidat: true },
  });
  if (!insc) return { ok: false, error: "Lien invalide ou expiré." };

  const clean = (s?: string) => (s && s.trim() !== "" ? s.trim() : null);
  const fin = values.financementType
    ? (values.financementType as FinancementType)
    : null;

  // Mise à jour des coordonnées du candidat
  await prisma.candidat.update({
    where: { id: insc.candidatId },
    data: {
      telephone: clean(values.telephone) ?? insc.candidat.telephone,
      dateNaissance: values.dateNaissance
        ? new Date(values.dateNaissance)
        : insc.candidat.dateNaissance,
      adresse: clean(values.adresse) ?? insc.candidat.adresse,
      codePostal: clean(values.codePostal) ?? insc.candidat.codePostal,
      ville: clean(values.ville) ?? insc.candidat.ville,
      situationPro: clean(values.situationPro) ?? insc.candidat.situationPro,
      employeur: clean(values.employeur) ?? insc.candidat.employeur,
      financementType: fin ?? insc.candidat.financementType,
      // Photo d'identité : uniquement si fournie et bien une image encodée
      ...(values.photoDataUrl?.startsWith("data:image/")
        ? { photoUrl: values.photoDataUrl }
        : {}),
    },
  });

  await prisma.inscription.update({
    where: { id: insc.id },
    data: {
      formCompletedAt: new Date(),
      financementType: fin ?? insc.financementType,
      consentementRgpd: true,
      consentementDate: new Date(),
    },
  });

  await prisma.consentement.create({
    data: {
      organismeId: insc.organismeId,
      candidatId: insc.candidatId,
      type: "parcours_formulaire",
      accepte: true,
    },
  });

  return { ok: true };
}

/** Soumission publique de l'enquête de satisfaction (via le token dédié). */
export async function submitSatisfaction(
  token: string,
  reponses: {
    notes: Record<string, number>;
    recommander?: number;
    commentaire?: string;
  },
  signatureDataUrl?: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!signatureDataUrl || !signatureDataUrl.startsWith("data:image/"))
    return { ok: false, error: "Merci de dessiner votre signature." };

  const insc = await prisma.inscription.findUnique({
    where: { satisfactionToken: token },
    select: { id: true, satisfactionCompletedAt: true },
  });
  if (!insc) return { ok: false, error: "Lien invalide ou expiré." };
  if (insc.satisfactionCompletedAt) return { ok: true }; // déjà répondu

  await prisma.inscription.update({
    where: { id: insc.id },
    data: {
      satisfactionJson: { ...reponses, __signature: signatureDataUrl },
      satisfactionCompletedAt: new Date(),
    },
  });
  return { ok: true };
}

/** Soumission publique de l'enquête de satisfaction ENTREPRISE (B2B, via token dédié). */
export async function submitSatisfactionEntreprise(
  token: string,
  reponses: {
    notes: Record<string, string>;
    competences?: string;
    objectifsAtteints?: string;
    avisGlobal?: string;
    suggestions?: string;
    remplisseur?: string;
  },
  signatureDataUrl?: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!signatureDataUrl || !signatureDataUrl.startsWith("data:image/"))
    return { ok: false, error: "Merci de dessiner votre signature." };

  const insc = await prisma.inscription.findUnique({
    where: { satisfactionEntrepriseToken: token },
    select: { id: true, satisfactionEntrepriseCompletedAt: true },
  });
  if (!insc) return { ok: false, error: "Lien invalide ou expiré." };
  if (insc.satisfactionEntrepriseCompletedAt) return { ok: true }; // déjà répondu

  await prisma.inscription.update({
    where: { id: insc.id },
    data: {
      satisfactionEntrepriseJson: { ...reponses, __signature: signatureDataUrl },
      satisfactionEntrepriseCompletedAt: new Date(),
    },
  });
  return { ok: true };
}

/**
 * Soumission publique de l'enquête de suivi à 6 mois (Qualiopi ind. 11).
 * Stocke les réponses + la signature, puis CLASSE le document dans la session
 * (DocumentGenere de type SUIVI_6MOIS, consultable côté OF).
 */
export async function submitSuivi6Mois(
  token: string,
  reponses: import("@/lib/suivi6mois").Suivi6MoisReponses,
  signatureDataUrl?: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!reponses?.situation) return { ok: false, error: "Merci d'indiquer votre situation." };
  if (!signatureDataUrl || !signatureDataUrl.startsWith("data:image/"))
    return { ok: false, error: "Merci de dessiner votre signature." };

  const insc = await prisma.inscription.findFirst({
    where: { suivi6moisToken: token },
    select: { id: true, organismeId: true, sessionId: true, suivi6moisCompletedAt: true },
  });
  if (!insc) return { ok: false, error: "Lien invalide ou expiré." };
  if (insc.suivi6moisCompletedAt) return { ok: true }; // déjà répondu

  await prisma.inscription.update({
    where: { id: insc.id },
    data: {
      suivi6moisJson: reponses as Prisma.InputJsonValue,
      suivi6moisSignature: signatureDataUrl,
      suivi6moisCompletedAt: new Date(),
    },
  });

  // Classe le document dans la session (évite les doublons si re-soumission).
  const existing = await prisma.documentGenere.findFirst({
    where: { inscriptionId: insc.id, type: DocumentType.SUIVI_6MOIS },
    select: { id: true },
  });
  if (!existing) {
    await prisma.documentGenere.create({
      data: {
        organismeId: insc.organismeId,
        type: DocumentType.SUIVI_6MOIS,
        inscriptionId: insc.id,
        sessionId: insc.sessionId,
        fileUrl: `/suivi/${token}/document`,
      },
    });
  }
  return { ok: true };
}

/** Soumission publique du test de positionnement (via le token dédié). */
export async function submitPositionnement(
  token: string,
  reponses: Record<string, string | string[]>,
  signatureDataUrl?: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!signatureDataUrl || !signatureDataUrl.startsWith("data:image/"))
    return { ok: false, error: "Merci de dessiner votre signature." };

  const insc = await prisma.inscription.findUnique({
    where: { positionnementToken: token },
    select: { id: true, positionnementCompletedAt: true },
  });
  if (!insc) return { ok: false, error: "Lien invalide ou expiré." };
  if (insc.positionnementCompletedAt) return { ok: true }; // déjà répondu

  await prisma.inscription.update({
    where: { id: insc.id },
    data: {
      positionnementJson: reponses,
      positionnementSignature: signatureDataUrl,
      positionnementCompletedAt: new Date(),
    },
  });
  return { ok: true };
}

/** Soumission publique du test de français (via le token dédié). */
export async function submitFrancais(
  token: string,
  reponses: Record<string, string | string[]>,
  signatureDataUrl?: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!signatureDataUrl || !signatureDataUrl.startsWith("data:image/"))
    return { ok: false, error: "Merci de dessiner votre signature." };

  const insc = await prisma.inscription.findUnique({
    where: { francaisToken: token },
    select: { id: true, francaisCompletedAt: true },
  });
  if (!insc) return { ok: false, error: "Lien invalide ou expiré." };
  if (insc.francaisCompletedAt) return { ok: true }; // déjà répondu

  await prisma.inscription.update({
    where: { id: insc.id },
    data: {
      francaisJson: reponses,
      francaisSignature: signatureDataUrl,
      francaisCompletedAt: new Date(),
    },
  });
  return { ok: true };
}

/**
 * Dépôt public d'une réclamation (lien joint à l'e-mail de satisfaction).
 * Alimente directement le registre des réclamations (indicateurs 31-32).
 */
export async function submitReclamationPublique(
  token: string,
  data: { objet: string; description: string },
  signatureDataUrl?: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!data.objet.trim() || !data.description.trim())
    return { ok: false, error: "Merci de renseigner l'objet et la description." };
  if (!signatureDataUrl || !signatureDataUrl.startsWith("data:image/"))
    return { ok: false, error: "Merci de dessiner votre signature." };

  const insc = await prisma.inscription.findUnique({
    where: { satisfactionToken: token },
    include: { candidat: true, session: { include: { formation: true } } },
  });
  if (!insc) return { ok: false, error: "Lien invalide ou expiré." };

  await prisma.reclamation.create({
    data: {
      organismeId: insc.organismeId,
      origine: "STAGIAIRE",
      declarant: `${insc.candidat.prenom} ${insc.candidat.nom}`,
      contact: insc.candidat.email,
      formation: `${insc.session.formation.titre} (du ${insc.session.dateDebut.toLocaleDateString("fr-FR")} au ${insc.session.dateFin.toLocaleDateString("fr-FR")})`,
      objet: data.objet.trim().slice(0, 200),
      description: data.description.trim().slice(0, 5000),
      signatureDataUrl,
    },
  });
  return { ok: true };
}

/**
 * Signature interne : le candidat signe (clic) ses documents via le lien.
 * Enregistre la trace (horodatage + IP), puis envoie la copie des documents.
 */
export async function signDocuments(
  token: string,
  signataire: string,
  signatureDataUrl?: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!signataire || signataire.trim().length < 2)
    return { ok: false, error: "Merci d'inscrire votre nom complet." };
  if (!signatureDataUrl || !signatureDataUrl.startsWith("data:image/"))
    return { ok: false, error: "Merci de dessiner votre signature." };

  const insc = await prisma.inscription.findUnique({
    where: { accessToken: token },
    include: { candidat: true, session: { include: { formation: true } } },
  });
  if (!insc) return { ok: false, error: "Lien invalide ou expiré." };
  if (!insc.formCompletedAt)
    return { ok: false, error: "Complétez d'abord vos informations." };
  if (insc.signedAt) return { ok: true }; // déjà signé
  const org = await orgConfigFor(insc.organismeId);

  // IP du signataire (traçabilité)
  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    hdrs.get("x-real-ip") ??
    null;

  const now = new Date();
  await prisma.inscription.update({
    where: { id: insc.id },
    data: {
      signedAt: now,
      signatureIp: ip,
      signatureDataUrl,
      signatureStatut: SignatureStatut.SIGNEE,
      statut: "VALIDEE",
    },
  });

  await prisma.signatureRequest.create({
    data: {
      organismeId: insc.organismeId,
      provider: SignatureProvider.INTERNE,
      inscriptionId: insc.id,
      statut: SignatureStatut.SIGNEE,
      signataires: [
        { nom: signataire.trim(), email: insc.candidat.email, role: "stagiaire" },
      ],
      signedAt: now,
    },
  });

  // Génère le dossier signé en PDF (joint à l'e-mail) : docs signés + certificat
  const dossier = await buildInscriptionPdf(insc.id, { only: SIGNED_DOC_TYPES });
  const subject = `Vos documents signés — ${insc.session.formation.titre}`;
  const body = `Bonjour ${insc.candidat.prenom},

Nous vous confirmons la signature de vos documents d'inscription le ${now.toLocaleString("fr-FR")}.

Vous trouverez ci-joint, au format PDF, l'ensemble de vos documents signés (fiche d'inscription, contrat, convention, règlement intérieur) ainsi que votre certificat de signature électronique.

Vous recevez par ailleurs votre convocation à la formation.

Cordialement,
${org.representant} — ${org.name}`;

  const res = await sendEmail({
    to: insc.candidat.email,
    subject,
    body,
    attachments: dossier
      ? [{ name: dossier.filename, content: toBase64(dossier.data) }]
      : undefined,
  });
  await prisma.emailLog.create({
    data: {
      organismeId: insc.organismeId,
      destinataire: insc.candidat.email,
      sujet: subject,
      corps: body,
      statut: res.sent ? EmailStatut.ENVOYE : EmailStatut.EN_ATTENTE,
      sentAt: res.sent ? new Date() : null,
      sessionId: insc.sessionId,
    },
  });

  await prisma.inscription.update({
    where: { id: insc.id },
    data: { docsCopieSentAt: new Date() },
  });

  // Mail de bienvenue / confirmation d'inscription + convocation en PJ (PDF)
  if (!insc.convocationSentAt) {
    const s = insc.session;
    const f = (d: Date) => d.toLocaleDateString("fr-FR");
    const subjectConv = `Bienvenue & confirmation de votre inscription — ${s.formation.titre}`;
    const bodyConv = `Bonjour ${insc.candidat.prenom},

Bienvenue chez ${org.name} ! Nous avons le plaisir de vous confirmer votre inscription à la formation « ${s.formation.titre} », du ${f(s.dateDebut)} au ${f(s.dateFin)}${s.horaires ? ` (${s.horaires})` : ""}${s.lieu ? `, à ${s.lieu}` : ""}.

Vous trouverez ci-joint votre convocation et le programme de la formation (PDF). Merci de vous présenter muni(e) d'une pièce d'identité.

Toute l'équipe vous souhaite une excellente formation.

Cordialement,
${org.representant} — ${org.name}`;
    const convPdf = await buildSingleDocPdf(insc.id, "CONVOCATION");
    const progPdf = await buildSingleDocPdf(insc.id, "PROGRAMME");
    const resConv = await sendEmail({
      to: insc.candidat.email,
      subject: subjectConv,
      body: bodyConv,
      attachments: [
        ...(convPdf ? [{ name: "Convocation.pdf", content: toBase64(convPdf.data) }] : []),
        ...(progPdf ? [{ name: "Programme-formation.pdf", content: toBase64(progPdf.data) }] : []),
      ],
    });
    await prisma.emailLog.create({
      data: {
        destinataire: insc.candidat.email,
        sujet: subjectConv,
        corps: bodyConv,
        statut: resConv.sent ? EmailStatut.ENVOYE : EmailStatut.EN_ATTENTE,
        sentAt: resConv.sent ? new Date() : null,
        sessionId: insc.sessionId,
      },
    });
    await prisma.inscription.update({
      where: { id: insc.id },
      data: { convocationSentAt: new Date() },
    });
  }

  // ── Provisionnement automatique de l'accès e-learning ──
  try {
    await provisionElearning(insc.id);
  } catch (e) {
    console.error("[elearning provision]", e);
  }

  revalidatePath(`/candidats/${insc.candidatId}`);
  return { ok: true };
}

/**
 * À la signature : crée le compte e-learning du candidat (s'il n'existe pas),
 * lui attribue les cours publiés de sa formation, et lui envoie un e-mail
 * d'accès (lien + identifiants). N'envoie l'e-mail que s'il y a des cours.
 */
async function provisionElearning(inscriptionId: string) {
  const insc = await prisma.inscription.findUnique({
    where: { id: inscriptionId },
    include: { candidat: true, session: { include: { formation: true } } },
  });
  if (!insc?.candidat?.email) return;
  const org = await orgConfigFor(insc.organismeId);
  const email = insc.candidat.email.toLowerCase();
  const name = `${insc.candidat.prenom} ${insc.candidat.nom}`.trim();

  // Dossier apprenant
  const apprenant = await prisma.apprenant.upsert({
    where: { candidatId: insc.candidatId },
    update: {},
    create: { candidatId: insc.candidatId, organismeId: insc.organismeId },
    select: { id: true, userId: true },
  });

  // Cours publiés de la formation suivie
  const cours = await prisma.cours.findMany({
    where: { formationId: insc.session.formationId, isPublished: true },
    select: { id: true, titre: true },
  });

  // Attribue les cours (idempotent)
  for (const c of cours) {
    await prisma.coursApprenant.upsert({
      where: { coursId_apprenantId: { coursId: c.id, apprenantId: apprenant.id } },
      update: {},
      create: { coursId: c.id, apprenantId: apprenant.id, organismeId: insc.organismeId },
    });
  }

  // Compte de connexion
  let motDePasse: string | null = null;
  if (!apprenant.userId) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { role: "APPRENANT", isActive: true, organismeId: existing.organismeId ?? insc.organismeId },
      });
      await prisma.apprenant.update({
        where: { id: apprenant.id },
        data: { userId: existing.id },
      });
    } else {
      motDePasse = `CAP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const user = await prisma.user.create({
        data: {
          email,
          name,
          role: "APPRENANT",
          organismeId: insc.organismeId,
          passwordHash: await bcrypt.hash(motDePasse, 10),
        },
      });
      await prisma.apprenant.update({
        where: { id: apprenant.id },
        data: { userId: user.id },
      });
    }
  }

  // E-mail d'accès uniquement s'il y a des cours à suivre
  if (cours.length === 0) return;

  const loginUrl = `${appBaseUrl()}/login`;
  const listeCours = cours.map((c) => `• ${c.titre}`).join("\n");
  const ident = motDePasse
    ? `Identifiant : ${email}\nMot de passe provisoire : ${motDePasse}\n(Vous pourrez le modifier après connexion.)`
    : `Connectez-vous avec votre adresse e-mail (${email}) et votre mot de passe habituel.`;
  const subject = `Votre accès à l'espace e-learning — ${org.name}`;
  const body = `Bonjour ${insc.candidat.prenom},

Votre espace e-learning est prêt ! Vous pouvez dès maintenant accéder à vos cours en ligne :
${loginUrl}

${ident}

Vos cours :
${listeCours}

Une fois connecté(e), cliquez sur « Mes cours ».

Bonne formation,
${org.representant} — ${org.name}`;

  const res = await sendEmail({ to: email, subject, body });
  await prisma.emailLog.create({
    data: {
      organismeId: insc.organismeId,
      destinataire: email,
      sujet: subject,
      corps: body,
      statut: res.sent ? EmailStatut.ENVOYE : EmailStatut.EN_ATTENTE,
      sentAt: res.sent ? new Date() : null,
      sessionId: insc.sessionId,
    },
  });
}
