import { test, expect } from "@playwright/test";

// Vérifie le correctif « feuille d'émargement : 5 jours max par page » sur la
// session SSIAP 2 de 21 jours (tenant Académie Démo Formation).
const SESSION_ID = "cmrdd6h74013guve40j550qny";

test("feuille d'émargement découpée par semaine", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/login");
  await page.fill("#email", "demo@academie-demo.fr");
  await page.fill("#password", "Demo2026!");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });

  const res = await page.goto(`/sessions/${SESSION_ID}/emargement/feuille`, { waitUntil: "networkidle", timeout: 60_000 });
  console.log(`[FEUILLE] statut=${res?.status()}`);

  // Nombre de pages (une par semaine) et nb max de colonnes-jour par page.
  const bilan = await page.evaluate(() => {
    const pages = Array.from(document.querySelectorAll(".emarge-page"));
    const colsParPage = pages.map((pg) => {
      // 1re ligne d'en-tête : 1 cellule "Nom" (rowSpan) + N cellules jour (colSpan=2)
      const firstRow = pg.querySelector("table.emarge thead tr");
      const ths = firstRow ? Array.from(firstRow.querySelectorAll("th")) : [];
      return Math.max(0, ths.length - 1); // -1 pour la colonne "Nom"
    });
    return { nbPages: pages.length, colsParPage };
  });

  console.log(`[FEUILLE] pages (semaines) = ${bilan.nbPages}`);
  console.log(`[FEUILLE] jours par page = [${bilan.colsParPage.join(", ")}]`);
  const maxJours = Math.max(...bilan.colsParPage);
  console.log(`[FEUILLE] max jours sur une page = ${maxJours} (doit être <= 5)`);

  expect(res?.status()).toBe(200);
  expect(bilan.nbPages).toBeGreaterThan(1); // 21 j → plusieurs semaines
  expect(maxJours).toBeLessThanOrEqual(5);
});
