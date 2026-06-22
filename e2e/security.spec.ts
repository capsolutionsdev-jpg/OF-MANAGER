import { test, expect } from "@playwright/test";

test.describe("Sécurité", () => {
  test("les en-têtes de sécurité sont présents", async ({ page }) => {
    const res = await page.goto("/login");
    const h = res!.headers();
    expect(h["content-security-policy"] ?? "").toContain("object-src 'none'");
    expect(h["strict-transport-security"] ?? "").toContain("max-age=");
    expect(h["x-frame-options"]).toBe("SAMEORIGIN");
    expect(h["x-content-type-options"]).toBe("nosniff");
  });

  test("injection SQL au login → aucun contournement d'authentification", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", "admin@inconnu.fr");
    await page.fill("#password", "' OR '1'='1' --");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);
    // Aucune session ouverte : on ne doit jamais atteindre un espace authentifié.
    await expect(page).not.toHaveURL(/\/dashboard|\/console/);
  });

  test("charge XSS dans un champ → aucun script exécuté", async ({ page }) => {
    let dialogFired = false;
    page.on("dialog", async (d) => {
      dialogFired = true;
      await d.dismiss();
    });
    await page.goto("/login");
    await page.fill("#email", "xss@inconnu.fr");
    await page.fill("#password", "<script>alert('xss')</script>");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);
    expect(dialogFired).toBe(false);
    await expect(page).not.toHaveURL(/\/dashboard/);
  });

  test("accès direct à une route protégée → bloqué (redirection login)", async ({ page }) => {
    for (const route of ["/console", "/comptabilite", "/administration"]) {
      await page.goto(route);
      await expect(page, `route ${route}`).toHaveURL(/\/login/);
    }
  });
});
