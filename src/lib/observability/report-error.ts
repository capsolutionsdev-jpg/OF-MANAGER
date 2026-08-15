import "server-only";

/**
 * Report d'erreur serveur, agnostique du fournisseur.
 *
 * - Toujours : journalisation structurée (préfixe + contexte, sans PII brute).
 * - Si Sentry est configuré (`SENTRY_DSN`) : capture l'exception avec le contexte.
 *
 * À utiliser dans les blocs `catch` qui « avalent » une erreur (best-effort PDF,
 * webhooks, crons…) pour qu'elle ne disparaisse pas silencieusement. L'import de
 * Sentry est dynamique et protégé : aucune dépendance dure, aucun effet sans DSN.
 */
export async function reportError(
  error: unknown,
  context?: { tag?: string; extra?: Record<string, unknown> },
): Promise<void> {
  const tag = context?.tag ? `[${context.tag}]` : "[error]";
  console.error(tag, context?.extra ?? {}, error);

  if (!process.env.SENTRY_DSN) return;
  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureException(error, {
      tags: context?.tag ? { source: context.tag } : undefined,
      extra: context?.extra,
    });
  } catch {
    /* Sentry indisponible : la journalisation console ci-dessus suffit. */
  }
}
