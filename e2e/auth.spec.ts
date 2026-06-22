import { test, expect, type Page } from "@playwright/test";

const CLIENT = { email: "demo-secu@cap.fr", pass: "CapSecu2026!" };
const SUPER = { email: "infocap.comp+dev@gmail.com", pass: "CapDev2026!" };

async function login(page: Page, email: string, pass: string) {
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", pass);
  await page.click('button[type="submit"]');
}

test.describe("Authentification & autorisation", () => {
  test("une route protégée sans session redirige vers /login", async ({ page }) => {
    await page.goto("/candidats");
    await expect(page).toHaveURL(/\/login/);
  });

  test("connexion client → tableau de bord", async ({ page }) => {
    await login(page, CLIENT.email, CLIENT.pass);
    await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("le SUPERADMIN accède à la console", async ({ page }) => {
    await login(page, SUPER.email, SUPER.pass);
    await page.waitForURL(/\/(console|dashboard)/, { timeout: 20_000 });
    await page.goto("/console");
    await expect(page).toHaveURL(/\/console/);
    await expect(page.getByText(/console|organismes|tableau de bord/i).first()).toBeVisible();
  });

  test("un mauvais mot de passe ne connecte pas (reste sur le login)", async ({ page }) => {
    await login(page, CLIENT.email, "mauvais-mot-de-passe");
    await page.waitForTimeout(1500);
    await expect(page.locator("#password")).toBeVisible();
    await expect(page).not.toHaveURL(/\/dashboard/);
  });
});
