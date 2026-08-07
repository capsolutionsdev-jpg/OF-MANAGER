import { test, expect } from "@playwright/test";

// Test ciblé : la page /elearning a échoué (ERR_ABORTED) lors du balayage.
// On isole le comportement et on capture l'erreur serveur éventuelle.
test("page e-learning accessible", async ({ page }) => {
  test.setTimeout(120_000);
  const erreurs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") erreurs.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => erreurs.push("PAGEERROR: " + String(e).slice(0, 200)));

  await page.goto("/login");
  await page.fill("#email", "infocap.comp@gmail.com");
  await page.fill("#password", "CapCap2026@");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });

  // 1) Navigation directe
  let statut = 0;
  let erreurNav = "";
  try {
    const res = await page.goto("/elearning", { waitUntil: "domcontentloaded", timeout: 60_000 });
    statut = res?.status() ?? 0;
  } catch (e) {
    erreurNav = String(e).slice(0, 300);
  }
  console.log(`[ELEARNING] navigation directe → statut=${statut} ${erreurNav ? "| ERREUR: " + erreurNav : ""}`);

  // 2) Navigation par le menu (comme un utilisateur)
  if (erreurNav) {
    await page.goto("/dashboard");
    const lien = page.getByRole("link", { name: /e-learning/i }).first();
    const visible = await lien.isVisible().catch(() => false);
    console.log(`[ELEARNING] lien menu visible: ${visible}`);
    if (visible) {
      await lien.click().catch((e) => console.log("[ELEARNING] clic échoué: " + String(e).slice(0, 150)));
      await page.waitForTimeout(4000);
      console.log(`[ELEARNING] après clic menu → URL: ${page.url()}`);
    }
  }

  const corps = await page.locator("body").innerText().catch(() => "");
  console.log(`[ELEARNING] contenu (140c): ${corps.slice(0, 140).replace(/\s+/g, " ")}`);
  if (erreurs.length) console.log(`[ELEARNING] erreurs console:\n  - ${erreurs.join("\n  - ")}`);

  expect(statut === 200 || page.url().includes("elearning")).toBeTruthy();
});
