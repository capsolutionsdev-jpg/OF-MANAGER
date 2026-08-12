"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import {
  CnapsStatut,
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
} from "@/lib/documents/build-pdf";
import {
  emailShell,
  emailHeading,
  emailParagraph,
  emailButton,
  emailBox,
  emailSignoff,
  esc,
  MUTED,
  emailLogoSrc,
} from "@/lib/email-templates";

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
  const subject = `📋 Finalisez votre inscription — ${insc.session.formation.titre}`;
  const html = emailShell({
    organisme: org.name,
    representant: org.representant,
      logoUrl: emailLogoSrc(org.id, org.logoUrl),
    body:
      emailHeading(`Votre inscription est bien reçue, ${esc(insc.candidat.prenom)} ✅`) +
      emailParagraph(
        `Votre inscription à <b>« ${esc(insc.session.formation.titre)} »</b> est enregistrée. Il ne reste qu'une étape&nbsp;: <b>compléter votre dossier et signer vos documents</b> en ligne.`,
      ) +
      emailButton("Compléter & signer mon dossier →", link) +
      emailBox(
        `🔒 Ce lien est <b>personnel et sécurisé</b>.<br>📎 Le <b>programme de la formation</b> est en pièce jointe.<br>À l'issue, vous recevrez une copie de vos documents signés.`,
      ) +
      emailSignoff("À très vite,", org.representant),
  });

  // Le programme joint est BEST-EFFORT : une panne de génération PDF (ex. Chromium
  // serverless indisponible) ne doit JAMAIS faire échouer l'envoi du lien. Sans
  // ce garde, l'exception remontait jusqu'à un plant de rendu (digest en prod).
  let progPdf: Awaited<ReturnType<typeof buildSingleDocPdf>> = null;
  try {
    progPdf = await buildSingleDocPdf(inscriptionId, "PROGRAMME");
  } catch (e) {
    console.error("startParcours: génération du programme PDF échouée (ignorée)", e);
  }
  const res = await sendEmail({
    to: insc.candidat.email,
    subject,
    html,
    attachments: progPdf
      ? [{ name: "Programme-formation.pdf", content: toBase64(progPdf.data) }]
      : undefined,
  });
  await prisma.emailLog.create({
    data: {
      organismeId: insc.organismeId,
      destinataire: insc.candidat.email,
      sujet: subject,
      corps: html,
      statut: res.sent ? EmailStatut.ENVOYE : EmailStatut.EN_ATTENTE,
      sentAt: res.sent ? new Date() : null,
      sessionId: insc.sessionId,
    },
  });

  revalidatePath(`/candidats/${insc.candidatId}`);
  revalidatePath(`/sessions/${insc.sessionId}`);
  return { ok: true };
}

const PARCOURS_STAFF = ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"];

/**
 * Vérifie que l'appelant est un collaborateur (staff) de l'organisme propriétaire
 * de l'inscription. Renvoie null si autorisé, sinon un message d'erreur.
 * Empêche qu'un compte d'un autre organisme (ou un rôle non-staff) relance un
 * parcours sur une inscription qui ne lui appartient pas.
 */
async function assertStaffOwnsInscription(inscriptionId: string): Promise<string | null> {
  const session = await auth();
  const role = session?.user?.role as string | undefined;
  const organismeId = session?.user?.organismeId;
  if (!session?.user || !role || !PARCOURS_STAFF.includes(role) || !organismeId)
    return "Non autorisé.";
  const insc = await prisma.inscription.findFirst({
    where: { id: inscriptionId, organismeId },
    select: { id: true },
  });
  return insc ? null : "Inscription introuvable.";
}

/** Bouton serveur : (re)lance le parcours depuis l'interface admin. */
export async function resendParcoursAction(formData: FormData) {
  const inscriptionId = String(formData.get("inscriptionId"));
  if (await assertStaffOwnsInscription(inscriptionId)) return;
  try {
    await startParcours(inscriptionId);
  } catch (e) {
    console.error("resendParcoursAction: échec relance parcours", e);
  }
}

