"use server";

import { EmailStatut } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, toBase64 } from "@/lib/email";
import { orgConfigFor } from "@/lib/org-identity";
import { loadSessionProformas } from "@/lib/factures/proforma-data";
import { buildProformaPdf } from "@/lib/factures/proforma-pdf";
import {
  emailShell,
  emailParagraph,
  emailBox,
  emailSignoff,
  esc,
  emailLogoSrc,
} from "@/lib/email-templates";

const STAFF = ["SUPERADMIN", "ADMIN", "RESPONSABLE_FORMATION"];
type Result = { ok: true; to: string } | { ok: false; error: string };

/** Envoie la facture proforma (PDF en pièce jointe) au client d'une cible. */
export async function envoyerProforma(sessionId: string, cibleKey: string): Promise<Result> {
  const session = await auth();
  const role = session?.user?.role as string | undefined;
  const organismeId = session?.user?.organismeId ?? null;
  if (!session?.user || !role || !STAFF.includes(role)) return { ok: false, error: "Non autorisé." };

  const res = await loadSessionProformas(sessionId);
  if (!res) return { ok: false, error: "Session introuvable." };
  const cible = res.cibles.find((c) => c.key === cibleKey);
  if (!cible) return { ok: false, error: "Proforma introuvable." };
  if (!cible.clientEmail) return { ok: false, error: "Aucune adresse e-mail pour ce client." };

  const org = await orgConfigFor(organismeId);
  const suffixe = (cibleKey.split(":")[1] ?? "").slice(0, 6);
  const numero = `PROFORMA-${new Date().getFullYear()}-${res.session.ref}-${suffixe}`.replace(/[^\w-]+/g, "-");
  const { data, filename } = await buildProformaPdf(cible, org, {
    numero,
    dateEmission: new Date(),
    sessionRef: res.session.ref,
  });

  const subject = `Facture proforma — ${res.session.formationTitre}`;
  const html = emailShell({
    organisme: org.name,
    representant: org.representant,
    logoUrl: emailLogoSrc(org.id, org.logoUrl),
    body:
      emailParagraph("Bonjour,") +
      emailParagraph(
        `Veuillez trouver ci-joint la <b>facture proforma</b> relative à la formation «&nbsp;${esc(res.session.formationTitre)}&nbsp;».`,
      ) +
      emailBox(
        "📄 Ce document prépare la facturation&nbsp;: il ne constitue pas une facture et ne donne pas lieu à paiement définitif. La facture définitive vous sera adressée séparément.",
      ) +
      emailSignoff("Cordialement,", org.representant),
  });

  const send = await sendEmail({
    to: cible.clientEmail,
    subject,
    html,
    attachments: [{ name: filename, content: toBase64(data) }],
    organismeId,
  });

  await prisma.emailLog.create({
    data: {
      organismeId,
      destinataire: cible.clientEmail,
      sujet: subject,
      corps: html,
      statut: send.sent ? EmailStatut.ENVOYE : EmailStatut.EN_ATTENTE,
      sentAt: send.sent ? new Date() : null,
      sessionId,
    },
  });

  revalidatePath(`/sessions/${sessionId}`);
  if (!send.sent) {
    return { ok: false, error: "L'e-mail n'a pas pu être envoyé (vérifiez la configuration e-mail)." };
  }
  return { ok: true, to: cible.clientEmail };
}
