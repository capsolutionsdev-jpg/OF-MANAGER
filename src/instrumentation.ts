// Point d'entrée d'instrumentation Next.js (App Router). Charge la config Sentry
// adaptée au runtime au démarrage, et transmet les erreurs de requête serveur
// (Server Components, route handlers) à Sentry. Tout est inerte tant que
// `SENTRY_DSN` n'est pas défini (cf. sentry.*.config).
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Capture automatique des erreurs App Router. No-op si Sentry n'est pas initialisé
// (aucun DSN) → aucun effet en l'absence de configuration.
export const onRequestError = Sentry.captureRequestError;
