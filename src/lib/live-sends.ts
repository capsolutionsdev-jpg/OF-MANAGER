/**
 * Faut-il BLOQUER les envois réels (e-mail / SMS) dans l'environnement courant ?
 *
 * Sur Vercel, on n'envoie jamais à de vrais destinataires hors production
 * (preview / staging) — sauf activation explicite `EMAIL_LIVE=1` (A12-008).
 * En local, en test et en self-host (`VERCEL_ENV` absent), aucun blocage ici :
 * ces contextes gèrent déjà l'envoi via la présence/absence de clés d'API.
 */
export function liveSendsBlocked(): boolean {
  const vercelEnv = process.env.VERCEL_ENV;
  return !!vercelEnv && vercelEnv !== "production" && process.env.EMAIL_LIVE !== "1";
}
