import { test, expect } from "@playwright/test";

// Smoke des exports (CSV / Excel / PDF) — connecté en tenant sécurité privée.
const EXPORTS = [
  "/candidats/export",
  "/sessions/export",
  "/comptabilite/export",
  "/rapports/pedagogique",
];
const CT: Record<string, RegExp> = {
  csv: /text\/csv/,
  xlsx: /spreadsheetml\.sheet/,
  pdf: /application\/pdf/,
};

test("exports CSV/Excel/PDF répondent et ont le bon type", async ({ page }) => {
  test.setTimeout(180_000); // les PDF démarrent un Chromium à chaque appel
  await page.goto("/login");
  await page.fill("#email", "demo-secu@cap.fr");
  await page.fill("#password", "CapSecu2026!");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 20_000 });

  for (const base of EXPORTS) {
    for (const fmt of ["csv", "xlsx", "pdf"] as const) {
      const res = await page.request.get(`${base}?format=${fmt}`);
      const ct = res.headers()["content-type"] ?? "";
      const body = await res.body();
      console.log(`[export] ${base}?format=${fmt} → ${res.status()} ${ct} (${body.length}o)`);
      expect(res.status(), `${base} ${fmt}`).toBe(200);
      expect(ct, `${base} ${fmt} content-type`).toMatch(CT[fmt]);
      expect(body.length, `${base} ${fmt} non vide`).toBeGreaterThan(50);
    }
  }
});
