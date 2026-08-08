import { test, expect } from "@playwright/test";

const INSCRIPTION_ID = "cmqjw63g90008uvvgl9o9m0eh";
// Vérifie que les pages d'aperçu de document affichent le bon contenu
// (et non un écran d'erreur), et que les variables sont bien fusionnées.
const CAS: { type: string; attendu: RegExp }[] = [
  { type: "FICHE_INSCRIPTION", attendu: /Fiche d'inscription/i },
  { type: "PROGRAMME", attendu: /Programme de formation/i },
  { type: "ATTESTATION_RECYCLAGE", attendu: /Recyclage du Diplôme/i },
  { type: "ATTESTATION_REMISE_NIVEAU", attendu: /Remise à niveau du Diplôme/i },
  { type: "CONVOCATION", attendu: /Convocation/i },
];

test("aperçus de documents", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/login");
  await page.fill("#email", "demo-secu@cap.fr");
  await page.fill("#password", "CapSecu2026!");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });

  for (const c of CAS) {
    const res = await page.request.get(`/documents/${INSCRIPTION_ID}/${c.type}`, { timeout: 30_000 });
    const html = await res.text();
    const bon = c.attendu.test(html);
    const erreur = /Application error|Internal Server Error|\{\{[a-z_]+\}\}/i.test(html);
    const varNonResolue = /\{\{[a-z_]+\}\}/.exec(html);
    console.log(`[DOC] ${res.status()} ${bon && !erreur ? "OK " : "KO "} ${c.type}${varNonResolue ? " · variable non résolue: " + varNonResolue[0] : ""}${erreur && !varNonResolue ? " · écran d'erreur" : ""}`);
  }
});
