import { NextResponse } from "next/server";
import { EmailStatut } from "@prisma/client";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import { sendEmail, toBase64 } from "@/lib/email";
import { orgConfigFor } from "@/lib/org-identity";
import { buildSingleDocPdf } from "@/lib/documents/build-pdf";
import { isRecyclageOuRemiseANiveau } from "@/lib/documents/families";
import {
  emailShell,
  emailHeading,
  emailParagraph,
  emailBox,
  emailSignoff,
  esc,
  emailLogoSrc,
} from "@/lib/email-templates";

// Génère l'attestation de réussite (PDF via Chromium) puis l'envoie par e-mail
// au candidat certifié — isolé dans une ROUTE (runtime nodejs + maxDuration 60)
// car la génération PDF n'est pas fiable dans une server action. Déclenché en
// arrière-plan par le client après une certification (résultat CERTIFIE).
// Idempotent : ne renvoie jamais deux fois (garde attestationReussiteSentAt).
export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const STAFF = ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"];

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Non autorisé." }, { status: 401 });
  }
  if (!STAFF.includes(session.user.role as string)) {
    return NextResponse.json({ ok: false, error: "Accès refusé." }, { status: 403 });
  }

  // getTenantDb() scope automatiquement au tenant du collaborateur connecté :
  // une inscription d'un autre organisme renverra donc « introuvable ».
  const db = await getTenantDb();
  const insc = await db.inscription.findUnique({
    where: { id },
    select: {
      organismeId: true,
      sessionId: true,
      resultatCertification: true,
      attestationReussiteSentAt: true,
      candidat: { select: { prenom: true, nom: true, email: true } },
      session: { select: { formation: { select: { titre: true, reference: true } } } },
    },
  });
  if (!insc) {
    return NextResponse.json({ ok: false, error: "Inscription introuvable." }, { status: 404 });
  }
  // Recyclage / remise à niveau : formation non certifiante → pas d'attestation
  // de réussite (cf. #13). Garde serveur en plus du blocage côté setCertification.
  if (isRecyclageOuRemiseANiveau(insc.session.formation)) {
    return NextResponse.json(
      { ok: false, error: "Formation de recyclage — pas d'attestation de réussite." },
      { status: 409 },
    );
  }
  if (insc.resultatCertification !== "CERTIFIE") {
    return NextResponse.json({ ok: false, error: "Candidat non certifié." }, { status: 409 });
  }
  // Déjà envoyée → succès idempotent (le client peut réappeler sans risque).
  if (insc.attestationReussiteSentAt) {
    return NextResponse.json({ ok: true, already: true });
  }

  try {
    const org = await orgConfigFor(insc.organismeId);
    const titre = insc.session.formation.titre;
    const prenom = insc.candidat.prenom;
    const subject = `🏆 Félicitations ${prenom}, vous avez obtenu « ${titre} » !`;
    const html = emailShell({
      organisme: org.name,
      representant: org.representant,
      logoUrl: emailLogoSrc(org.id, org.logoUrl),
      accent: "green",
      body:
        emailHeading(`Toutes nos félicitations, ${esc(prenom)} ! 🏆`) +
        emailParagraph(
          `Vous avez <b>satisfait aux épreuves d'évaluation</b> et obtenu la certification <b>« ${esc(titre)} »</b>. Un vrai accomplissement — bravo pour votre engagement&nbsp;!`,
        ) +
        emailBox(
          `📎 <b>En pièce jointe</b> : votre attestation de réussite (PDF).<br>🎓 Votre <b>diplôme officiel</b> vous sera transmis dès sa réception par nos services — nous vous écrirons à ce moment-là pour organiser sa remise.`,
          "green",
        ) +
        emailSignoff("Encore bravo, et à bientôt,", org.representant),
    });

    const pdf = await buildSingleDocPdf(id, "ATTESTATION_REUSSITE");
    const res = await sendEmail({
      to: insc.candidat.email,
      subject,
      html,
      attachments: pdf
        ? [{ name: "Attestation-reussite.pdf", content: toBase64(pdf.data) }]
        : undefined,
      organismeId: insc.organismeId,
    });

    await db.emailLog.create({
      data: {
        destinataire: insc.candidat.email,
        sujet: subject,
        corps: html,
        statut: res.sent ? EmailStatut.ENVOYE : EmailStatut.EN_ATTENTE,
        sentAt: res.sent ? new Date() : null,
        sessionId: insc.sessionId,
      },
    });
    await db.inscription.update({
      where: { id },
      data: { attestationReussiteSentAt: new Date() },
    });

    return NextResponse.json({ ok: true, sent: res.sent, pdf: !!pdf });
  } catch (e) {
    console.error("[attestation-reussite]", e);
    return NextResponse.json(
      { ok: false, error: "Génération ou envoi de l'attestation impossible." },
      { status: 500 },
    );
  }
}
