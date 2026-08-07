import { test, expect } from "@playwright/test";

// Vérifie le correctif « fuite marque blanche » : un tenant SANS cachet ne doit
// PLUS afficher le tampon/signature CAP sur ses documents (box vide).
const INSCRIPTION_ID = "cmqjw63g90008uvvgl9o9m0eh"; // tenant Sécurité Privée Démo (cachet vide)
const EMPTY_MARK = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwC"; // début du pixel transparent EMPTY_IMAGE

test("aucun tampon CAP sur un tenant sans cachet", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/login");
  await page.fill("#email", "demo-secu@cap.fr");
  await page.fill("#password", "CapSecu2026!");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });

  for (const type of ["CONTRAT_FORMATION", "REGLEMENT_INTERIEUR", "CONVOCATION"]) {
    const res = await page.request.get(`/documents/${INSCRIPTION_ID}/${type}`, { timeout: 30_000 });
    const html = await res.text();
    const refCap = html.includes("/signature-cap-competences.png") || html.includes("Cachet et signature CAP Comp");
    const pixelVide = html.includes(EMPTY_MARK);
    console.log(`[TAMPON] ${type} → ref CAP: ${refCap ? "OUI ⚠️" : "non"} | box vide (pixel): ${pixelVide ? "OUI" : "non"}`);
    expect(refCap, `${type} référence encore l'asset CAP`).toBe(false);
  }
});
