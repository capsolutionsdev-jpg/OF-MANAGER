// setupFile Vitest — exécuté AVANT les modules de test.
// Si une base de test isolée est fournie (DATABASE_URL_TEST), on y redirige
// Prisma. Garantit qu'aucun test d'intégration n'écrit JAMAIS dans la base de
// dev/prod. Sans cette variable, les tests d'écriture/isolation s'auto-ignorent.
if (process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
  process.env.DIRECT_URL = process.env.DATABASE_URL_TEST;
}

export {};
