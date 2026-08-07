import { test, expect } from "@playwright/test";

// Campagne d'actions — version robuste : appels directs (GET) avec un id
// d'inscription connu du tenant démo, délais courts. E-mails neutralisés.
const EMAIL = "demo-secu@cap.fr";
const PASSWORD = "CapSecu2026!";
const INSCRIPTION_ID = "cmqjw63g90008uvvgl9o9m0eh"; // Khaled LACEUK — SSIAP 1 Initial

const DOC_TYPES = [
  "FICHE_INSCRIPTION", "PROGRAMME", "CONVOCATION", "CONVENTION_FORMATION",
  "CONTRAT_FORMATION", "REGLEMENT_INTERIEUR", "CONDITIONS_GENERALES",
  "ATTESTATION_ENTREE", "ATTESTATION_FIN", "ATTESTATION_REUSSITE",
  "ATTESTATION_RECYCLAGE", "ATTESTATION_REMISE_NIVEAU", "CERTIFICAT_REALISATION",
  "TEST_POSITIONNEMENT", "EVALUATION_ACQUIS", "FICHE_BESOIN",
  "SATISFACTION_STAGIAIRE", "REMISE_SUPPORTS",
];

type Res = { action: string; ok: boolean; detail: string };
const results: Res[] = [];
function note(a: string, ok: boolean, d = "") { results.push({ action: a, ok, detail: d }); console.log(`[ACT] ${ok ? "OK " : "KO "} ${a}${d ? " — " + d : ""}`); }

test("campagne actions robuste", async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto("/login");
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
  note("connexion", true);

  // ── Génération de documents (buildSingleDocPdf, par type) ──
  for (const type of DOC_TYPES) {
    try {
      const res = await page.request.get(`/documents/${INSCRIPTION_ID}/${type}`, { timeout: 90_000 });
      const buf = await res.body();
      const pdf = buf.length > 800 && buf.slice(0, 5).toString("latin1").startsWith("%PDF");
      note(`doc ${type}`, res.ok() && pdf, `${res.status()} · ${Math.round(buf.length / 1024)} Ko${pdf ? "" : " · NON-PDF"}`);
    } catch (e) { note(`doc ${type}`, false, String(e).slice(0, 70)); }
  }
  // Dossier complet + ZIP
  for (const s of ["pdf", "zip"]) {
    try {
      const res = await page.request.get(`/documents/${INSCRIPTION_ID}/${s}`, { timeout: 120_000 });
      const buf = await res.body();
      note(`dossier ${s}`, res.ok() && buf.length > 800, `${res.status()} · ${Math.round(buf.length / 1024)} Ko`);
    } catch (e) { note(`dossier ${s}`, false, String(e).slice(0, 70)); }
  }

  // ── Exports (Excel / PDF / CSV) ──
  for (const kind of ["candidats", "sessions", "comptabilite"]) {
    for (const fmt of ["csv", "xlsx", "pdf"]) {
      try {
        const res = await page.request.get(`/${kind}/export?format=${fmt}`, { timeout: 60_000 });
        const buf = await res.body();
        note(`export ${kind} ${fmt}`, res.ok() && buf.length > 40, `${res.status()} · ${Math.round(buf.length / 1024)} Ko`);
      } catch (e) { note(`export ${kind} ${fmt}`, false, String(e).slice(0, 70)); }
    }
  }

  const ko = results.filter((r) => !r.ok);
  console.log(`\n[CAMPAGNE] ${results.length - ko.length}/${results.length} OK — ${ko.length} KO`);
  for (const r of ko) console.log(`  ✗ ${r.action} — ${r.detail}`);
});
