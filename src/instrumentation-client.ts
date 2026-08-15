// Sentry — navigateur (client). Inerte sans `NEXT_PUBLIC_SENTRY_DSN`.
// Next.js charge automatiquement ce fichier côté client (App Router).
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
    tracesSampleRate: 0,
    sendDefaultPii: false,
  });
}

// Instrumentation des navigations App Router (no-op si Sentry non initialisé).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
