import { test, expect } from "@playwright/test";

// Smoke : l'application démarre et les pages publiques répondent (lecture seule).
test.describe("Smoke — démarrage & pages publiques", () => {
  test("la vitrine / charge", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/OFManager/i);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("la page de connexion affiche le formulaire", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("la page tarifs charge", async ({ page }) => {
    await page.goto("/tarifs");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("une page inexistante (préfixe public) renvoie 404", async ({ page }) => {
    // NB : pour un visiteur anonyme, une route PROTÉGÉE inconnue est redirigée
    // vers /login (comportement voulu du middleware). Le vrai 404 s'observe sous
    // un préfixe public (ex. /solutions/...), non intercepté par le middleware.
    const res = await page.goto("/solutions/page-inexistante-xyz");
    expect(res?.status()).toBe(404);
  });

  test("une route protégée inconnue redirige vers /login (anonyme)", async ({ page }) => {
    await page.goto("/route-protegee-inconnue-xyz");
    await expect(page).toHaveURL(/\/login/);
  });
});
