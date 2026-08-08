import { test, expect } from "@playwright/test";

// Anomalie signalée : « les photos ajoutées depuis la console site vitrine
// ne s'affichent pas ». On vérifie (1) la page de gestion des photos et
// (2) l'API publique consommée par le site vitrine.
test("photos du site vitrine : console + API publique", async ({ page }) => {
  test.setTimeout(180_000);
  const erreurs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") erreurs.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => erreurs.push("PAGEERROR: " + String(e).slice(0, 200)));

  await page.goto("/login");
  await page.fill("#email", "infocap.comp@gmail.com");
  await page.fill("#password", "CapCap2026@");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });

  const t0 = Date.now();
  const res = await page.goto("/site-vitrine/photos", { waitUntil: "domcontentloaded", timeout: 120_000 });
  console.log(`[PHOTOS] statut=${res?.status()} | chargement=${Date.now() - t0} ms`);

  await page.waitForTimeout(3000);

  // Combien d'images sont réellement rendues, et combien s'affichent vraiment ?
  const bilan = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll("img"));
    return {
      total: imgs.length,
      chargees: imgs.filter((i) => (i as HTMLImageElement).naturalWidth > 0).length,
      cassees: imgs
        .filter((i) => (i as HTMLImageElement).naturalWidth === 0)
        .map((i) => ((i as HTMLImageElement).src || "").slice(0, 60)),
    };
  });
  console.log(`[PHOTOS] <img> dans la page : ${bilan.total} | affichées : ${bilan.chargees} | cassées : ${bilan.cassees.length}`);
  for (const c of bilan.cassees.slice(0, 5)) console.log(`   cassée → ${c}…`);

  const corps = await page.locator("body").innerText().catch(() => "");
  console.log(`[PHOTOS] texte page (200c) : ${corps.slice(0, 200).replace(/\s+/g, " ")}`);

  // API publique consommée par le site vitrine
  const api = await page.request.get("/api/public/photos").catch(() => null);
  if (api) {
    const txt = await api.text();
    console.log(`[PHOTOS] /api/public/photos → statut=${api.status()} | taille=${txt.length} o`);
    console.log(`[PHOTOS] extrait : ${txt.slice(0, 160).replace(/\s+/g, " ")}`);
  } else {
    console.log("[PHOTOS] /api/public/photos → INJOIGNABLE");
  }

  if (erreurs.length) console.log(`[PHOTOS] erreurs console :\n  - ${erreurs.slice(0, 8).join("\n  - ")}`);
  expect(res?.status()).toBeLessThan(500);
});