/** Relance le lien de parcours/signature et renvoie un résultat (pour le toast). */
export async function relanceParcours(
  inscriptionId: string,
): Promise<{ ok: boolean; demo: boolean; error?: string }> {
  const denied = await assertStaffOwnsInscription(inscriptionId);
  if (denied) return { ok: false, demo: true, error: denied };
  // On n'autorise AUCUNE exception à remonter : une action serveur qui lève
  // produit un plant de rendu (« Cette page n'a pas pu s'afficher », digest en
  // prod). On renvoie toujours un résultat exploitable par le toast.
  try {
    const r = await startParcours(inscriptionId);
    revalidatePath("/signatures");
    return { ok: r.ok, demo: !emailConfigured(), error: r.error };
  } catch (e) {
    console.error("relanceParcours: échec relance parcours", e);
    return { ok: false, demo: !emailConfigured(), error: "Envoi impossible (erreur serveur). Réessayez ou vérifiez la configuration." };
  }
}

export type ParcoursFormValues = {
  telephone?: string;
  dateNaissance?: string;
  nationalite?: string;
  paysNaissance?: string;
  departementNaissance?: string;
  lieuNaissance?: string;
  adresse?: string;
  codePostal?: string;
  ville?: string;
  pays?: string;
  situationPro?: string;
  employeur?: string;
  posteOccupe?: string;
  dernierDiplome?: string;
  financementType?: string;
  situationHandicap?: boolean;
  besoinsAdaptation?: string;
  // Blocs conditionnels (sécurité privée CNAPS / SSIAP), selon la formation.
  cnapsStatut?: string;
  carteProNumero?: string;
  carteProValidite?: string;
  ssiapNiveau?: string;
  ssiapDiplomeNumero?: string;
  ssiapDiplomeDate?: string;
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
      nationalite: clean(values.nationalite) ?? insc.candidat.nationalite,
      paysNaissance: clean(values.paysNaissance) ?? insc.candidat.paysNaissance,
      departementNaissance: clean(values.departementNaissance) ?? insc.candidat.departementNaissance,
      lieuNaissance: clean(values.lieuNaissance) ?? insc.candidat.lieuNaissance,
      adresse: clean(values.adresse) ?? insc.candidat.adresse,
      codePostal: clean(values.codePostal) ?? insc.candidat.codePostal,
      ville: clean(values.ville) ?? insc.candidat.ville,
      pays: clean(values.pays) ?? insc.candidat.pays,
      situationPro: clean(values.situationPro) ?? insc.candidat.situationPro,
      employeur: clean(values.employeur) ?? insc.candidat.employeur,
      posteOccupe: clean(values.posteOccupe) ?? insc.candidat.posteOccupe,
      dernierDiplome: clean(values.dernierDiplome) ?? insc.candidat.dernierDiplome,
      situationHandicap: values.situationHandicap ?? insc.candidat.situationHandicap,
      besoinsAdaptation: clean(values.besoinsAdaptation) ?? insc.candidat.besoinsAdaptation,
      cnapsStatut: values.cnapsStatut ? (values.cnapsStatut as CnapsStatut) : insc.candidat.cnapsStatut,
      carteProNumero: clean(values.carteProNumero) ?? insc.candidat.carteProNumero,
      carteProValidite: values.carteProValidite
        ? new Date(values.carteProValidite)
        : insc.candidat.carteProValidite,
      ssiapNiveau:
        values.ssiapNiveau && /^[123]$/.test(values.ssiapNiveau.trim())
          ? Number(values.ssiapNiveau.trim())
          : insc.candidat.ssiapNiveau,
      ssiapDiplomeNumero: clean(values.ssiapDiplomeNumero) ?? insc.candidat.ssiapDiplomeNumero,
      ssiapDiplomeDate: values.ssiapDiplomeDate
        ? new Date(values.ssiapDiplomeDate)
        : insc.candidat.ssiapDiplomeDate,
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

/**
 * Étape « lire les documents contractuels » : le candidat déclare avoir consulté
 * ses documents (convention, programme, règlement…) avant de pouvoir signer.
 * Enregistre l'horodatage (traçabilité Qualiopi). Public, via le lien tokenisé.
 */
export async function markDocsLus(
  token: string,
): Promise<{ ok: boolean; error?: string }> {
  const insc = await prisma.inscription.findUnique({
    where: { accessToken: token },
    select: { id: true, formCompletedAt: true, docsLusAt: true },
  });
  if (!insc) return { ok: false, error: "Lien invalide ou expiré." };
  if (!insc.formCompletedAt)
    return { ok: false, error: "Complétez d'abord vos informations." };
  if (insc.docsLusAt) return { ok: true }; // déjà consulté
  await prisma.inscription.update({
    where: { id: insc.id },
    data: { docsLusAt: new Date() },
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

  // Génère le dossier signé en PDF (joint à l'e-mail) : docs signés APPLICABLES
  // au profil + certificat. `signedOnly` applique la règle particulier→contrat /
  // professionnel→convention (cf. #10) — on n'envoie plus les deux en vrac.
  const dossier = await buildInscriptionPdf(insc.id, { signedOnly: true });
  const subject = `✅ Vos documents signés sont prêts — ${insc.session.formation.titre}`;
  const html = emailShell({
    organisme: org.name,
    representant: org.representant,
      logoUrl: emailLogoSrc(org.id, org.logoUrl),
    accent: "green",
    body:
      emailHeading(`C'est signé, ${esc(insc.candidat.prenom)} 🖊️`) +
      emailParagraph(
        `Nous confirmons la <b>signature de vos documents d'inscription</b> le <b>${esc(now.toLocaleString("fr-FR"))}</b>. Tout est en ordre.`,
      ) +
      emailBox(
        `📎 <b>En pièce jointe</b> (PDF)&nbsp;: vos documents d'inscription signés, ainsi que votre <b>certificat de signature électronique</b>.`,
        "green",
      ) +
      emailParagraph(
        `Vous recevez par ailleurs votre <b>convocation à la formation</b> dans un e-mail séparé.`,
      ) +
      emailSignoff("À bientôt,", org.representant),
  });

  const res = await sendEmail({
    to: insc.candidat.email,
    subject,
    html,
    attachments: dossier
      ? [{ name: dossier.filename, content: toBase64(dossier.data) }]
      : undefined,
  });
  await prisma.emailLog.create({
    data: {
      organismeId: insc.organismeId,
      destinataire: insc.candidat.email,
      sujet: subject,
      corps: html,
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
    const subjectConv = `🎉 Bienvenue chez ${org.name} — votre inscription est confirmée`;
    const lignesConv = [`📅 <b>Dates</b> : du ${esc(f(s.dateDebut))} au ${esc(f(s.dateFin))}`];
    if (s.horaires) lignesConv.push(`🕘 <b>Horaires</b> : ${esc(s.horaires)}`);
    if (s.lieu) lignesConv.push(`📍 <b>Lieu</b> : ${esc(s.lieu)}`);
    const htmlConv = emailShell({
      organisme: org.name,
      representant: org.representant,
      logoUrl: emailLogoSrc(org.id, org.logoUrl),
      body:
        emailHeading(`Bienvenue, ${esc(insc.candidat.prenom)} 🎉`) +
        emailParagraph(
          `Nous avons le plaisir de confirmer votre inscription à <b>« ${esc(s.formation.titre)} »</b>. Voici votre récapitulatif&nbsp;:`,
        ) +
        emailBox(lignesConv.join("<br>")) +
        emailParagraph(
          `📎 Votre <b>convocation</b> et le <b>programme</b> sont en pièce jointe (PDF). Pensez à votre <b>pièce d'identité</b> le jour J.`,
        ) +
        emailSignoff("Excellente formation à vous,", org.representant),
    });
    const convPdf = await buildSingleDocPdf(insc.id, "CONVOCATION");
    const progPdf = await buildSingleDocPdf(insc.id, "PROGRAMME");
    const resConv = await sendEmail({
      to: insc.candidat.email,
      subject: subjectConv,
      html: htmlConv,
      attachments: [
        ...(convPdf ? [{ name: "Convocation.pdf", content: toBase64(convPdf.data) }] : []),
        ...(progPdf ? [{ name: "Programme-formation.pdf", content: toBase64(progPdf.data) }] : []),
      ],
    });
    await prisma.emailLog.create({
      data: {
        organismeId: insc.organismeId,
        destinataire: insc.candidat.email,
        sujet: subjectConv,
        corps: htmlConv,
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

  // Rôles privilégiés : NE JAMAIS les rétrograder en APPRENANT si la même
  // adresse e-mail signe un parcours (un admin/formateur peut aussi être inscrit
  // à une formation). On ne fait que rattacher le dossier apprenant.
  const PRIVILEGED_ROLES = ["SUPERADMIN", "ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT", "FORMATEUR"];

  // Compte de connexion
  let motDePasse: string | null = null;
  if (!apprenant.userId) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      const keepRole = PRIVILEGED_ROLES.includes(existing.role);
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          // On conserve le rôle privilégié ; sinon on donne l'accès apprenant.
          ...(keepRole ? {} : { role: "APPRENANT" }),
          isActive: true,
          organismeId: existing.organismeId ?? insc.organismeId,
        },
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
          // Mot de passe provisoire → changement forcé à la 1re connexion.
          mustChangePassword: true,
        },
      });
      await prisma.apprenant.update({
        where: { id: apprenant.id },
        data: { userId: user.id },
      });
    }
  }

  // E-mail de BIENVENUE — envoyé systématiquement (accès à l'espace candidat),
  // qu'il y ait des cours en ligne ou non.
  const loginUrl = `${appBaseUrl()}/login`;
  // Encadré identifiants : compte neuf (mot de passe provisoire) ou compte existant.
  const credBox = motDePasse
    ? emailBox(
        `🔑 <b>Identifiant</b> : ${esc(email)}<br>🔒 <b>Mot de passe provisoire</b> : ${esc(motDePasse)}<br><span style="color:${MUTED}">À votre première connexion, vous choisirez votre propre mot de passe.</span>`,
      )
    : emailBox(
        `🔑 Connectez-vous avec votre adresse e-mail (<b>${esc(email)}</b>) et votre <b>mot de passe habituel</b>.`,
      );
  // Liste des cours en ligne (uniquement s'il y en a).
  const coursBox = cours.length
    ? emailBox(
        `📚 <b>Vos cours en ligne</b>&nbsp;:<br>${cours.map((c) => `• ${esc(c.titre)}`).join("<br>")}`,
      )
    : "";
  const subject = `🔑 Votre espace candidat est prêt — ${org.name}`;
  const html = emailShell({
    organisme: org.name,
    representant: org.representant,
      logoUrl: emailLogoSrc(org.id, org.logoUrl),
    body:
      emailHeading(`Votre espace est ouvert, ${esc(insc.candidat.prenom)} 🚀`) +
      emailParagraph(
        `Depuis votre <b>espace candidat</b>, vous pourrez suivre vos formations, consulter et signer vos documents, déposer vos justificatifs et échanger avec nous — tout au même endroit.`,
      ) +
      emailButton("Accéder à mon espace →", loginUrl) +
      credBox +
      coursBox +
      emailSignoff("À bientôt,", org.representant),
  });

  const res = await sendEmail({ to: email, subject, html });
  await prisma.emailLog.create({
    data: {
      organismeId: insc.organismeId,
      destinataire: email,
      sujet: subject,
      corps: html,
      statut: res.sent ? EmailStatut.ENVOYE : EmailStatut.EN_ATTENTE,
      sentAt: res.sent ? new Date() : null,
      sessionId: insc.sessionId,
    },
  });
}
