import "server-only";
import { sendEmail } from "@/lib/email";
import { emailShell, emailHeading, emailParagraph, emailButton, esc } from "@/lib/email-templates";
import { orgConfigFor } from "@/lib/org-identity";
import { getTenantDb } from "@/lib/tenant";
import { appBaseUrl } from "@/lib/token";

type Kind = "confirmee" | "contre_proposee" | "refusee";

/**
 * Notifie le client B2B (Entreprise.contactEmail) d'une transition de sa demande.
 * Best-effort : ne lève jamais (une erreur d'e-mail ne doit pas casser l'action).
 * Résout lui-même le client tenant-scopé (même tenant que l'action appelante).
 */
export async function notifyClientDemande(opts: {
  entrepriseId: string;
  organismeId: string | null;
  kind: Kind;
  formationTitre: string;
  extra?: string | null;
}): Promise<void> {
  try {
    const db = await getTenantDb();
    const ent = await db.entreprise.findFirst({
      where: { id: opts.entrepriseId },
      select: { contactEmail: true },
    });
    const to = (ent?.contactEmail ?? "").trim();
    if (!to) return;

    const org = await orgConfigFor(opts.organismeId);
    const inscriptionsUrl = `${appBaseUrl()}/espace-entreprise/inscriptions`;
    const conventionUrl = `${appBaseUrl()}/espace-entreprise/convention`;
    const f = esc(opts.formationTitre);

    let heading: string;
    let body: string;
    if (opts.kind === "confirmee") {
      heading = "Demande confirmée — convention à signer";
      body =
        emailParagraph(`Votre demande d'inscription pour « ${f} » est <strong>confirmée</strong>.`) +
        emailParagraph(
          "La convention de formation est disponible dans votre espace client : téléchargez-la, faites-la signer et tamponner, puis redéposez la version signée (ou renvoyez-la par e-mail à votre organisme).",
        ) +
        emailButton("Accéder à ma convention", conventionUrl);
    } else if (opts.kind === "contre_proposee") {
      heading = "Une autre date vous est proposée";
      body =
        emailParagraph(`Pour « ${f} », votre organisme de formation vous propose une autre date.`) +
        (opts.extra ? emailParagraph(esc(opts.extra)) : "") +
        emailParagraph("Vous pouvez l'accepter ou la refuser depuis votre espace client.") +
        emailButton("Voir la proposition", inscriptionsUrl);
    } else {
      heading = "Votre demande n'a pas été retenue";
      body =
        emailParagraph(`Votre demande d'inscription pour « ${f} » n'a pas pu être retenue.`) +
        (opts.extra ? emailParagraph(`Motif : ${esc(opts.extra)}`) : "") +
        emailParagraph("N'hésitez pas à formuler une nouvelle demande depuis votre espace client.");
    }

    const html = emailShell({
      organisme: org.name,
      representant: org.representant,
      logoUrl: org.logoUrl,
      body: emailHeading(heading) + body,
    });

    await sendEmail({ to, subject: heading, html, organismeId: opts.organismeId });
  } catch {
    // best-effort : on n'interrompt jamais l'action métier pour un e-mail.
  }
}
