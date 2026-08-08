import { defineConfig, devices } from "@playwright/test";

// Configuration dédiée à l'AUDIT QA : cible le serveur de PRODUCTION local
// (npm run build + next start -p 3100). Playwright démarre le serveur lui-même
// et le réutilise s'il tourne déjà.
export default defineConfig({
  testDir: "./e2e",
  testMatch: /audit-.*\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  timeout: 300_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npx next start -p 3100",
    url: "http://localhost:3100/login",
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
