import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Accessibilité : aucune violation de gravité « critique » sur les pages clés.
// (les violations serious/moderate sont listées dans les logs pour le rapport.)
function logViolations(
  label: string,
  violations: { id: string; impact?: string | null; nodes?: { target: unknown[] }[] }[],
) {
  const summary = violations.map((v) => `${v.impact ?? "?"}:${v.id}`);
  if (summary.length) console.log(`[a11y] ${label} →`, summary.join(", "));
  for (const v of violations) {
    for (const n of v.nodes ?? []) {
      console.log(`[a11y]   ${v.id} @ ${JSON.stringify(n.target)}`);
    }
  }
}

test.describe("Accessibilité (axe-core)", () => {
  test("page de connexion — aucune violation critique @compat", async ({ page }) => {
    await page.goto("/login");
    const results = await new AxeBuilder({ page }).analyze();
    logViolations("/login", results.violations);
    const critical = results.violations.filter((v) => v.impact === "critical");
    expect(critical, critical.map((v) => v.id).join(", ")).toHaveLength(0);
  });

  test("écrans authentifiés denses — aucune violation critique", async ({ page }) => {
    // Une seule connexion (anti rate-limit / session unique), puis on balaie les
    // écrans les plus denses du back-office (cf. audit FRT-04).
    await page.goto("/login");
    await page.fill("#email", "demo-secu@cap.fr");
    await page.fill("#password", "CapSecu2026!");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 20_000 });

    const paths = ["/dashboard", "/candidats", "/crm", "/sessions", "/devis", "/qualiopi"];
    const critical: string[] = [];
    for (const path of paths) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const results = await new AxeBuilder({ page }).analyze();
      logViolations(path, results.violations);
      for (const v of results.violations.filter((x) => x.impact === "critical")) {
        critical.push(`${path}:${v.id}`);
      }
    }
    expect(critical, critical.join(", ")).toHaveLength(0);
  });
});
