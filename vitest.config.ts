import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // "server-only" lève une erreur hors RSC → stub vide en test.
      "server-only": path.resolve(__dirname, "src/test/empty-module.ts"),
    },
  },
});
