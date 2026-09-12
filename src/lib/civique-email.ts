import { prisma } from "@/lib/prisma";

/**
 * Envoi de l'e-mail « code d'accès » d'un paiement civique : garanti « au plus une
 * fois » MAIS retentable (A12-003).
 *
 * Le fulfillment civique est appelé plusieurs fois (webhook Stripe + page de succès
 * + rejeux Stripe). Il faut donc :
 *  - un claim ATOMIQUE (`emailSentAt` null→now) pour empêcher un double envoi
 *    concurrent ;
 *  - mais RELÂCHER le claim (now→null) si l'envoi échoue, sinon un `emailSentAt`
 *    posé avant l'envoi verrouille définitivement un candidat PAYANT sans code
 *    d'accès (l'ancien comportement : claim avant envoi + retour `sendEmail` ignoré,
 *    or `sendEmail` ne lève jamais et renvoie `{ sent: false }`).
 *
 * @param send closure qui construit ET envoie l'e-mail — n'est exécutée que si le
 *             claim est remporté (donc l'e-mail n'est bâti qu'une fois).
 * @returns `claimed=false` si un autre appel détient déjà l'envoi (aucun envoi ici) ;
 *          sinon `sent` reflète le résultat réel de l'envoi.
 */
export async function sendCivicPaiementEmailOnce(
  paiementId: string,
  send: () => Promise<{ sent: boolean }>,
): Promise<{ sent: boolean; claimed: boolean }> {
  // Claim atomique : seul l'appel qui bascule emailSentAt de null→now enverra.
  const claim = await prisma.civicPaiement.updateMany({
    where: { id: paiementId, emailSentAt: null },
    data: { emailSentAt: new Date() },
  });
  if (claim.count !== 1) return { sent: false, claimed: false };

  let sent = false;
  try {
    const res = await send();
    sent = res.sent;
  } catch {
    sent = false;
  }

  // Échec → on relâche le claim pour qu'une ré-entrée (rejeu webhook / rechargement
  // de la page de succès) retente l'envoi. Succès → on conserve le claim.
  if (!sent) {
    await prisma.civicPaiement.updateMany({
      where: { id: paiementId },
      data: { emailSentAt: null },
    });
  }
  return { sent, claimed: true };
}
