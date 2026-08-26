import { defineConfig, devices } from "@playwright/test";

/**
 * Configuration E2E principale (specs générales : auth, smoke, security, a11y, exports).
 * Les specs d'AUDIT (`audit-*.spec.ts`) ont leur propre config dédiée
 * (playwright.audit.config.ts, serveur de prod local :3100) et sont exclues ici.
 *
 * ⚠️ Garde anti-catastrophe (dev = prod aujourd'hui) : ces E2E lancent `npm run dev`,
 * qui se connecte à DATABASE_URL et PEUVENT muter la base. On REFUSE de démarrer si
 * DATABASE_URL ne pointe pas une base de test locale/éphémère (localhost / testdb),
 * sauf override explicite E2E_ALLOW_NONLOCAL_DB=1. Empêche de jouer les E2E contre la prod.
 */
const dbUrl = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /localhost|127\.0\.0\.1|\/testdb(\?|$)/.test(dbUrl);
if (dbUrl && !isLocalTestDb && !process.env.E2E_ALLOW_NONLOCAL_DB) {
  throw new Error(
    "⛔ E2E bloqués : DATABASE_URL ne pointe pas une base de test locale/éphémère " +
      "(localhost / testdb). Les tests E2E peuvent muter la base. Pointez DATABASE_URL " +
      "vers une base de test, ou posez E2E_ALLOW_NONLOCAL_DB=1 en connaissance de cause.",
  );
}

export default defineConfig({
  testDir: "./e2e",
  // Les specs d'audit ont leur propre config (serveur prod :3100).
  testIgnore: /audit-.*\.spec\.ts/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "Mobile Chrome", use: { ...devices["Pixel 5"] } },
    { name: "Mobile Safari", use: { ...devices["iPhone 12"] } },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000, // le dev server met du temps à compiler la 1re page en CI
  },
});
