import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
    // Redirige Prisma vers la base de test (DATABASE_URL_TEST) avant tout import.
    setupFiles: ["./src/test/setup-db.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // "server-only" lève une erreur hors RSC → stub vide en test.
      "server-only": path.resolve(__dirname, "src/test/empty-module.ts"),
    },
  },
});
