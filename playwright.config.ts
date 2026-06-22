import { defineConfig, devices } from "@playwright/test";

// E2E lecture seule + accessibilité. workers=1 : la « session unique » par compte
// interdit les connexions concurrentes sur le même identifiant de test.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
  },
  projects: [
    // Chromium : suite complète (smoke, auth, a11y, sécurité).
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // Compatibilité de RENDU : uniquement les tests @compat (pages publiques,
    // sans connexion) → on évite de multiplier les logins (session unique +
    // rate-limit) tout en couvrant Firefox, WebKit et mobile.
    { name: "firefox", use: { ...devices["Desktop Firefox"] }, grep: /@compat/ },
    { name: "webkit", use: { ...devices["Desktop Safari"] }, grep: /@compat/ },
    { name: "mobile-chrome", use: { ...devices["Pixel 5"] }, grep: /@compat/ },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3100/login",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
