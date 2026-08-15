// Sentry — runtime Node (serveur). Initialisé UNIQUEMENT si `SENTRY_DSN` est
// défini → totalement inerte tant qu'aucun DSN n'est configuré (aucun envoi,
// aucun effet). Chargé par src/instrumentation.ts au démarrage du serveur.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
    // Traces désactivées par défaut (coût) — réglable via env sans redéploiement de code.
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0),
    // Ne pas envoyer la PII par défaut (RGPD) ; à activer explicitement si besoin.
    sendDefaultPii: false,
  });
}
